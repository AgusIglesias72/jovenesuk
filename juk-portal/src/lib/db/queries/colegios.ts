import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { colegios, type Colegio, type NewColegio } from "@/lib/db/schema/colegios";
import { ColegioNotFoundError, type ColegioFilters } from "@/lib/domain/colegios";

export async function listColegios(filters: ColegioFilters = {}): Promise<Colegio[]> {
  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const match = or(ilike(colegios.nombre, like), ilike(colegios.ciudad, like));
    if (match) conditions.push(match);
  }
  if (filters.tipo) conditions.push(eq(colegios.tipo, filters.tipo));
  if (filters.pais) conditions.push(eq(colegios.pais, filters.pais));

  // Por defecto el listado muestra solo activos; el toggle "incluir inactivos" los suma.
  if (!filters.incluirInactivos) {
    conditions.push(eq(colegios.estado, "activo"));
  }

  return db
    .select()
    .from(colegios)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(colegios.nombre));
}

export async function getColegioById(id: string): Promise<Colegio | null> {
  const rows = await db.select().from(colegios).where(eq(colegios.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createColegio(data: NewColegio): Promise<Colegio> {
  const rows = await db.insert(colegios).values(data).returning();
  return rows[0]!;
}

export async function updateColegio(
  id: string,
  data: Partial<NewColegio>
): Promise<Colegio> {
  const rows = await db
    .update(colegios)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(colegios.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new ColegioNotFoundError(id);
  return row;
}

export async function setColegioEstado(
  id: string,
  estado: Colegio["estado"]
): Promise<Colegio> {
  const rows = await db
    .update(colegios)
    .set({ estado, updatedAt: new Date() })
    .where(eq(colegios.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new ColegioNotFoundError(id);
  return row;
}
