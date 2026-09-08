import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { notificacionesEnviadas } from "@/lib/db/schema/notificaciones";
import { pasosAlumno, type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import { viajes } from "@/lib/db/schema/viajes";

export type PasoParaRecordatorio = {
  pasoId: string;
  codigo: PasoAlumno["codigo"];
  estado: PasoAlumno["estado"];
  fechaLimite: Date | null;
  asignacionId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  tutorEmail: string;
  tutorNombre: string;
  viajeCodigo: string;
  fechaInicioViaje: Date;
};

/** Pasos A1/D1 de asignaciones activas en viajes que todavía no arrancaron. */
export async function listPasosParaRecordatorio(): Promise<PasoParaRecordatorio[]> {
  return db
    .select({
      pasoId: pasosAlumno.id,
      codigo: pasosAlumno.codigo,
      estado: pasosAlumno.estado,
      fechaLimite: pasosAlumno.fechaLimite,
      asignacionId: asignaciones.id,
      alumnoNombre: alumnos.nombre,
      alumnoApellido: alumnos.apellido,
      tutorEmail: alumnos.tutor1Email,
      tutorNombre: alumnos.tutor1Nombre,
      viajeCodigo: viajes.codigo,
      fechaInicioViaje: viajes.fechaInicio,
    })
    .from(pasosAlumno)
    .innerJoin(asignaciones, eq(pasosAlumno.asignacionId, asignaciones.id))
    .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
    .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
    .where(
      and(
        eq(asignaciones.estado, "activa"),
        inArray(viajes.estado, ["inscripcion_abierta", "confirmado"]),
        inArray(pasosAlumno.codigo, ["a1", "d1"])
      )
    );
}

export async function marcarPasoVencido(pasoId: string): Promise<void> {
  await db
    .update(pasosAlumno)
    .set({ estado: "vencido", updatedAt: new Date() })
    .where(eq(pasosAlumno.id, pasoId));
}

/**
 * Candado de dedup: la unique (tipo, entidad, clave) + onConflictDoNothing hace
 * que una ocurrencia ya enviada no devuelva fila. Devuelve el id de la
 * notificación nueva, o null si ya existía.
 */
export async function registrarNotificacionEnviada(data: {
  tipo: string;
  entidadTipo: string;
  entidadId: string;
  clave: string;
  destinatario: string;
}): Promise<string | null> {
  const insertado = await db
    .insert(notificacionesEnviadas)
    .values(data)
    .onConflictDoNothing()
    .returning({ id: notificacionesEnviadas.id });
  return insertado[0]?.id ?? null;
}

export async function setResultadoNotificacion(
  id: string,
  resultado: { resendMessageId: string | null } | { estado: "failed" }
): Promise<void> {
  await db.update(notificacionesEnviadas).set(resultado).where(eq(notificacionesEnviadas.id, id));
}
