"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { procesarAltaInscripcion } from "@/lib/actions/alta-inscripcion";
import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk, requireRole } from "@/lib/auth/helpers";
import { anularInscripcion } from "@/lib/db/queries/anular-inscripcion";
import { prepararEnvioAcceso } from "@/lib/db/queries/familias";
import {
  anonimizarInscripcion,
  getInscripcionByNumero,
  type InscripcionDetalle,
} from "@/lib/db/queries/inscripciones";
import { registrarResolucionAlta } from "@/lib/db/queries/resolucion-inscripcion";
import { describirAlumnosVinculados } from "@/lib/domain/familias";
import {
  estaResuelta,
  permiteAccion,
  type AccionInscripcion,
} from "@/lib/domain/inscripciones/acciones";
import {
  parsearCodigoInscripcion,
  type InscripcionEstado,
} from "@/lib/domain/inscripciones/schema";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

/**
 * La bandeja de inscripciones: lo que el equipo hace con una ficha que el alta
 * automática NO cerró sola.
 *
 * Por qué existen estas acciones (el porqué largo está en
 * `@/lib/actions/alta-inscripcion`): el formulario es público y el alta solo
 * corre sola con un token de invitación válido, que es la capacidad que entregó
 * el equipo. Todo lo demás —la carga anónima, y sobre todo la que tocaría una
 * cuenta de familia que ya existe— queda esperando a una persona. Estas actions
 * son esa persona, y por eso la capacidad que las habilita es la sesión de
 * admin: `via: "equipo"`. La excepción es el borrado a pedido, que pide
 * super_admin y está explicado en `borrarDatosInscripcionAction`.
 *
 * Tres reglas que se repiten en todas:
 *
 *  1. **Nada viene del cliente salvo el código público** (`INS-000123`, lo que
 *     está en la URL). El id, el estado, el DNI, el alumno y el email del tutor
 *     se releen de la base en cada llamada: un panel viejo en una pestaña
 *     abierta no puede procesar una ficha que mientras tanto alguien anuló.
 *  2. **La regla de qué se puede hacer es una sola** (`permiteAccion`, dominio),
 *     compartida con el panel. El botón no autoriza nada.
 *  3. **Lo ya resuelto es no-op, no error**: un segundo clic o un reintento
 *     tardío contestan `ok` sin tocar la base.
 */

/** El estado en el que quedó la ficha después de la acción. */
export type ResultadoBandeja = {
  estado: InscripcionEstado;
  motivo: string | null;
  alumnoId: string | null;
  /** false cuando la ficha ya estaba así y no se tocó nada. */
  ejecutada: boolean;
};

type FalloAction = Extract<ActionResult<never>, { ok: false }>;

const fichaSchema = z.object({
  codigo: z.string({ required_error: "Falta el código de la ficha." }).trim().min(1),
});

const motivoSchema = z.object({
  motivo: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(500, "El motivo no puede pasar de 500 caracteres.").optional()
  ),
});

const MOTIVO_BORRADO_REQUERIDO =
  "Contá quién pidió el borrado: es el único registro que queda de por qué se hizo.";

/**
 * A diferencia del de anular, este motivo es OBLIGATORIO: después del borrado no
 * queda un nombre al que preguntarle, y lo que sostiene la decisión es esta
 * línea.
 */
const motivoBorradoSchema = z.object({
  motivo: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ required_error: MOTIVO_BORRADO_REQUERIDO })
      .min(1, MOTIVO_BORRADO_REQUERIDO)
      .max(500, "El motivo no puede pasar de 500 caracteres.")
  ),
});

const CODIGO_INVALIDO = "Ese no es un código de inscripción válido.";

/**
 * Del código público a la ficha de la base. Es el único dato que llega del
 * cliente y ni siquiera se usa como id: se convierte en el correlativo y la fila
 * se relee entera (ver la regla 1 del encabezado).
 */
async function fichaDelCodigo(
  input: unknown
): Promise<{ ficha: InscripcionDetalle } | { fallo: FalloAction }> {
  const parsed = fichaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      fallo: {
        ok: false,
        error: "Revisá el código de la ficha.",
        fieldErrors: fieldErrorsFromZod(parsed.error),
      },
    };
  }

  const numero = parsearCodigoInscripcion(parsed.data.codigo);
  if (numero === null) {
    return {
      fallo: { ok: false, error: CODIGO_INVALIDO, fieldErrors: { codigo: [CODIGO_INVALIDO] } },
    };
  }

  const ficha = await getInscripcionByNumero(numero);
  if (!ficha) return { fallo: { ok: false, error: "No encontramos esa ficha." } };

  return { ficha };
}

