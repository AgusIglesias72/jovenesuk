import { and, asc, count, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos, type Alumno, type NewAlumno } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { AlumnoNotFoundError, type AlumnoFilters } from "@/lib/domain/alumnos";
import {
  paginarEnSql,
  totalDe,
  type Pagina,
  type Paginado,
} from "@/lib/utils/paginate";

import { unicaFila } from "./errors";

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

  // US-17: alumnos con al menos un paso bloqueado o vencido en una asignación activa.
  if (filters.alerta === "pasos_bloqueados") {
    const conAlerta = db
      .select({ alumnoId: asignaciones.alumnoId })
      .from(pasosAlumno)
      .innerJoin(asignaciones, eq(pasosAlumno.asignacionId, asignaciones.id))
      .where(
        and(
          inArray(pasosAlumno.estado, ["bloqueado", "vencido"]),
          eq(asignaciones.estado, "activa")
        )
      );
    conditions.push(inArray(alumnos.id, conAlerta));
  }

  return conditions.length ? and(...conditions) : undefined;
}

export async function listAlumnos(
  filters: AlumnoFilters,
  pagina: Pagina
): Promise<Paginado<Alumno>> {
  const where = condicionesAlumnos(filters);

  return paginarEnSql(
    pagina,
    (limit, offset) =>
      db
        .select()
        .from(alumnos)
        .where(where)
        .orderBy(asc(alumnos.apellido), asc(alumnos.nombre))
        .limit(limit)
        .offset(offset),
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
