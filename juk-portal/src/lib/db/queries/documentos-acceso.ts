import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { documentos } from "@/lib/db/schema/documentos";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";

/**
 * Datos mínimos para autorizar y servir un archivo desde /api/uploads.
 * `familiaUserId` es el dueño del alumno al que pertenece el documento
 * (null cuando el documento no cuelga de un alumno: colegios, viajes, etc.).
 */
export type DocumentoAcceso = {
  nombreOriginal: string;
  mimeType: string;
  familiaUserId: string | null;
};

async function familiaDelPaso(pasoId: string): Promise<string | null> {
  const rows = await db
    .select({ familiaUserId: alumnos.familiaUserId })
    .from(pasosAlumno)
    .innerJoin(asignaciones, eq(asignaciones.id, pasosAlumno.asignacionId))
    .innerJoin(alumnos, eq(alumnos.id, asignaciones.alumnoId))
    .where(eq(pasosAlumno.id, pasoId))
    .limit(1);
  return rows[0]?.familiaUserId ?? null;
}

async function familiaDelAlumno(alumnoId: string): Promise<string | null> {
  const rows = await db
    .select({ familiaUserId: alumnos.familiaUserId })
    .from(alumnos)
    .where(eq(alumnos.id, alumnoId))
    .limit(1);
  return rows[0]?.familiaUserId ?? null;
}

export async function getDocumentoAccesoByKey(r2Key: string): Promise<DocumentoAcceso | null> {
  const rows = await db
    .select({
      entidadTipo: documentos.entidadTipo,
      entidadId: documentos.entidadId,
      nombreOriginal: documentos.nombreOriginal,
      mimeType: documentos.mimeType,
    })
    .from(documentos)
    .where(eq(documentos.r2Key, r2Key))
    .limit(1);

  const doc = rows[0];
  if (!doc) return null;

  const familiaUserId =
    doc.entidadTipo === "paso_alumno"
      ? await familiaDelPaso(doc.entidadId)
      : doc.entidadTipo === "alumno"
        ? await familiaDelAlumno(doc.entidadId)
        : null;

  return { nombreOriginal: doc.nombreOriginal, mimeType: doc.mimeType, familiaUserId };
}

/** ¿La familia `userId` es dueña del alumno dueño de este documento? */
export async function familiaPuedeVerKey(r2Key: string, userId: string): Promise<boolean> {
  const acceso = await getDocumentoAccesoByKey(r2Key);
  return acceso?.familiaUserId === userId;
}
