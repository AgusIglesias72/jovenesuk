import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { Alumno } from "@/lib/db/schema/alumnos";
import type { Inscripcion } from "@/lib/db/schema/inscripciones";
import { users } from "@/lib/db/schema/users";
import { ViajeNoInscribibleError } from "@/lib/domain/asignaciones";
import type { AlumnoVinculado } from "@/lib/domain/familias";

import { createAlumno, getAlumnoByDni } from "./alumnos";
import { countAsignacionesActivas } from "./asignaciones";
import { asignarConTablero } from "./asignar-alumno";
import { esViolacionUnique } from "./errors";
import { asegurarCuentaFamilia } from "./familias";
import { getViajeById } from "./viajes";

/**
 * Alta del alumno a partir de una ficha del Application Form propio (etapa 4).
 *
 * Es el MISMO efecto que dispara el webhook del Google Form
 * (`src/app/api/webhooks/google-form/route.ts`), y desde la etapa 4 es
 * literalmente el mismo código: el webhook delega acá en vez de tener su propia
 * alta, para que las dos entradas no se desincronicen (una arreglaba un caso y
 * la otra no). Lo único que cambia entre las dos es el `canalAlta` de `opts`.
 *
 * Lo que sí es distinto es de dónde viene la AUTORIZACIÓN: el webhook va detrás
 * de un secreto compartido; en el formulario público el único equivalente es el
 * token de invitación, y quién lo valida no es esta capa.
 *
 * Por eso este archivo NO decide nada: ejecuta el alta y DEVUELVE qué rama
 * resolvió el vínculo de familia (`crear` / `vincular` / `requiere_confirmacion`
 * / `email_del_equipo`). La compuerta — correr esto solo con token válido, y
 * mandar a revisión humana lo que se colgó de una cuenta que ya existía — la
 * aplica `src/lib/actions/alta-inscripcion.ts`, que es la que tiene el contexto
 * del token. Acá tampoco se audita ni se toca la fila de `inscripciones`: eso
 * también es de la capa de arriba (`safeAudit` vive en `@/lib/actions`).
 *
 * Las dos garantías que sí son de este archivo:
 *
 *  1. **Idempotencia por DNI antes de tocar nada.** Si ese DNI ya existe se
 *     devuelve `duplicado` sin llamar a `asegurarCuentaFamilia` ni asignar
 *     viaje. Es lo que blinda el ataque de la ficha pública: mandar los datos de
 *     un alumno que YA está cargado no puede cambiarle la cuenta de familia ni
 *     su viaje, aunque el `tutor1Email` de la ficha sea otro.
 *  2. **El vínculo nunca se confirma solo.** `asegurarCuentaFamilia` se llama
 *     siempre SIN `confirmarVinculo`: colgar un alumno de una cuenta que ya
 *     tiene alumnos de otro apellido es exactamente lo que una carga anónima no
 *     puede conseguir. Esa confirmación la da un admin desde la bandeja.
 *
 * Los desenlaces esperados (DNI repetido, viaje sin cupo, viaje cerrado) son
 * resultados nombrados, nunca excepciones. Un error inesperado sí se propaga: la
 * capa de arriba lo reporta y marca la ficha en `error`, y el reintento es
 * seguro porque el unique de `alumnos.dni` lo hace caer en `duplicado`.
 */

/**
 * Lo que el alta necesita de la ficha ya persistida. Un `Inscripcion` entero
 * entra tal cual.
 *
 * `viajeId` es el que la ficha DERIVÓ del token server-side, jamás uno que haya
 * viajado en el body del formulario: si no, quien tenga un link podría inscribir
 * a cualquiera en cualquier viaje.
 */
export type DatosAltaInscripcion = Pick<
  Inscripcion,
  | "nombre"
  | "apellido"
  | "fechaNacimiento"
  | "dni"
  | "numeroPasaporte"
  | "fechaVencimientoPasaporte"
  | "telefonoAlumno"
  | "emailAlumno"
  | "alergiasSalud"
  | "tutor1Nombre"
  | "tutor1Celular"
  | "tutor1Email"
  | "preferenciasAlojamiento"
  | "nivelInglesAutoevaluacion"
  | "viajeId"
>;

