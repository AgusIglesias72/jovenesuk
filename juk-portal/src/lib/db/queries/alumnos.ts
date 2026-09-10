import { and, asc, count, desc, eq, ilike, inArray, ne, notInArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos, type Alumno, type NewAlumno } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { viajes } from "@/lib/db/schema/viajes";
import { AlumnoNotFoundError, type AlumnoFilters } from "@/lib/domain/alumnos";
import {
  paginarEnSql,
  totalDe,
  type Pagina,
  type Paginado,
} from "@/lib/utils/paginate";

import { unicaFila } from "./errors";

/** Fila del listado de alumnos (US-17): viaje e indicador de alerta por alumno. */
export type AlumnoFila = Alumno & {
  /** Código del viaje más próximo/reciente en el que está (asignación no cancelada). */
  viajeCodigo: string | null;
  /** Mismo criterio que el filtro "Con pasos bloqueados o vencidos". */
  tieneAlerta: boolean;
};

/**
 * US-17: alumnos con al menos un paso bloqueado o vencido en una asignación
 * activa. Una sola definición para el filtro Y para el indicador de la fila:
 * si divergieran, el punto de alerta mentiría respecto del filtro.
 */
function alumnosConPasosEnAlerta() {
  return db
    .select({ alumnoId: asignaciones.alumnoId })
    .from(pasosAlumno)
    .innerJoin(asignaciones, eq(pasosAlumno.asignacionId, asignaciones.id))
    .where(
      and(
        inArray(pasosAlumno.estado, ["bloqueado", "vencido"]),
        eq(asignaciones.estado, "activa")
      )
    );
}

function condicionesAlumnos(filters: AlumnoFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const match = or(
      ilike(alumnos.nombre, like),
      ilike(alumnos.apellido, like),
      ilike(alumnos.dni, like),
      ilike(alumnos.numeroPasaporte, like)
    );
    if (match) conditions.push(match);
  }
  if (filters.estado) conditions.push(eq(alumnos.estado, filters.estado));

  if (filters.alerta === "pasos_bloqueados") {
    conditions.push(inArray(alumnos.id, alumnosConPasosEnAlerta()));
  }

  // Roster del viaje: mismo criterio que listAsignacionesByViaje (no cancelada).
  if (filters.viajeId) {
    conditions.push(
      inArray(
        alumnos.id,
        db
          .select({ alumnoId: asignaciones.alumnoId })
          .from(asignaciones)
          .where(
            and(eq(asignaciones.viajeId, filters.viajeId), ne(asignaciones.estado, "cancelada"))
          )
      )
    );
  }

  // Paso de trámite pendiente = todavía pide trabajo (ni completado ni N/A). Con
  // viaje elegido, el paso tiene que estar pendiente EN ese viaje.
  if (filters.paso) {
    conditions.push(
      inArray(
        alumnos.id,
        db
          .select({ alumnoId: asignaciones.alumnoId })
          .from(pasosAlumno)
          .innerJoin(asignaciones, eq(pasosAlumno.asignacionId, asignaciones.id))
          .where(
            and(
              eq(pasosAlumno.codigo, filters.paso),
              notInArray(pasosAlumno.estado, ["completado", "na"]),
              ne(asignaciones.estado, "cancelada"),
              filters.viajeId ? eq(asignaciones.viajeId, filters.viajeId) : undefined
            )
          )
      )
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

export async function listAlumnos(
  filters: AlumnoFilters,
  pagina: Pagina
): Promise<Paginado<AlumnoFila>> {
  const where = condicionesAlumnos(filters);

  return paginarEnSql(
    pagina,
    async (limit, offset) => {
      // Subqueries correlacionadas por fila: resuelven viaje y alerta sin
      // multiplicar filas, así la paginación sigue siendo sobre `alumnos`.
      const viajeActual = db
        .select({ codigo: viajes.codigo })
        .from(asignaciones)
        .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
        .where(and(eq(asignaciones.alumnoId, alumnos.id), ne(asignaciones.estado, "cancelada")))
        .orderBy(desc(viajes.fechaInicio))
        .limit(1);

      const rows = await db
        .select({
          alumno: alumnos,
          viajeCodigo: sql<string | null>`(${viajeActual})`,
          tieneAlerta: sql<boolean>`${inArray(alumnos.id, alumnosConPasosEnAlerta())}`,
        })
        .from(alumnos)
        .where(where)
        .orderBy(asc(alumnos.apellido), asc(alumnos.nombre))
        .limit(limit)
        .offset(offset);

      return rows.map((r) => ({
        ...r.alumno,
        viajeCodigo: r.viajeCodigo,
        tieneAlerta: r.tieneAlerta === true,
      }));
    },
    () => db.select({ n: count() }).from(alumnos).where(where).then(totalDe)
  );
}

export async function getAlumnoById(id: string): Promise<Alumno | null> {
  const rows = await db.select().from(alumnos).where(eq(alumnos.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAlumnoByDni(dni: string): Promise<Alumno | null> {
  const rows = await db.select().from(alumnos).where(eq(alumnos.dni, dni)).limit(1);
  return rows[0] ?? null;
}

export async function createAlumno(data: NewAlumno): Promise<Alumno> {
  const rows = await db.insert(alumnos).values(data).returning();
  return unicaFila(rows, "alumnos");
}

export async function updateAlumno(
  id: string,
  data: Partial<NewAlumno>
): Promise<Alumno> {
  const rows = await db
    .update(alumnos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(alumnos.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new AlumnoNotFoundError(id);
  return row;
}

export async function darDeBajaAlumno(
  id: string,
  motivo: string | null
): Promise<Alumno> {
  const rows = await db
    .update(alumnos)
    .set({ estado: "baja", fechaBaja: new Date(), motivoBaja: motivo, updatedAt: new Date() })
    .where(eq(alumnos.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new AlumnoNotFoundError(id);
  return row;
}

export async function reactivarAlumno(id: string): Promise<Alumno> {
  const rows = await db
    .update(alumnos)
    .set({ estado: "activo", fechaBaja: null, motivoBaja: null, updatedAt: new Date() })
    .where(eq(alumnos.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new AlumnoNotFoundError(id);
  return row;
}