/** El motivo en español de por qué esa acción no aplica sobre esta ficha. */
function porQueNoAplica(ficha: InscripcionDetalle, accion: AccionInscripcion): string {
  if (ficha.estado === "anulada") {
    return "La ficha está anulada: el equipo ya la descartó y su invitación quedó libre.";
  }
  if (ficha.estado === "procesada") {
    return "La ficha ya está cerrada: el alumno se creó y no queda nada por hacer acá.";
  }
  if (accion === "procesar" && ficha.alumnoId !== null) {
    return "Esta ficha ya creó al alumno: lo que queda es confirmar la cuenta de familia, no volver a darla de alta.";
  }
  if (accion === "reintentar") {
    return "Reintentar es para las fichas que fallaron. Esta no falló: dale de alta con Procesar.";
  }
  if (accion === "confirmar_vinculo") {
    return "Esta ficha no tiene una cuenta de familia pendiente de confirmar.";
  }
  return "La ficha no está en un estado que permita esa acción.";
}

function instantanea(ficha: InscripcionDetalle): ResultadoBandeja {
  return {
    estado: ficha.estado,
    motivo: ficha.motivo,
    alumnoId: ficha.alumnoId,
    ejecutada: false,
  };
}

function revalidar(conAlumno: boolean): void {
  revalidatePath("/inscripciones");
  revalidatePath("/inscripciones/[id]", "page");
  if (conAlumno) revalidatePath("/alumnos/[id]", "page");
}

/**
 * Deja rastro de la decisión HUMANA sobre la ficha. Lo que el alta hizo con el
 * alumno (crearlo, colgarlo de una cuenta, asignarlo a un viaje) ya lo audita
 * `procesarAltaInscripcion` con `via: "equipo"`; esta entrada es la otra mitad:
 * quién apretó el botón y qué salió.
 */
async function auditarDecision(
  ficha: InscripcionDetalle,
  usuarioId: string,
  accion: AccionInscripcion,
  metadata: Record<string, unknown>
): Promise<void> {
  await safeAudit({
    accion: accion === "anular" ? "soft_delete" : "update",
    entidadTipo: "inscripcion",
    entidadId: ficha.id,
    usuarioId,
    metadata: { origen: "bandeja_inscripciones", decision: accion, ...metadata },
  });
}

/**
 * El alta disparada a mano. `procesar` y `reintentar` son la misma operación
 * sobre estados distintos, y esa diferencia es la que hace que reintentar sobre
 * una ficha ya procesada no vuelva a correr nada.
 */
async function correrAlta(
  input: unknown,
  accion: Extract<AccionInscripcion, "procesar" | "reintentar">
): Promise<ActionResult<ResultadoBandeja>> {
  const session = await requireAdminJuk();

  const resuelto = await fichaDelCodigo(input);
  if ("fallo" in resuelto) return resuelto.fallo;
  const { ficha } = resuelto;

  if (!permiteAccion(ficha, accion)) {
    if (estaResuelta(ficha)) return { ok: true, data: instantanea(ficha) };
    return { ok: false, error: porQueNoAplica(ficha, accion) };
  }

  let resolucion;
  try {
    // La compuerta de `@/lib/actions/alta-inscripcion` con la capacidad del
    // equipo: es la sesión de admin la que habilita el alta, igual que el token
    // de invitación habilita la del formulario público.
    resolucion = await procesarAltaInscripcion(ficha, {
      via: "equipo",
      usuarioId: session.user.id,
    });
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos dar de alta la ficha. Probá de nuevo." };
  }

  await auditarDecision(ficha, session.user.id, accion, {
    estado: resolucion.estado,
    ...(resolucion.alumnoId ? { alumnoId: resolucion.alumnoId } : {}),
  });

  revalidar(resolucion.alumnoId !== null);

  return {
    ok: true,
    data: {
      estado: resolucion.estado,
      motivo: resolucion.motivo,
      alumnoId: resolucion.alumnoId,
      ejecutada: resolucion.altaEjecutada,
    },
  };
}

/** Da de alta una ficha que quedó pendiente (llegó sin invitación, o se cargó a mano). */
export async function procesarInscripcionAction(
  input: unknown
): Promise<ActionResult<ResultadoBandeja>> {
  return correrAlta(input, "procesar");
}

/** Vuelve a intentar el alta de una ficha que quedó en `error`. */
export async function reintentarAltaAction(
  input: unknown
): Promise<ActionResult<ResultadoBandeja>> {
  return correrAlta(input, "reintentar");
}