/**
 * La rama que resolvió el vínculo con el Portal de Familias, tal como salió de
 * `evaluarVinculoFamilia`. La política de cada una es de la capa de arriba:
 *
 *  - `crear`: no había cuenta con ese email. Es el único caso 100% automático.
 *  - `vincular`: el alumno quedó colgado de una cuenta que YA existía. Se hizo,
 *    pero un humano tiene que verlo.
 *  - `requiere_confirmacion`: la cuenta existe y tiene alumnos de otro apellido.
 *    El alumno quedó SIN cuenta; decide un admin.
 *  - `email_del_equipo`: el email del tutor es de un usuario del equipo. Sin
 *    cuenta, y nunca automático.
 *  - `sin_cuenta`: anomalía (el alumno recién creado no se pudo releer). El
 *    alumno existe y quedó sin cuenta.
 */
export type Vinculo =
  | { rama: "crear"; familiaUserId: string }
  | { rama: "vincular"; familiaUserId: string }
  | { rama: "requiere_confirmacion"; familiaUserId: string; alumnos: AlumnoVinculado[] }
  | { rama: "email_del_equipo" }
  | { rama: "sin_cuenta" };

/** Por qué el alumno quedó pre-inscripto sin viaje. Ninguno es un error. */
export type MotivoSinAsignar =
  | "sin_viaje"
  | "viaje_inexistente"
  | "viaje_no_inscribible"
  | "sin_cupo";

export type ResultadoAsignacion =
  | { estado: "asignado"; viajeId: string; asignacionId: string; autoConfirmado: boolean }
  | { estado: "sin_asignar"; motivo: MotivoSinAsignar };

/**
 * `duplicado` con `alumnoId: null` es el caso raro del DNI tomado que no se
 * puede releer (lectura sobre otra rama de la réplica, igual que en el webhook):
 * se sabe que no hay que crear nada, pero no a quién apuntar la ficha.
 */
export type ResultadoAltaInscripcion =
  | { tipo: "creado"; alumnoId: string; vinculo: Vinculo; asignacion: ResultadoAsignacion }
  | { tipo: "duplicado"; alumnoId: string | null };

/**
 * "AAAA-MM-DD" → medianoche UTC, que es como Drizzle entrega las columnas `date`
 * de `alumnos` (mode "date"). Sin la `Z` el string se interpreta en la zona
 * local y un cumpleaños se corre un día.
 */
