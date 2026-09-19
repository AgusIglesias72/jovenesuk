"use server";

/*
 * Envío del Application Form propio, y la marca de que el formulario se abrió.
 *
 * Las DOS son actions y no pasan nunca por el render: la página que se abre con
 * el link tokenizado solo lee (el precedente malo es `src/app/baja/page.tsx`,
 * que hace un UPDATE en el render y un prefetch del cliente de correo lo
 * dispara solo). Escribir la apertura en el GET contaría como visita cada
 * prefetch de Outlook y el embudo mediría al cliente de correo, no a la familia.
 *
 * La ficha se PERSISTE siempre primero. Una carga entra como `recibida` si
 * llegó por una invitación que todavía abre, o como `requiere_revision` si
 * llegó sin token válido — la compuerta para que una carga anónima no se
 * cuelgue de la campaña de otro.
 *
 * El alta del alumno corre DESPUÉS y solo con invitación válida, con la política
 * compartida de `@/lib/actions/alta-inscripcion` (ahí está el porqué: sin token
 * no hay capacidad, y una carga anónima no puede colgarse de la cuenta de otra
 * familia). Como todo lo que pasa después de guardar, no puede cambiar el
 * `ActionResult` que ve la familia: ella mandó sus datos y eso salió bien.
 *
 * El contexto de campaña (viaje, comunicación, variante) se deriva SERVER-SIDE
 * del hash del token. Nunca del body: si viajara desde el cliente, cualquiera
 * con el link podría inscribir a quien quisiera en el viaje que quisiera.
 */

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import {
  MOTIVO_SIN_INVITACION,
  procesarAltaInscripcion,
} from "@/lib/actions/alta-inscripcion";
import { aperturaDentroDelLimite, dentroDelLimite } from "@/lib/actions/anti-abuso-request";
import type { ActionResult } from "@/lib/actions/result";
import {
  crearInscripcion,
  getInvitacionByTokenHash,
  marcarInvitacionRespondida,
  registrarAperturaFormulario,
  type InvitacionPublica,
} from "@/lib/db/queries/inscripciones-publicas";
import type { Inscripcion } from "@/lib/db/schema/inscripciones";
import { estadoInvitacion, puedeCargar } from "@/lib/domain/inscripciones/invitacion";
import {
  aceptaDesdeFormulario,
  codigoInscripcion,
  esHoneypotRelleno,
  inscripcionSchema,
  resolverVariante,
} from "@/lib/domain/inscripciones/schema";
import {
  TEXTO_CONSENTIMIENTO,
  VERSION_CONSENTIMIENTO,
} from "@/lib/domain/privacidad/politica";
import { sendInscripcionNuevaEmail } from "@/lib/email/send-inscripcion-nueva";
import { sendInscripcionRecibidaEmail } from "@/lib/email/send-inscripcion-recibida";
import { hashTexto } from "@/lib/utils/hash-texto";
import { hashToken } from "@/lib/utils/token-opaco";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

/** Lo que ve la familia: un mensaje y, si la ficha entró, su código INS-000123. */
export type InscripcionEnviada = {
  mensaje: string;
  codigo: string | null;
};

const MENSAJE_OK =
  "¡Listo! Recibimos la ficha. Te mandamos un mail con la confirmación y el equipo se va a contactar con vos.";

/**
 * Las tres colisiones de los índices únicos (doble clic, dos pestañas, los dos
 * tutores a la vez) se contestan igual y como un éxito: la ficha que importa ya
 * está guardada, y detallar cuál índice reventó le contaría a cualquiera que
 * ese DNI ya está inscripto.
 */
const MENSAJE_YA_RECIBIDA =
  "Ya recibimos tu ficha, no hace falta enviarla de nuevo. Si necesitás corregir algo, escribinos y la actualizamos.";

const ERROR_GENERICO =
  "No pudimos guardar la ficha, probá de nuevo o escribinos por WhatsApp.";

// Mismo mensaje para el límite alcanzado que para cualquier otro problema
// transitorio: no le confirmamos a un bot que lo estamos frenando.
const ERROR_REINTENTAR =
  "No pudimos guardar la ficha en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.";

/** `FormData.get` devuelve null para lo que no vino; Zod espera `undefined`. */
function texto(formData: FormData, clave: string): string | undefined {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor : undefined;
}