/**
 * El caso sensible: el alumno de la ficha se creó, pero el Portal de Familias
 * quedó pendiente porque el email del tutor ya tenía una cuenta con alumnos de
 * otro apellido (o es de alguien del equipo). Colgar un alumno de una cuenta
 * ajena es exactamente lo que una carga anónima no puede conseguir sola, así que
 * la primera llamada NO ejecuta: devuelve `requiereConfirmacion` con los alumnos
 * que hoy tiene esa cuenta, y recién con la confirmación explícita se vincula.
 *
 * Si el alumno ya colgaba de su cuenta (la rama `vincular`, que el alta hizo
 * pero dejó marcada para que un humano la viera), no hay nada que cambiar: la
 * acción sirve igual para cerrar la revisión.
 */
export async function resolverVinculoAction(
  input: unknown,
  opts?: { confirmar?: boolean }
): Promise<ActionResult<ResultadoBandeja & { familiaUserId: string }>> {
  const session = await requireAdminJuk();

  const resuelto = await fichaDelCodigo(input);
  if ("fallo" in resuelto) return resuelto.fallo;
  const { ficha } = resuelto;

  if (!permiteAccion(ficha, "confirmar_vinculo")) {
    return { ok: false, error: porQueNoAplica(ficha, "confirmar_vinculo") };
  }

  // Ownership: el alumno sale de la ficha en la base, nunca del cliente.
  const alumnoId = ficha.alumnoId;
  if (alumnoId === null) {
    return { ok: false, error: "Esta ficha todavía no creó al alumno: procesala primero." };
  }

  let cuenta;
  try {
    // Los datos del tutor los toma del ALUMNO, no de la ficha: si el equipo le
    // corrigió el email después de la carga, vale el corregido.
    cuenta = await prepararEnvioAcceso(
      alumnoId,
      opts?.confirmar ? { confirmarVinculo: true } : {}
    );
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos resolver la cuenta de familia." };
  }

  if (cuenta.estado === "requiere_confirmacion") {
    return {
      ok: false,
      requiereConfirmacion: true,
      error: `Esa cuenta de familia ya existe y hoy tiene a ${describirAlumnosVinculados(cuenta.alumnos)}. Si confirmás, ${ficha.nombre} ${ficha.apellido} va a quedar colgado de ella y esa familia lo va a ver en su portal. Confirmá solo si es la misma familia.`,
    };
  }

  if (cuenta.estado === "sin_cuenta") {
    return {
      ok: false,
      error:
        cuenta.motivo === "email_del_equipo"
          ? "El email del tutor es de un usuario del equipo: con ese email no se puede crear una cuenta de familia. Corregilo en la ficha del alumno y volvé a intentar."
          : "No encontramos al alumno de esta ficha.",
    };
  }

  const motivo = opts?.confirmar
    ? "Un admin confirmó colgar al alumno de una cuenta de familia que ya existía."
    : "Un admin revisó la ficha y confirmó la cuenta de familia del alumno.";

  // La ficha se cierra acá. Lo que le falte al alumno (un viaje sin cupo, por
  // ejemplo) se sigue desde su ficha, que es donde se resuelve: la bandeja deja
  // de tener trabajo con esta carga.
  try {
    await registrarResolucionAlta(ficha.id, { estado: "procesada", motivo, alumnoId });
  } catch (err) {
    Sentry.captureException(err);
    return {
      ok: false,
      error: "Resolvimos la cuenta de familia, pero no pudimos cerrar la ficha. Reintentá.",
    };
  }

  // Dos entradas: la del alumno es la que importa buscar sola —colgar un alumno
  // de una cuenta que ya existía es LA operación sensible del flujo—, la de la
  // ficha cuenta quién lo decidió.
  await safeAudit({
    accion: "update",
    entidadTipo: "alumno",
    entidadId: alumnoId,
    usuarioId: session.user.id,
    metadata: {
      origen: "bandeja_inscripciones",
      inscripcionId: ficha.id,
      vinculo: "cuenta_existente",
      familiaUserId: cuenta.userId,
      confirmado: opts?.confirmar === true,
    },
  });

  await auditarDecision(ficha, session.user.id, "confirmar_vinculo", {
    estado: "procesada",
    alumnoId,
    familiaUserId: cuenta.userId,
    confirmado: opts?.confirmar === true,
  });

  revalidar(true);

  return {
    ok: true,
    data: {
      estado: "procesada",
      motivo,
      alumnoId,
      ejecutada: true,
      familiaUserId: cuenta.userId,
    },
  };
}

/**
 * Descartar una ficha. Es la única decisión que libera la invitación: el unique
 * parcial `uniq_inscripcion_comunicacion` solo mira las fichas no anuladas, así
 * que después de esto la familia puede volver a cargar con el mismo link.
 *
 * No borra nada (eso es el borrado por privacidad, con su propio circuito) y no
 * se puede anular una ficha ya procesada: no desharía al alumno, solo escondería
 * de dónde salió.
 */
