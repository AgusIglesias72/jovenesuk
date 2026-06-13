import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { colegios } from "@/lib/db/schema/colegios";
import { viajes, type NewViaje, type Viaje } from "@/lib/db/schema/viajes";
import { ViajeNotFoundError, type ViajeFilters } from "@/lib/domain/viajes";

export type ViajeListItem = Viaje & { colegioDestinoNombre: string | null };

export async function listViajes(filters: ViajeFilters = {}): Promise<ViajeListItem[]> {
  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const match = or(ilike(viajes.codigo, like), ilike(viajes.nombre, like));
    if (match) conditions.push(match);
  }
  if (filters.estado) conditions.push(eq(viajes.estado, filters.estado));
  if (filters.origen) conditions.push(eq(viajes.origen, filters.origen));
  if (filters.tipo) conditions.push(eq(viajes.tipo, filters.tipo));

  const rows = await db
    .select({ viaje: viajes, colegioDestinoNombre: colegios.nombre })
    .from(viajes)
    .leftJoin(colegios, eq(viajes.colegioDestinoId, colegios.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(viajes.fechaInicio));

  return rows.map((r) => ({ ...r.viaje, colegioDestinoNombre: r.colegioDestinoNombre }));
}

export async function getViajeById(id: string): Promise<Viaje | null> {
  const rows = await db.select().from(viajes).where(eq(viajes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getViajeByCodigo(codigo: string): Promise<Viaje | null> {
  const rows = await db.select().from(viajes).where(eq(viajes.codigo, codigo)).limit(1);
  return rows[0] ?? null;
}

export async function createViaje(data: NewViaje): Promise<Viaje> {
  const rows = await db.insert(viajes).values(data).returning();
  return rows[0]!;
}

export async function updateViaje(
  id: string,
  data: Partial<NewViaje>
): Promise<Viaje> {
  const rows = await db
    .update(viajes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(viajes.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new ViajeNotFoundError(id);
  return row;
}

export async function setViajeEstado(
  id: string,
  estado: Viaje["estado"]
): Promise<Viaje> {
  const rows = await db
    .update(viajes)
    .set({ estado, updatedAt: new Date() })
    .where(eq(viajes.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new ViajeNotFoundError(id);
  return row;
}
