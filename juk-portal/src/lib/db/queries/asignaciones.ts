import { and, asc, count, desc, eq, ne, notExists, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos, type Alumno } from "@/lib/db/schema/alumnos";
import { asignaciones, type Asignacion } from "@/lib/db/schema/asignaciones";
import { viajes, type Viaje } from "@/lib/db/schema/viajes";
import { AsignacionNotFoundError } from "@/lib/domain/asignaciones";

export type AlumnoAsignado = {
  asignacionId: string;
  estado: Asignacion["estado"];
  alumno: Pick<
    Alumno,
    "id" | "dni" | "nombre" | "apellido" | "numeroPasaporte" | "fechaVencimientoPasaporte" | "estado"
  >;
};

// Roster del viaje: asignaciones no canceladas, con datos del alumno.
export async function listAsignacionesByViaje(viajeId: string): Promise<AlumnoAsignado[]> {
  return db
    .select({
      asignacionId: asignaciones.id,
      estado: asignaciones.estado,
      alumno: {
        id: alumnos.id,
        dni: alumnos.dni,
        nombre: alumnos.nombre,
        apellido: alumnos.apellido,
        numeroPasaporte: alumnos.numeroPasaporte,
        fechaVencimientoPasaporte: alumnos.fechaVencimientoPasaporte,
        estado: alumnos.estado,
      },
    })
    .from(asignaciones)
    .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
    .where(and(eq(asignaciones.viajeId, viajeId), ne(asignaciones.estado, "cancelada")))
    .orderBy(asc(alumnos.apellido), asc(alumnos.nombre));
}

export async function countAsignacionesActivas(viajeId: string): Promise<number> {
  const rows = await db
    .select({ c: count() })
    .from(asignaciones)
    .where(and(eq(asignaciones.viajeId, viajeId), ne(asignaciones.estado, "cancelada")));
  return rows[0]?.c ?? 0;
}

/**
 * Asignación existente del par (alumno, viaje), en cualquier estado.
 * La constraint uniq_alumno_viaje no incluye el estado, así que el alta la
 * necesita para decidir entre INSERT y reactivación (ver asignar-alumno.ts).
 */
export async function getAsignacionDePar(
  alumnoId: string,
  viajeId: string
): Promise<Asignacion | null> {
  const rows = await db
    .select()
    .from(asignaciones)
    .where(and(eq(asignaciones.alumnoId, alumnoId), eq(asignaciones.viajeId, viajeId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function cancelarAsignacion(
  id: string,
  viajeId: string,
  motivo: string | null
): Promise<Asignacion> {
  // Filtra por id + viaje + que no esté ya cancelada: evita cancelar una
  // asignación de otro viaje o re-cancelar una ya cancelada.
  const rows = await db
    .update(asignaciones)
    .set({ estado: "cancelada", fechaCancelacion: new Date(), motivoCancelacion: motivo })
    .where(
      and(
        eq(asignaciones.id, id),
        eq(asignaciones.viajeId, viajeId),
        ne(asignaciones.estado, "cancelada")
      )
    )
    .returning();
  const row = rows[0];
  if (!row) throw new AsignacionNotFoundError(id);
  return row;
}

/** Lo único que la UI necesita de un elegible: el label del select y el id. */
export type AlumnoElegible = Pick<Alumno, "id" | "nombre" | "apellido">;

// Alumnos asignables: no dados de baja y que no estén ya en el viaje.
// Un solo round-trip (NOT EXISTS correlacionado) y solo las 3 columnas que
// usa el select: la fila completa incluye facturación y datos de salud.
export async function alumnosElegibles(viajeId: string): Promise<AlumnoElegible[]> {
  return db
    .select({ id: alumnos.id, nombre: alumnos.nombre, apellido: alumnos.apellido })
    .from(alumnos)
    .where(
      and(
        ne(alumnos.estado, "baja"),
        notExists(
          db
            .select({ x: sql`1` })
            .from(asignaciones)
            .where(
              and(
                eq(asignaciones.alumnoId, alumnos.id),
                eq(asignaciones.viajeId, viajeId),
                ne(asignaciones.estado, "cancelada")
              )
            )
        )
      )
    )
    .orderBy(asc(alumnos.apellido), asc(alumnos.nombre));
}

export type AsignacionConViaje = {
  asignacionId: string;
  estado: Asignacion["estado"];
  fechaAsignacion: Date;
  viajeId: string;
  viajeCodigo: string;
  viajeNombre: string;
  viajeEstado: string;
  viajeOrigen: string;
  fechaInicio: Date;
  fechaFin: Date;
};

export async function listAsignacionesByAlumno(alumnoId: string): Promise<AsignacionConViaje[]> {
  const rows = await db
    .select({
      asignacionId: asignaciones.id,
      estado: asignaciones.estado,
      fechaAsignacion: asignaciones.fechaAsignacion,
      viajeId: viajes.id,
      viajeCodigo: viajes.codigo,
      viajeNombre: viajes.nombre,
      viajeEstado: viajes.estado,
      viajeOrigen: viajes.origen,
      fechaInicio: viajes.fechaInicio,
      fechaFin: viajes.fechaFin,
    })
    .from(asignaciones)
    .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
    .where(eq(asignaciones.alumnoId, alumnoId))
    .orderBy(desc(asignaciones.fechaAsignacion));
  return rows;
}

/** Dueño real de una asignación (para revalidaciones y ownership server-side). */
export async function alumnoIdDeAsignacion(asignacionId: string): Promise<string | null> {
  const rows = await db
    .select({ alumnoId: asignaciones.alumnoId })
    .from(asignaciones)
    .where(eq(asignaciones.id, asignacionId))
    .limit(1);
  return rows[0]?.alumnoId ?? null;
}

/** Origen del viaje de la asignación (define el canal de las cuotas) y su alumno. */
export async function origenDeAsignacion(
  asignacionId: string
): Promise<{ origen: Viaje["origen"]; alumnoId: string } | null> {
  const rows = await db
    .select({ origen: viajes.origen, alumnoId: asignaciones.alumnoId })
    .from(asignaciones)
    .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
    .where(eq(asignaciones.id, asignacionId))
    .limit(1);
  return rows[0] ?? null;
}
