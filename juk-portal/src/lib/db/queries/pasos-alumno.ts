import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { pasosAlumno, type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import type { PasoInicial } from "@/lib/domain/pasos";

export async function listPasosByAsignacion(asignacionId: string): Promise<PasoAlumno[]> {
  return db.select().from(pasosAlumno).where(eq(pasosAlumno.asignacionId, asignacionId));
}

/**
 * Pasos de varias asignaciones en un solo round-trip (el llamador agrupa por
 * `asignacionId` con `agruparPor`). Con neon-http cada query es un HTTPS
 * independiente, así que pedir los pasos por asignación en un loop es N saltos.
 */
export async function listPasosByAsignaciones(asignacionIds: string[]): Promise<PasoAlumno[]> {
  if (asignacionIds.length === 0) return [];
  return db.select().from(pasosAlumno).where(inArray(pasosAlumno.asignacionId, asignacionIds));
}

export async function getPasoAlumnoById(id: string): Promise<PasoAlumno | null> {
  const rows = await db.select().from(pasosAlumno).where(eq(pasosAlumno.id, id)).limit(1);
  return rows[0] ?? null;
}

export type PasoAlumnoPatch = {
  estado?: PasoAlumno["estado"];
  /** Reemplaza la columna completa: el llamador hace el merge con la metadata actual. */
  metadata?: Record<string, unknown>;
  notas?: string | null;
  fechaCompletado?: Date | null;
};

/**
 * Actualización parcial de un paso del tablero. Solo se tocan las claves
 * presentes en el patch (undefined = no cambiar), más updatedAt/updatedBy.
 */
export async function updatePasoAlumno(
  id: string,
  patch: PasoAlumnoPatch,
  updatedBy: string | null
): Promise<void> {
  await db
    .update(pasosAlumno)
    .set({
      ...(patch.estado !== undefined ? { estado: patch.estado } : {}),
      ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
      ...(patch.notas !== undefined ? { notas: patch.notas } : {}),
      ...(patch.fechaCompletado !== undefined ? { fechaCompletado: patch.fechaCompletado } : {}),
      updatedAt: new Date(),
      updatedBy,
    })
    .where(eq(pasosAlumno.id, id));
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
  updatedBy: string | null,
  opts?: {
    /** Default de A1 heredado del viaje (US-20); sobreescribible por alumno. */
    fechaLimiteA1?: Date | null;
  }
): Promise<void> {
  await db.delete(pasosAlumno).where(eq(pasosAlumno.asignacionId, asignacionId));
  await db.insert(pasosAlumno).values(
    pasos.map((p) => ({
      asignacionId,
      codigo: p.codigo,
      estado: p.estado,
      metadata: p.metadata,
      fechaLimite: p.codigo === "a1" ? (opts?.fechaLimiteA1 ?? null) : null,
      fechaCompletado: p.codigo === "paso_0" ? fechaAltaAlumno : null,
      updatedBy,
    }))
  );
}
