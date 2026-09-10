import { cache } from "react";
import { notFound } from "next/navigation";

import { requireFamilia } from "@/lib/auth/helpers";
import { getAlumnoByDni } from "@/lib/db/queries/alumnos";
import { listAsignacionesByAlumno } from "@/lib/db/queries/asignaciones";
import { listCuotasByAsignaciones } from "@/lib/db/queries/cuotas";
import { estaVencida } from "@/lib/domain/cuotas";

/**
 * Resuelve el alumno por DNI (slug) y valida que pertenezca a la familia
 * logueada. Lo usan todos los módulos del portal bajo /familias/[dni].
 *
 * Memoizada por request: el layout y la page del mismo request comparten una
 * sola lectura (el `notFound()` se memoiza como rechazo y se re-lanza igual).
 * Sesión y alumno no dependen entre sí, así que se piden juntos y la
 * pertenencia se valida después: el 404 sigue siendo indistinguible de "ese
 * DNI no existe".
 */
export const cargarAlumnoFamilia = cache(async (dni: string) => {
  const [session, alumno] = await Promise.all([requireFamilia(), getAlumnoByDni(dni)]);
  if (!alumno || alumno.familiaUserId !== session.user.id) {
    notFound();
  }
  return { session, alumno };
});

/**
 * Asignaciones vigentes (los viajes "reales" del alumno): todo lo que no está
 * cancelado. Incluye `viajando` y `finalizada` para que el portal no se vacíe
 * cuando el viaje arrancó o terminó. Memoizada por request como la anterior.
 */
export const asignacionesActivas = cache(async (alumnoId: string) => {
  const todas = await listAsignacionesByAlumno(alumnoId);
  return todas.filter((a) => a.estado !== "cancelada");
});

/**
 * Cuotas de todas las asignaciones vigentes del alumno, en un solo round-trip.
 * Memoizada por request: el layout la usa para el aviso global de cuota vencida
 * y la page de Pagos/Resumen la reusa sin volver a pegarle a la base.
 */
export const cuotasActivas = cache(async (alumnoId: string) => {
  const activas = await asignacionesActivas(alumnoId);
  return listCuotasByAsignaciones(activas.map((a) => a.asignacionId));
});

/** Cantidad de cuotas vencidas del alumno hoy (misma regla que Pagos: `estaVencida`). */
export async function contarCuotasVencidas(alumnoId: string, hoy: Date = new Date()): Promise<number> {
  const cuotas = await cuotasActivas(alumnoId);
  return cuotas.filter((c) => estaVencida(c, hoy)).length;
}