/**
 * Resuelve el link a su campaña. Falla abierto a propósito: si la lectura de la
 * invitación se cae, la ficha igual se guarda (en `requiere_revision`, sin
 * contexto) en vez de perder datos que la familia ya cargó. El equipo la
 * reconcilia desde la bandeja; un dato perdido no se reconcilia.
 */
async function invitacionQueAbre(tokenHash: string): Promise<InvitacionPublica | null> {
  let invitacion: InvitacionPublica | null;
  try {
    invitacion = await getInvitacionByTokenHash(tokenHash);
  } catch (err) {
    Sentry.captureException(err);
    return null;
  }

  if (invitacion === null) return null;
  const estado = estadoInvitacion({ ...invitacion, ahora: new Date() });
  return puedeCargar(estado) ? invitacion : null;
}

/**
 * Todo lo que pasa DESPUÉS de que la ficha ya está persistida: el sello en la
 * bitácora del prospecto, el alta del alumno y los dos mails. Cada paso va en su
 * propio try/catch y ninguno cambia el `ActionResult` que ve la familia — ni una
 * caída de Resend ni un alta que no pudo completarse convierten en error una
 * carga que se guardó bien.
 *
 * El alta va antes de los mails porque es el efecto que importa: si el request
 * se corta en el medio, lo que no puede faltar es el alumno.
 */
async function despuesDeGuardar(
  inscripcion: Inscripcion,
  invitacion: InvitacionPublica | null
): Promise<void> {
  if (invitacion !== null) {
    try {
      await marcarInvitacionRespondida(invitacion.comunicacionId);
    } catch (err) {
      Sentry.captureException(err);
    }

    // Solo con invitación válida: es la capacidad que entregó el equipo, el
    // equivalente del secreto del webhook. Sin ella la ficha ya quedó en
    // `requiere_revision` y no se llama al alta.
    try {
      await procesarAltaInscripcion(inscripcion, {
        via: "invitacion",
        comunicacionId: invitacion.comunicacionId,
      });
    } catch (err) {
      Sentry.captureException(err);
    }
  }

  // El viaje de los mails sale de la invitación, que ya se resolvió por el hash
  // del token: la fila solo guarda el id, y sin invitación la ficha no tiene
  // viaje. Sin esto el acuse no nombraba el viaje y el aviso al equipo decía
  // "sin asignar".
  const viaje = invitacion
    ? { nombre: invitacion.viajeNombre, codigo: invitacion.viajeCodigo }
    : null;

  try {
    await sendInscripcionRecibidaEmail(inscripcion, viaje);
  } catch (err) {
    Sentry.captureException(err);
  }

  try {
    await sendInscripcionNuevaEmail(inscripcion, viaje);
  } catch (err) {
    Sentry.captureException(err);
  }
}

/**
 * El código sale de un identity de la base, así que no puede ser inválido. Se
 * blinda igual porque esto corre con la ficha YA guardada: una excepción acá le
 * mostraría un error a una familia que cargó todo bien, y probablemente cargue
 * de nuevo.
 */
function codigoDe(numero: number): string | null {
  try {
    return codigoInscripcion(numero);
  } catch (err) {
    Sentry.captureException(err);
    return null;
  }
}