export async function anularInscripcionAction(
  input: unknown
): Promise<ActionResult<ResultadoBandeja>> {
  const session = await requireAdminJuk();

  const resuelto = await fichaDelCodigo(input);
  if ("fallo" in resuelto) return resuelto.fallo;
  const { ficha } = resuelto;

  const parsedMotivo = motivoSchema.safeParse(input);
  if (!parsedMotivo.success) {
    return {
      ok: false,
      error: "Revisá el motivo.",
      fieldErrors: fieldErrorsFromZod(parsedMotivo.error),
    };
  }
  const nota = parsedMotivo.data.motivo;

  if (!permiteAccion(ficha, "anular")) {
    // Anular dos veces no es un error: la segunda no tiene nada que hacer.
    if (ficha.estado === "anulada") return { ok: true, data: instantanea(ficha) };
    return { ok: false, error: porQueNoAplica(ficha, "anular") };
  }

  const motivo = nota ? `Anulada por el equipo: ${nota}` : "Anulada por el equipo.";

  let anulada: boolean;
  try {
    anulada = await anularInscripcion(ficha.id, motivo);
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos anular la ficha. Probá de nuevo." };
  }

  if (!anulada) {
    return {
      ok: false,
      error: "La ficha cambió mientras la mirabas: recargá la pantalla y fijate cómo quedó.",
    };
  }

  await auditarDecision(ficha, session.user.id, "anular", {
    estadoAnterior: ficha.estado,
    estado: "anulada",
    ...(nota ? { motivo: nota } : {}),
  });

  revalidar(ficha.alumnoId !== null);

  return { ok: true, data: { estado: "anulada", motivo, alumnoId: ficha.alumnoId, ejecutada: true } };
}

/** `false` cuando la ficha ya estaba borrada y no había nada que vaciar. */
export type ResultadoBorrado = { ejecutada: boolean };

/**
 * El borrado que pide una familia, el que la Política de Privacidad promete.
 *
 * Tres cosas lo separan del resto de la bandeja:
 *
 *  1. **Lo firma un super_admin**, no cualquiera del equipo. No es una acción de
 *     rutina: lo que se va no vuelve, y las de rutina (procesar, anular) ya
 *     cubren todo lo reversible.
 *  2. **El motivo es obligatorio.** Después del borrado no queda un nombre al
 *     que preguntarle qué pasó; queda esta línea y la entrada de auditoría.
 *  3. **No borra la fila**: `anonimizarInscripcion` vacía los datos personales y
 *     deja el talón (número, estado, variante, viaje, lote y fechas), así los
 *     conteos de la campaña no cambian hacia atrás. La ficha sí desaparece de la
 *     bandeja, y su detalle pasa a responder 404.
 *
 * Volver a pedirlo no es un error: `getInscripcionByNumero` ya no encuentra una
 * ficha borrada, y si dos pestañas lo piden a la vez la segunda contesta ok sin
 * ejecutar (el UPDATE es condicional).
 */
export async function borrarDatosInscripcionAction(
  input: unknown
): Promise<ActionResult<ResultadoBorrado>> {
  const session = await requireRole("super_admin");

  const parsedMotivo = motivoBorradoSchema.safeParse(input);
  if (!parsedMotivo.success) {
    return {
      ok: false,
      error: "Falta el motivo del borrado.",
      fieldErrors: fieldErrorsFromZod(parsedMotivo.error),
    };
  }
  const motivo = parsedMotivo.data.motivo;

  const resuelto = await fichaDelCodigo(input);
  if ("fallo" in resuelto) return resuelto.fallo;
  const { ficha } = resuelto;

  let borrada: boolean;
  try {
    borrada = await anonimizarInscripcion(ficha.id, { usuarioId: session.user.id, motivo });
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos borrar los datos de la ficha. Probá de nuevo." };
  }

  if (!borrada) return { ok: true, data: { ejecutada: false } };

  // La entrada de auditoría NO lleva el nombre, el DNI ni el mail de la ficha:
  // sería exactamente el dato que se acaba de borrar, guardado en otra tabla.
  // Con el id, el estado y el motivo alcanza para reconstruir qué se decidió.
  await safeAudit({
    accion: "delete",
    entidadTipo: "inscripcion",
    entidadId: ficha.id,
    usuarioId: session.user.id,
    metadata: {
      origen: "bandeja_inscripciones",
      decision: "borrar_datos",
      estado: ficha.estado,
      motivo,
    },
  });

  revalidar(ficha.alumnoId !== null);

  return { ok: true, data: { ejecutada: true } };
}
