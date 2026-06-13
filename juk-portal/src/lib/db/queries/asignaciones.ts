import { and, asc, count, desc, eq, ne, notInArray, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos, type Alumno } from "@/lib/db/schema/alumnos";
import {
  asignaciones,
  type Asignacion,
  type NewAsignacion,
} from "@/lib/db/schema/asignaciones";
import { viajes } from "@/lib/db/schema/viajes";
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

// Crea la asignación o, si el par (alumno, viaje) ya existe en estado
// "cancelada", la reactiva con un UPDATE. La constraint uniq_alumno_viaje no
// incluye el estado, así que un INSERT sobre una asignación cancelada chocaría
// (23505): por eso reusamos la fila existente.
export async function createAsignacion(data: NewAsignacion): Promise<Asignacion> {
  const { alumnoId, viajeId } = data;

  const existentes = await db
    .select()
    .from(asignaciones)
    .where(and(eq(asignaciones.alumnoId, alumnoId), eq(asignaciones.viajeId, viajeId)));
  const existente = existentes[0];

  if (existente && existente.estado === "cancelada") {
    const reactivadas = await db
      .update(asignaciones)
      .set({
        estado: data.estado ?? "activa",
        fechaAsignacion: data.fechaAsignacion ?? new Date(),
        fechaCancelacion: null,
        motivoCancelacion: null,
      })
      .where(eq(asignaciones.id, existente.id))
      .returning();
    return reactivadas[0]!;
  }

  const rows = await db.insert(asignaciones).values(data).returning();
  return rows[0]!;
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

// Alumnos asignables: no dados de baja y que no estén ya en el viaje.
export async function alumnosElegibles(viajeId: string): Promise<Alumno[]> {
  const yaAsignados = await db
    .select({ alumnoId: asignaciones.alumnoId })
    .from(asignaciones)
    .where(and(eq(asignaciones.viajeId, viajeId), ne(asignaciones.estado, "cancelada")));
  const ids = yaAsignados.map((a) => a.alumnoId);

  const conds: SQL[] = [ne(alumnos.estado, "baja")];
  if (ids.length) conds.push(notInArray(alumnos.id, ids));

  return db
    .select()
    .from(alumnos)
    .where(and(...conds))
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