function diaCalendario(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * Si ya existe una cuenta con ese email, ANTES de tocar nada.
 *
 * `asegurarCuentaFamilia` devuelve `vinculada` tanto cuando creó la cuenta como
 * cuando colgó el alumno de una que ya estaba, y esas dos ramas se tratan
 * distinto: la segunda va a revisión humana. Esta lectura previa es la que las
 * separa. La ventana entre la lectura y la escritura es de milisegundos y solo
 * la abre otra carga con el MISMO email del tutor (hermanos cargados a la vez):
 * el peor desenlace es reportar `crear` donde hubo `vincular`, dentro del mismo
 * grupo familiar real. Una carga anónima con el email de una familia ajena cae
 * siempre del lado seguro, porque esa cuenta ya existía mucho antes.
 */
async function existeCuentaConEmail(email: string): Promise<boolean> {
  const filas = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return filas.length > 0;
}

async function resolverVinculo(
  alumno: Alumno,
  datos: DatosAltaInscripcion,
  cuentaPrevia: boolean
): Promise<Vinculo> {
  // Sin `confirmarVinculo`: ver la garantía 2 del encabezado.
  const cuenta = await asegurarCuentaFamilia(alumno.id, datos.tutor1Email, datos.tutor1Nombre);

  switch (cuenta.estado) {
    case "vinculada":
      return { rama: cuentaPrevia ? "vincular" : "crear", familiaUserId: cuenta.userId };
    case "requiere_confirmacion":
      return {
        rama: "requiere_confirmacion",
        familiaUserId: cuenta.userId,
        alumnos: cuenta.alumnos,
      };
    case "sin_cuenta":
      return cuenta.motivo === "email_del_equipo"
        ? { rama: "email_del_equipo" }
        : { rama: "sin_cuenta" };
  }
}

/**
 * Asignación al viaje del link. Sin cupo o con el viaje cerrado el alumno queda
 * pre-inscripto y sin asignar: la sobre-capacidad la confirma una persona
 * (US-11), así que no puede resolverla un formulario público.
 */
async function asignarSiCorresponde(
  alumno: Alumno,
  viajeId: string | null
): Promise<ResultadoAsignacion> {
  if (!viajeId) return { estado: "sin_asignar", motivo: "sin_viaje" };

  const viaje = await getViajeById(viajeId);
  if (!viaje) return { estado: "sin_asignar", motivo: "viaje_inexistente" };
  if (viaje.estado !== "inscripcion_abierta" && viaje.estado !== "confirmado") {
    return { estado: "sin_asignar", motivo: "viaje_no_inscribible" };
  }

  const activas = await countAsignacionesActivas(viaje.id);
  if (activas >= viaje.capacidadMaxima) return { estado: "sin_asignar", motivo: "sin_cupo" };

  try {
    const r = await asignarConTablero({ viaje, alumno, usuarioId: null });
    return {
      estado: "asignado",
      viajeId: viaje.id,
      asignacionId: r.asignacionId,
      autoConfirmado: r.autoConfirmado,
    };
  } catch (err) {
    // El viaje cambió de estado entre el chequeo y el efecto: el alumno ya
    // quedó pre-inscripto y el equipo lo asigna a mano.
    if (err instanceof ViajeNoInscribibleError) {
      return { estado: "sin_asignar", motivo: "viaje_no_inscribible" };
    }
    throw err;
  }
}

/**
 * Ver el encabezado del archivo: ejecuta el alta y reporta; no decide.
 *
 * `canalAlta` es lo único que distingue al webhook del Google Form del
 * formulario propio. No es cosmético: queda en el alumno (y el filtro de
 * `/alumnos` lo usa) y viaja al Paso 0 del tablero, que registra por dónde entró
 * la ficha (`pasosIniciales`, `src/lib/domain/pasos/inicializacion.ts`).
 */
export async function altaDesdeInscripcion(
  datos: DatosAltaInscripcion,
  opts: { canalAlta?: Alumno["canalAlta"] } = {}
): Promise<ResultadoAltaInscripcion> {
  // Las dos lecturas son independientes y salen juntas: la de la cuenta tiene
  // que ser previa a cualquier escritura (ver `existeCuentaConEmail`).
  const [existente, cuentaPrevia] = await Promise.all([
    getAlumnoByDni(datos.dni),
    existeCuentaConEmail(datos.tutor1Email),
  ]);

  // Idempotencia: acá termina todo. Ni cuenta de familia, ni viaje, ni un
  // UPDATE sobre el alumno que ya estaba.
  if (existente) return { tipo: "duplicado", alumnoId: existente.id };

  let alumno: Alumno;
  try {
    alumno = await createAlumno({
      nombre: datos.nombre,
      apellido: datos.apellido,
      fechaNacimiento: diaCalendario(datos.fechaNacimiento),
      dni: datos.dni,
      numeroPasaporte: datos.numeroPasaporte,
      fechaVencimientoPasaporte: diaCalendario(datos.fechaVencimientoPasaporte),
      telefonoAlumno: datos.telefonoAlumno,
      emailAlumno: datos.emailAlumno,
      alergiasSalud: datos.alergiasSalud,
      tutor1Nombre: datos.tutor1Nombre,
      tutor1Celular: datos.tutor1Celular,
      tutor1Email: datos.tutor1Email,
      preferenciasAlojamiento: datos.preferenciasAlojamiento,
      nivelInglesAutoevaluacion: datos.nivelInglesAutoevaluacion,
      canalAlta: opts.canalAlta ?? "formulario_web",
      estado: "pre_inscripto",
    });
  } catch (err) {
    // Dos cargas simultáneas del mismo DNI: la segunda pierde la carrera contra
    // el unique y sale por el mismo camino que la idempotencia de arriba.
    if (!esViolacionUnique(err)) throw err;
    const ganador = await getAlumnoByDni(datos.dni);
    return { tipo: "duplicado", alumnoId: ganador?.id ?? null };
  }

  const vinculo = await resolverVinculo(alumno, datos, cuentaPrevia);
  const asignacion = await asignarSiCorresponde(alumno, datos.viajeId);

  return { tipo: "creado", alumnoId: alumno.id, vinculo, asignacion };
}
