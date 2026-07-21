import { notFound } from "next/navigation";

import { requireFamilia } from "@/lib/auth/helpers";
import { getAlumnoByDni } from "@/lib/db/queries/alumnos";
import { listAsignacionesByAlumno } from "@/lib/db/queries/asignaciones";

/**
 * Resuelve el alumno por DNI (slug) y valida que pertenezca a la familia
 * logueada. Lo usan todos los módulos del portal bajo /familias/[dni].
 */
export async function cargarAlumnoFamilia(dni: string) {
  const session = await requireFamilia();
  const alumno = await getAlumnoByDni(dni);
  if (!alumno || alumno.familiaUserId !== session.user.id) {
    notFound();
  }
  return { session, alumno };
}

/**
 * Asignaciones vigentes (los viajes "reales" del alumno): todo lo que no está
 * cancelado. Incluye `viajando` y `finalizada` para que el portal no se vacíe
 * cuando el viaje arrancó o terminó.
 */
export async function asignacionesActivas(alumnoId: string) {
  const todas = await listAsignacionesByAlumno(alumnoId);
  return todas.filter((a) => a.estado !== "cancelada");
}
