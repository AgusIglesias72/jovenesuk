import * as Sentry from "@sentry/nextjs";

import { safeAudit } from "@/lib/actions/safe-audit";
import {
  altaDesdeInscripcion,
  type MotivoSinAsignar,
  type ResultadoAsignacion,
  type Vinculo,
} from "@/lib/db/queries/alta-inscripcion";
import {
  registrarResolucionAlta,
  type ResolucionInscripcion,
} from "@/lib/db/queries/resolucion-inscripcion";
import type { Inscripcion } from "@/lib/db/schema/inscripciones";
import { describirAlumnosVinculados } from "@/lib/domain/familias";

/**
 * LA COMPUERTA del alta automática — política única, compartida por el
 * formulario público (`src/app/inscripcion/actions.ts`), la bandeja del equipo y
 * el webhook legacy del Google Form.
 *
 * El problema que resuelve:
 *
 * El webhook crea el alumno y le arma la cuenta del Portal de Familias con
 * `asegurarCuentaFamilia`, que por dentro puede decidir VINCULAR el alumno a una
 * cuenta que YA existe cuando el email del tutor coincide. El webhook se lo puede
 * permitir porque va detrás de un secreto compartido de 32+ caracteres. Un
 * formulario PÚBLICO no tiene ese secreto: si copiáramos el flujo tal cual,
 * cualquiera desde internet podría fabricar una ficha con el email de otra
 * familia y colgarle un alumno inventado a su cuenta real.
 *
 * Por eso el alta no corre por el hecho de que la ficha exista, sino por una
 * CAPACIDAD que el equipo entregó:
 *
 *  - `invitacion`: la carga llegó con un token de invitación válido. Es el
 *    equivalente del secreto del webhook.
 *  - `equipo`: la dispara una persona con sesión desde la bandeja.
 *  - `ninguna`: carga anónima. NO hay alta: la ficha queda en
 *    `requiere_revision` y la procesa un humano.
 *
 * Con la capacidad en mano, manda el resultado del vínculo de familia:
 *
 *  - `crear` (no existía cuenta con ese email) → único caso 100% automático.
 *  - `vincular` (la cuenta existía y los alumnos comparten apellido o DNI) → se
 *    hace, pero la ficha queda en `requiere_revision` y AUDITADA: un humano
 *    tiene que ver que se colgó de una cuenta que ya existía.
 *  - `requiere_confirmacion` (la cuenta tiene alumnos de otro apellido) y
 *    `email_del_equipo` → NUNCA automático. El alumno se crea pre-inscripto SIN
 *    cuenta de familia y la ficha queda para que el admin resuelva.
 *
 * La idempotencia por DNI —el blindaje real del ataque— la garantiza la capa de
 * abajo (`@/lib/db/queries/alta-inscripcion`): si ese DNI ya existe no se llama a
 * `asegurarCuentaFamilia` ni se asigna viaje, así que mandar la ficha de un
 * alumno que ya está cargado no puede cambiarle la cuenta de familia.
 *
 * Este archivo NO lleva "use server": no es una server action expuesta al
 * cliente, sino la implementación que las actions llaman. Exponerla como
 * endpoint sería justamente el agujero que cierra.
 */

/** La capacidad con la que se dispara el alta. Ver el encabezado. */
export type AutorizacionAlta =
  | { via: "invitacion"; comunicacionId: string }
  | { via: "equipo"; usuarioId: string }
  | { via: "ninguna" };

export type ResolucionAlta = ResolucionInscripcion & {
  /** false cuando la compuerta cortó antes de tocar la base. */
  altaEjecutada: boolean;
};

/** Lo usa también el formulario público al persistir una carga sin invitación. */
export const MOTIVO_SIN_INVITACION =
  "La ficha llegó sin una invitación válida: el alta la tiene que confirmar una persona.";

const MOTIVO_DUPLICADA =
  "Ese DNI ya estaba cargado: no se tocó al alumno existente ni su cuenta de familia.";

const MOTIVO_DUPLICADA_SIN_ALUMNO =
  "Ese DNI ya estaba cargado, pero no pudimos identificar al alumno: buscalo a mano por DNI.";

const MOTIVO_ERROR =
  "No pudimos completar el alta automática. La ficha quedó intacta y se puede reintentar.";

const MOTIVO_SIN_ASIGNAR: Record<MotivoSinAsignar, string> = {
  sin_viaje: "La ficha no traía viaje: el alumno quedó pre-inscripto, sin asignar.",
  viaje_inexistente:
    "El viaje de la invitación ya no existe: el alumno quedó pre-inscripto, sin asignar.",
  viaje_no_inscribible:
    "El viaje ya no admite inscripciones: el alumno quedó pre-inscripto, sin asignar.",
  sin_cupo:
    "El viaje no tiene cupo: el alumno quedó pre-inscripto, sin asignar (la sobre-capacidad la confirma una persona).",
};

/**
 * El motivo que va a la bandeja. Es una frase, no un código: quien la lee tiene
 * que saber qué hacer sin abrir el código ni preguntar.
 */
function motivoDelVinculo(vinculo: Vinculo): string | null {
  switch (vinculo.rama) {
    case "crear":
      return null;
    case "vincular":
      return "El email del tutor ya tenía una cuenta de familia y el alumno quedó colgado de esa cuenta: confirmá que es la familia correcta.";
    case "requiere_confirmacion":
      return `El email del tutor ya tiene una cuenta de familia con alumnos de otro apellido (${describirAlumnosVinculados(vinculo.alumnos)}): el alumno se creó SIN cuenta del Portal de Familias.`;
    case "email_del_equipo":
      return "El email del tutor es de un usuario del equipo: el alumno se creó SIN cuenta del Portal de Familias.";
    case "sin_cuenta":
      return "El alumno se creó, pero no pudimos armarle la cuenta del Portal de Familias.";
  }
}

