import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { inscripciones, type Inscripcion } from "@/lib/db/schema/inscripciones";
import { prospectoComunicaciones, prospectos } from "@/lib/db/schema/prospectos";
import { viajes } from "@/lib/db/schema/viajes";
import type { MarcasInvitacion } from "@/lib/domain/inscripciones/invitacion";
import type {
  InscripcionData,
  InscripcionEstado,
  Variante,
} from "@/lib/domain/inscripciones/schema";

import { esViolacionUnique } from "./errors";

/**
 * Lo que toca el Application Form PÚBLICO: leer la invitación de un link
 * tokenizado, persistir la ficha y dejar sellada la respuesta.
 *
 * Separado de `inscripciones.ts` (la bandeja del back-office) a propósito: acá
 * entra gente sin sesión, y tener las dos superficies en archivos distintos hace
 * evidente qué queries corren sin autenticar. Nada de este archivo crea ni toca
 * un alumno: la ficha aterriza en `inscripciones` y el alta la resuelve el
 * equipo (o, más adelante, el job de la etapa 4).
 */

/**
 * La invitación tal como la necesita el formulario. El shape incluye
 * `MarcasInvitacion`, así que el resultado entra derecho en `estadoInvitacion`
 * del dominio: la decisión de si el link abre NO se toma acá.
 */
export type InvitacionPublica = MarcasInvitacion & {
  comunicacionId: string;
  /** Variante forzada por la campaña; puede ser null y la resuelve `resolverVariante`. */
  variante: Variante | null;
  reservadoEl: Date | null;
  viajeId: string | null;
  viajeCodigo: string | null;
  viajeNombre: string | null;
  prospectoId: string;
  prospectoNombre: string;
  /** El mail al que se envió la invitación (Nivel 1). */
  destinatario: string | null;
};

/**
 * Clave donde `marcarInvitacionRespondida` sella la respuesta dentro de `meta`.
 * La bitácora de comunicaciones no tiene columna propia para esto y no hace
 * falta: el candado real contra el doble envío es el índice único parcial
 * `uniq_inscripcion_comunicacion`.
 */
const META_RESPONDIDA = "invitacionRespondidaEl";

/**
 * SELECT PURO: resuelve un link tokenizado a su campaña y NO escribe una sola
 * columna. Que sea puro es la regla, no una casualidad — la página del
 * formulario se abre con un GET y un prefetch del cliente de correo la dispara
 * sola (el precedente es `src/app/baja/page.tsx`, que hace un UPDATE en el
 * render). Reservar o marcar la invitación es trabajo de una server action.
 *
 * `respondidaEl` sale de dos lados y gana el primero que exista:
 *  1. el sello que dejó `marcarInvitacionRespondida` en `meta`;
 *  2. la ficha VIVA que ya cuelga de esta invitación.
 * El segundo es el que manda de verdad: aunque el sello no se haya llegado a
 * escribir, la fila de `inscripciones` ya existe y el link no tiene que volver
 * a abrirse. Anular la ficha borra esa marca y libera el link, que es
 * exactamente lo que promete el índice parcial.
 */
