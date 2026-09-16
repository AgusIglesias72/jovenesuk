import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos, type Alumno } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { pasosAlumno, type NewPasoAlumno } from "@/lib/db/schema/pasos-alumno";
import { viajes, type Viaje } from "@/lib/db/schema/viajes";
import { ViajeNoInscribibleError } from "@/lib/domain/asignaciones";
import {
  debeAutoConfirmar,
  edadAlInicioDelViaje,
  fechaLimiteA1Default,
  pasosIniciales,
  type PasoInicial,
} from "@/lib/domain/pasos";

import { countAsignacionesActivas, getAsignacionDePar } from "./asignaciones";
import { getColegioById, getConfigDocumental } from "./colegios";

/**
 * Filas del tablero M6 de una asignación. `fechaAltaAlumno` es la
 * fechaCompletado del Paso 0 (la primera interacción real del alumno con JUK).
 */
export function filasTableroInicial(
  asignacionId: string,
  pasos: PasoInicial[],
  fechaAltaAlumno: Date,
  updatedBy: string | null,
  fechaLimiteA1: Date | null
): NewPasoAlumno[] {
  return pasos.map((p) => ({
    asignacionId,
    codigo: p.codigo,
    estado: p.estado,
    metadata: p.metadata,
    fechaLimite: p.codigo === "a1" ? fechaLimiteA1 : null,
    fechaCompletado: p.codigo === "paso_0" ? fechaAltaAlumno : null,
    updatedBy,
  }));
}

/**
 * Núcleo del trigger de asignación (PRD §6.2), compartido por la server action
 * y el webhook del Google Form: crea la asignación, genera el tablero M6 con
 * los N/A automáticos y auto-confirma el viaje Grupal al llegar a 5.
 *
 * Las VALIDACIONES (estado del viaje, pasaporte, cupo) son responsabilidad
 * del llamador: acá solo se ejecuta el efecto.
 *
 * Son 2 round-trips: uno con todas las lecturas en paralelo y otro con TODAS
 * las escrituras en un `db.batch`. neon-http no expone `db.transaction()`,
 * pero `batch` manda los statements en un único request envuelto en una
 * transacción del servidor: si falla cualquiera, no queda nada aplicado (no
 * hay asignaciones sin tablero ni viajes confirmados de más).
 */
export async function asignarConTablero(opts: {
  viaje: Viaje;
  alumno: Alumno;
  /** null cuando lo dispara el webhook (sin sesión). */
  usuarioId: string | null;
}): Promise<{ asignacionId: string; autoConfirmado: boolean; pasosCreados: number }> {
  const { viaje, alumno, usuarioId } = opts;

  // El re-chequeo del estado cierra la ventana TOCTOU entre la validación del
  // llamador y este efecto.
  const [estadoRows, existente, colegio, configDocumental, activasPrevias] =
    await Promise.all([
      db.select({ estado: viajes.estado }).from(viajes).where(eq(viajes.id, viaje.id)).limit(1),
      getAsignacionDePar(alumno.id, viaje.id),
      getColegioById(viaje.colegioDestinoId),
      getConfigDocumental(viaje.colegioDestinoId),
      countAsignacionesActivas(viaje.id),
    ]);

  const estado = estadoRows[0]?.estado;
  if (estado !== "inscripcion_abierta" && estado !== "confirmado") {
    throw new ViajeNoInscribibleError(estado ?? "inexistente");
  }

  // La constraint uniq_alumno_viaje no incluye el estado: sobre una asignación
  // cancelada reusamos la fila (reactivación); si ya existe activa, el INSERT
  // choca con 23505 y lo traduce la action ("ya está asignado a este viaje").
  const reactivable = existente?.estado === "cancelada" ? existente : null;
  const asignacionId = reactivable?.id ?? crypto.randomUUID();
  const ahora = new Date();

  const pasos = pasosIniciales({
    configDocumental,
    tipoEntrada: colegio?.tipoEntradaRequerida ?? "eta",
    origenViaje: viaje.origen,
    tipoViaje: viaje.tipo,
    edadAlInicio: edadAlInicioDelViaje(alumno.fechaNacimiento, viaje.fechaInicio),
    canalAlta: alumno.canalAlta,
  });

  // Con el estado RELEÍDO: el `viaje` del llamador puede estar desactualizado.
  const autoConfirmado = debeAutoConfirmar(viaje.tipo, estado, activasPrevias + 1);

  await db.batch([
    reactivable
      ? db
          .update(asignaciones)
          .set({
            estado: "activa",
            // `now()` de Postgres, igual que el `defaultNow()` del INSERT: con
            // `new Date()` la reactivación podía quedar ANTES de la asignación
            // original si el reloj de la máquina va atrasado respecto del de la
            // base (pasó en una corrida local).
            fechaAsignacion: sql`now()`,
            fechaCancelacion: null,
            motivoCancelacion: null,
          })
          .where(eq(asignaciones.id, reactivable.id))
      : db
          .insert(asignaciones)
          .values({ id: asignacionId, alumnoId: alumno.id, viajeId: viaje.id }),
    // Reasignación: el tablero se resetea (PRD §6.2).
    db.delete(pasosAlumno).where(eq(pasosAlumno.asignacionId, asignacionId)),
    db
      .insert(pasosAlumno)
      .values(
        filasTableroInicial(
          asignacionId,
          pasos,
          alumno.fechaAlta,
          usuarioId,
          fechaLimiteA1Default(viaje.fechaInicio)
        )
      ),
    // El alumno asignado deja de ser pre-inscripto (PRD §5.5).
    ...(alumno.estado === "pre_inscripto"
      ? [
          db
            .update(alumnos)
            .set({ estado: "inscripto" as const, updatedAt: ahora })
            .where(eq(alumnos.id, alumno.id)),
        ]
      : []),
    // Confirmado AUTOMÁTICO al 5to inscripto, solo Grupales (US-13).
    ...(autoConfirmado
      ? [
          db
            .update(viajes)
            .set({ estado: "confirmado" as const, updatedAt: ahora })
            .where(eq(viajes.id, viaje.id)),
        ]
      : []),
  ]);

  return { asignacionId, autoConfirmado, pasosCreados: pasos.length };
}