export async function enviarInscripcion(
  _prev: ActionResult<InscripcionEnviada> | null,
  formData: FormData
): Promise<ActionResult<InscripcionEnviada>> {
  const parsed = inscripcionSchema.safeParse({
    nombre: texto(formData, "nombre"),
    apellido: texto(formData, "apellido"),
    fechaNacimiento: texto(formData, "fechaNacimiento"),
    dni: texto(formData, "dni"),
    numeroPasaporte: texto(formData, "numeroPasaporte"),
    fechaVencimientoPasaporte: texto(formData, "fechaVencimientoPasaporte"),

    tutor1Nombre: texto(formData, "tutor1Nombre"),
    tutor1Celular: texto(formData, "tutor1Celular"),
    tutor1Email: texto(formData, "tutor1Email"),

    telefonoAlumno: texto(formData, "telefonoAlumno"),
    emailAlumno: texto(formData, "emailAlumno"),
    alergiasSalud: texto(formData, "alergiasSalud"),
    preferenciasAlojamiento: texto(formData, "preferenciasAlojamiento"),
    nivelInglesAutoevaluacion: texto(formData, "nivelInglesAutoevaluacion"),

    website: texto(formData, "website"),
    acepta: aceptaDesdeFormulario(texto(formData, "acepta")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos marcados.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const ficha = parsed.data;

  // Honeypot: si vino relleno es un bot. Se le contesta como si todo hubiera
  // salido bien, sin persistir nada, para no enseñarle qué lo delató.
  if (esHoneypotRelleno(ficha)) {
    return { ok: true, data: { mensaje: MENSAJE_OK, codigo: null } };
  }

  const token = texto(formData, "token")?.trim();
  const tokenHash = token ? hashToken(token) : null;

  if (!(await dentroDelLimite("inscripcion", { email: ficha.tutor1Email, tokenHash }))) {
    return { ok: false, error: ERROR_REINTENTAR };
  }

  const invitacion = tokenHash === null ? null : await invitacionQueAbre(tokenHash);

  // La variante es SOLO estética, así que el param del link (que el formulario
  // reenvía en `v`) puede mandar sin riesgo: es la precedencia documentada en
  // `resolverVariante` y lo que queda registrado es lo que la familia vio.
  const variante = resolverVariante({
    param: texto(formData, "v"),
    campana: invitacion?.variante,
  });

  let resultado;
  try {
    resultado = await crearInscripcion({
      ficha,
      estado: invitacion === null ? "requiere_revision" : "recibida",
      // Si la ficha queda esperando a una persona, la bandeja tiene que decir
      // POR QUÉ: sin esto se lee como un fallo mudo y el equipo adivina.
      motivo: invitacion === null ? MOTIVO_SIN_INVITACION : null,
      variante,
      origen:
        invitacion === null || tokenHash === null
          ? null
          : {
              comunicacionId: invitacion.comunicacionId,
              tokenHash,
              viajeId: invitacion.viajeId,
            },
      consentimiento: {
        version: VERSION_CONSENTIMIENTO,
        textoHash: hashTexto(TEXTO_CONSENTIMIENTO),
        el: new Date(),
      },
    });
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: ERROR_GENERICO };
  }

  if (!resultado.ok) {
    return { ok: true, data: { mensaje: MENSAJE_YA_RECIBIDA, codigo: null } };
  }

  await despuesDeGuardar(resultado.inscripcion, invitacion);

  return {
    ok: true,
    data: { mensaje: MENSAJE_OK, codigo: codigoDe(resultado.inscripcion.numero) },
  };
}

/**
 * El token es un base64url de 32 bytes (43 caracteres). El mínimo es holgado a
 * propósito: no valida la credencial —eso lo hace el hash contra la base— sino
 * que descarta la basura antes de gastar un round-trip.
 */
const tokenAperturaSchema = z.string().trim().min(20).max(200);

/**
 * "Este link se abrió y el formulario se mostró." La llama el formulario ya
 * hidratado, una sola vez por carga.
 *
 * Es el escalón que le falta al embudo de campañas: sin él, una campaña sin
 * respuestas no distingue entre "el mail no lo abrió nadie" y "lo abrieron, vieron
 * el formulario y no lo completaron", que son dos problemas distintos con dos
 * soluciones distintas.
 *
 * Tres cosas que no hace, a propósito:
 *  - no gasta la ventana del envío de la ficha: tiene la suya
 *    (`aperturaDentroDelLimite`), así que abrir el link cinco veces no puede
 *    dejar a una familia sin poder mandar la inscripción;
 *  - no cuenta visitas: el registro es idempotente por invitación;
 *  - no devuelve nada que sirva para probar tokens. El desenlace es el mismo
 *    —`ok`— exista o no la invitación: contestar distinto convertiría esta
 *    action en un oráculo para adivinar links ajenos.
 */
export async function registrarApertura(token: string): Promise<ActionResult<null>> {
  const parsed = tokenAperturaSchema.safeParse(token);
  if (!parsed.success) return { ok: false, error: ERROR_GENERICO };

  const tokenHash = hashToken(parsed.data);

  if (!(await aperturaDentroDelLimite(tokenHash))) return { ok: false, error: ERROR_REINTENTAR };

  try {
    await registrarAperturaFormulario(tokenHash);
  } catch (err) {
    // Una métrica nunca puede romperle la pantalla a la familia que está por
    // completar la ficha: se reporta y se sigue.
    Sentry.captureException(err);
  }

  return { ok: true, data: null };
}