export async function getInvitacionByTokenHash(
  tokenHash: string
): Promise<InvitacionPublica | null> {
  const filas = await db
    .select({
      comunicacionId: prospectoComunicaciones.id,
      variante: prospectoComunicaciones.invitacionVariante,
      expiraEl: prospectoComunicaciones.invitacionExpiraEl,
      revocadaEl: prospectoComunicaciones.invitacionRevocadaEl,
      reservadoEl: prospectoComunicaciones.invitacionReservadoEl,
      // El `::text` no es decorativo: `json ->> ?` es ambiguo en Postgres
      // (existe la versión por clave y la versión por índice) y sin el cast el
      // parámetro suelto falla con "operator is not unique".
      selloRespondida: sql<
        string | null
      >`${prospectoComunicaciones.meta} ->> ${META_RESPONDIDA}::text`,
      fichaVivaEl: inscripciones.createdAt,
      viajeId: viajes.id,
      viajeCodigo: viajes.codigo,
      viajeNombre: viajes.nombre,
      prospectoId: prospectos.id,
      prospectoNombre: prospectos.nombre,
      destinatario: prospectoComunicaciones.destinatario,
    })
    .from(prospectoComunicaciones)
    .innerJoin(prospectos, eq(prospectoComunicaciones.prospectoId, prospectos.id))
    .leftJoin(viajes, eq(prospectoComunicaciones.invitacionViajeId, viajes.id))
    // Como máximo una ficha viva por invitación: lo garantiza el mismo índice
    // parcial que frena el doble envío, así que el join no multiplica filas.
    .leftJoin(
      inscripciones,
      and(
        eq(inscripciones.comunicacionId, prospectoComunicaciones.id),
        ne(inscripciones.estado, "anulada")
      )
    )
    .where(eq(prospectoComunicaciones.invitacionTokenHash, tokenHash))
    .limit(1);

  const fila = filas[0];
  if (!fila) return null;
  // Una comunicación con token pero sin vencimiento no es una invitación
  // utilizable: sin `expiraEl` no hay vigencia que evaluar.
  if (fila.expiraEl === null) return null;

  const { selloRespondida, fichaVivaEl, ...resto } = fila;

  return {
    ...resto,
    expiraEl: fila.expiraEl,
    respondidaEl: selloRespondida ? new Date(selloRespondida) : fichaVivaEl,
  };
}

export type NuevaInscripcion = {
  /** La ficha ya validada con `inscripcionSchema`. */
  ficha: InscripcionData;
  /**
   * `recibida` si el link traía un token válido; `requiere_revision` si la
   * carga llegó sin token. Los demás estados nacen de la etapa 4, no de acá.
   */
  estado: Extract<InscripcionEstado, "recibida" | "requiere_revision">;
  /**
   * Por qué quedó así, en palabras y en español: es lo que lee el equipo en la
   * bandeja. Una ficha que espera a una persona sin decir por qué obliga a
   * adivinar, que es exactamente lo que la bandeja viene a evitar.
   */
  motivo?: string | null;
  /** La que se le mostró a la familia, ya resuelta con `resolverVariante`. */
  variante: Variante;
  /**
   * Contexto DERIVADO del token server-side. `null` = carga sin token. Nunca
   * sale del body: si viajara desde el cliente, quien tenga el link podría
   * inscribir a cualquiera en cualquier viaje.
   */
  origen: {
    comunicacionId: string;
    tokenHash: string;
    viajeId: string | null;
  } | null;
  consentimiento: {
    version: string;
    textoHash: string;
    el: Date;
  };
};

/**
 * Por qué no entró la ficha. Las tres se le contestan a la familia con el mismo
 * "ya recibimos tu ficha": el detalle es para el log y la bandeja, no para la
 * pantalla pública.
 */
export type MotivoRechazoInscripcion =
  | "invitacion_ya_respondida"
  | "dni_ya_cargado"
  | "ya_registrada";

export type ResultadoCrearInscripcion =
  | { ok: true; inscripcion: Inscripcion }
  | { ok: false; motivo: MotivoRechazoInscripcion };

const MOTIVO_POR_INDICE: Record<string, MotivoRechazoInscripcion> = {
  uniq_inscripcion_comunicacion: "invitacion_ya_respondida",
  uniq_inscripcion_dni_viva: "dni_ya_cargado",
};

const MAX_SALTOS_CAUSA = 5;

/**
 * Nombre del índice que reventó. Recorre la cadena de `cause` por lo mismo que
 * `esViolacionUnique`: drizzle envuelve el error del driver, y el `constraint`
 * del `NeonDbError` queda un nivel más abajo. Si el driver no lo informa se
 * devuelve null y el motivo cae en el genérico — nunca una excepción cruda.
 */
function indiceUniqueViolado(err: unknown): string | null {
  for (let actual = err, saltos = 0; actual != null && saltos < MAX_SALTOS_CAUSA; saltos++) {
    if (typeof actual !== "object") return null;
    const constraint = (actual as { constraint?: unknown }).constraint;
    if (typeof constraint === "string") return constraint;
    actual = (actual as { cause?: unknown }).cause;
  }
  return null;
}