function motivoDeAsignacion(asignacion: ResultadoAsignacion): string | null {
  return asignacion.estado === "asignado" ? null : MOTIVO_SIN_ASIGNAR[asignacion.motivo];
}

/**
 * Sella la resolución sobre la ficha y la devuelve. La escritura es best-effort
 * a propósito: si falla, el alumno que se haya creado ya existe y la ficha queda
 * como estaba, así que el reintento es seguro (cae en `duplicado` por el unique
 * de `alumnos.dni`). Romper acá le mostraría un error a una familia que cargó
 * todo bien.
 */
async function sellar(
  inscripcionId: string,
  resolucion: ResolucionInscripcion,
  altaEjecutada: boolean
): Promise<ResolucionAlta> {
  try {
    await registrarResolucionAlta(inscripcionId, resolucion);
  } catch (err) {
    Sentry.captureException(err);
  }
  return { ...resolucion, altaEjecutada };
}

/**
 * Todo lo que se automatizó queda auditado, con el origen y la rama del vínculo.
 * El `vincular` lleva ADEMÁS su propia entrada: colgar un alumno de una cuenta
 * que ya existía es la operación sensible de este flujo y tiene que poder
 * buscarse sola en la auditoría.
 */
async function auditar(
  inscripcion: Inscripcion,
  alumnoId: string,
  vinculo: Vinculo,
  asignacion: ResultadoAsignacion,
  autorizacion: AutorizacionAlta,
  usuarioId: string | null
): Promise<void> {
  const origen: Record<string, unknown> = {
    origen: "inscripcion_web",
    inscripcionId: inscripcion.id,
    via: autorizacion.via,
    ...(autorizacion.via === "invitacion"
      ? { comunicacionId: autorizacion.comunicacionId }
      : {}),
  };

  await safeAudit({
    accion: "create",
    entidadTipo: "alumno",
    entidadId: alumnoId,
    usuarioId,
    metadata: { ...origen, vinculo: vinculo.rama },
  });

  if (vinculo.rama === "vincular") {
    await safeAudit({
      accion: "update",
      entidadTipo: "alumno",
      entidadId: alumnoId,
      usuarioId,
      metadata: {
        ...origen,
        vinculo: "cuenta_existente",
        familiaUserId: vinculo.familiaUserId,
      },
    });
  }

  if (asignacion.estado !== "asignado") return;

  await safeAudit({
    accion: "asignar_a_viaje",
    entidadTipo: "asignacion",
    entidadId: asignacion.asignacionId,
    usuarioId,
    metadata: { ...origen, viajeId: asignacion.viajeId },
  });

  if (asignacion.autoConfirmado) {
    await safeAudit({
      accion: "cambio_estado_viaje",
      entidadTipo: "viaje",
      entidadId: asignacion.viajeId,
      usuarioId,
      metadata: {
        ...origen,
        estadoAnterior: "inscripcion_abierta",
        estado: "confirmado",
        motivo: "auto_5_alumnos",
      },
    });
  }
}

/**
 * Aplica la política, ejecuta el alta si corresponde y deja la ficha sellada con
 * su estado y su motivo. Nunca lanza: el llamador público ya le contestó a la
 * familia que su ficha entró, y nada de lo que pase acá puede cambiarle esa
 * respuesta.
 */
export async function procesarAltaInscripcion(
  inscripcion: Inscripcion,
  autorizacion: AutorizacionAlta
): Promise<ResolucionAlta> {
  // La compuerta: sin capacidad no se toca la base. Ni el alumno, ni —sobre
  // todo— la cuenta de familia que el email del tutor pudiera tener.
  if (autorizacion.via === "ninguna") {
    return sellar(
      inscripcion.id,
      { estado: "requiere_revision", motivo: MOTIVO_SIN_INVITACION, alumnoId: null },
      false
    );
  }

  const usuarioId = autorizacion.via === "equipo" ? autorizacion.usuarioId : null;

  let resultado;
  try {
    resultado = await altaDesdeInscripcion(inscripcion);
  } catch (err) {
    Sentry.captureException(err);
    return sellar(
      inscripcion.id,
      { estado: "error", motivo: MOTIVO_ERROR, alumnoId: null },
      true
    );
  }

  if (resultado.tipo === "duplicado") {
    return sellar(
      inscripcion.id,
      {
        estado: "duplicada",
        motivo: resultado.alumnoId === null ? MOTIVO_DUPLICADA_SIN_ALUMNO : MOTIVO_DUPLICADA,
        alumnoId: resultado.alumnoId,
      },
      true
    );
  }

  const { alumnoId, vinculo, asignacion } = resultado;
  await auditar(inscripcion, alumnoId, vinculo, asignacion, autorizacion, usuarioId);

  const motivos = [motivoDelVinculo(vinculo), motivoDeAsignacion(asignacion)].filter(
    (m): m is string => m !== null
  );

  // `procesada` es el único desenlace que no deja trabajo: cuenta nueva y alumno
  // asignado. Todo lo demás lo mira una persona, y por eso lleva motivo.
  const automatica = vinculo.rama === "crear" && asignacion.estado === "asignado";

  return sellar(
    inscripcion.id,
    {
      estado: automatica ? "procesada" : "requiere_revision",
      motivo: motivos.length > 0 ? motivos.join(" ") : null,
      alumnoId,
    },
    true
  );
}
