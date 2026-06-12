import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { pasosAlumno, type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import type { PasoInicial } from "@/lib/domain/pasos";

export async function listPasosByAsignacion(asignacionId: string): Promise<PasoAlumno[]> {
  return db.select().from(pasosAlumno).where(eq(pasosAlumno.asignacionId, asignacionId));
}

/**
 * Crea (o re-crea) el tablero de la asignación: borra lo existente e inserta
 * los 11 pasos. Cubre tanto el alta como la reactivación de una asignación
 * cancelada (PRD: reasignación → los pasos se resetean).
 *
 * `fechaAltaAlumno` se usa como fechaCompletado del Paso 0 (la fecha real de
 * la primera interacción del alumno con JUK).
 */
export async function crearPasosParaAsignacion(
  asignacionId: string,
  pasos: PasoInicial[],
  fechaAltaAlumno: Date,
  updatedBy: string | null
): Promise<void> {
  await db.delete(pasosAlumno).where(eq(pasosAlumno.asignacionId, asignacionId));
  await db.insert(pasosAlumno).values(
    pasos.map((p) => ({
      asignacionId,
      codigo: p.codigo,
      estado: p.estado,
      metadata: p.metadata,
      fechaCompletado: p.codigo === "paso_0" ? fechaAltaAlumno : null,
      updatedBy,
    }))
  );
}