/**
 * Persiste la ficha. Es lo PRIMERO que pasa cuando una familia envía el
 * formulario: los mails vienen después y son best-effort, porque una falla de
 * Resend no puede perder datos que la familia ya cargó.
 *
 * Los dos índices únicos parciales de la tabla son el candado contra el doble
 * envío. Chocar con uno es un desenlace ESPERADO (doble clic, dos pestañas, los
 * dos tutores a la vez), así que se traduce a un resultado nombrado y no a una
 * excepción que terminaría en un 500.
 *
 * Los campos se copian uno por uno y no con un spread: `website` (el honeypot) y
 * `acepta` son parte de `InscripcionData` y no se guardan, y un campo nuevo del
 * formulario tiene que decidirse acá antes de persistirse.
 */
export async function crearInscripcion(
  datos: NuevaInscripcion
): Promise<ResultadoCrearInscripcion> {
  const { ficha, origen, consentimiento } = datos;

  try {
    const filas = await db
      .insert(inscripciones)
      .values({
        comunicacionId: origen?.comunicacionId ?? null,
        tokenHash: origen?.tokenHash ?? null,
        viajeId: origen?.viajeId ?? null,
        variante: datos.variante,
        estado: datos.estado,
        motivo: datos.motivo ?? null,

        nombre: ficha.nombre,
        apellido: ficha.apellido,
        fechaNacimiento: ficha.fechaNacimiento,
        dni: ficha.dni,
        numeroPasaporte: ficha.numeroPasaporte,
        fechaVencimientoPasaporte: ficha.fechaVencimientoPasaporte,

        telefonoAlumno: ficha.telefonoAlumno ?? null,
        emailAlumno: ficha.emailAlumno ?? null,
        alergiasSalud: ficha.alergiasSalud ?? null,

        tutor1Nombre: ficha.tutor1Nombre,
        tutor1Celular: ficha.tutor1Celular,
        tutor1Email: ficha.tutor1Email,

        preferenciasAlojamiento: ficha.preferenciasAlojamiento ?? null,
        nivelInglesAutoevaluacion: ficha.nivelInglesAutoevaluacion ?? null,

        consentimientoVersion: consentimiento.version,
        consentimientoTextoHash: consentimiento.textoHash,
        consentimientoEl: consentimiento.el,
      })
      .returning();

    const inscripcion = filas[0];
    if (!inscripcion) return { ok: false, motivo: "ya_registrada" };
    return { ok: true, inscripcion };
  } catch (err) {
    if (!esViolacionUnique(err)) throw err;
    const indice = indiceUniqueViolado(err);
    const motivo = indice === null ? undefined : MOTIVO_POR_INDICE[indice];
    return { ok: false, motivo: motivo ?? "ya_registrada" };
  }
}

/**
 * Sella en la bitácora que esta invitación ya fue respondida, para que el
 * detalle del prospecto pueda contarlo sin mirar `inscripciones` (que guarda
 * datos de Nivel 2 y no se lee para dibujar una bitácora).
 *
 * El sello se fusiona dentro de `meta` en un solo statement: leer, mezclar y
 * escribir desde la app perdería las claves que otra escritura dejó en el
 * medio. El objeto nuevo va a la IZQUIERDA del `||` justo para eso — en una
 * fusión de jsonb gana la derecha, así que las claves que ya estaban (incluido
 * un sello anterior) se conservan y la función es idempotente: vale el instante
 * de la PRIMERA respuesta.
 *
 * Devuelve si encontró la comunicación. Es best-effort desde la action: la
 * ficha ya está persistida y no se pierde nada si esto falla.
 */
export async function marcarInvitacionRespondida(
  comunicacionId: string,
  el: Date = new Date()
): Promise<boolean> {
  const sello = sql`jsonb_build_object(${META_RESPONDIDA}::text, ${el.toISOString()}::text)`;

  const filas = await db
    .update(prospectoComunicaciones)
    .set({
      meta: sql`(${sello} || coalesce(${prospectoComunicaciones.meta}::jsonb, '{}'::jsonb))::json`,
    })
    .where(eq(prospectoComunicaciones.id, comunicacionId))
    .returning({ id: prospectoComunicaciones.id });

  return filas.length > 0;
}
