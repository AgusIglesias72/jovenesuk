import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { colegios } from "@/lib/db/schema/colegios";
import { viajes, type NewViaje, type Viaje } from "@/lib/db/schema/viajes";
import { ViajeNotFoundError, type ViajeFilters } from "@/lib/domain/viajes";
import {
  paginarEnSql,
  totalDe,
  type Pagina,
  type Paginado,
} from "@/lib/utils/paginate";

import { unicaFila } from "./errors";

export type ViajeListItem = Viaje & { colegioDestinoNombre: string | null };

function condicionesViajes(filters: ViajeFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const match = or(ilike(viajes.codigo, like), ilike(viajes.nombre, like));
    if (match) conditions.push(match);
  }
  if (filters.estado) conditions.push(eq(viajes.estado, filters.estado));
  if (filters.origen) conditions.push(eq(viajes.origen, filters.origen));
  if (filters.tipo) conditions.push(eq(viajes.tipo, filters.tipo));

  return conditions.length ? and(...conditions) : undefined;
}

export async function listViajes(
  filters: ViajeFilters,
  pagina: Pagina
): Promise<Paginado<ViajeListItem>> {
  const where = condicionesViajes(filters);

  return paginarEnSql(
    pagina,
    async (limit, offset) => {
      const rows = await db
        .select({ viaje: viajes, colegioDestinoNombre: colegios.nombre })
        .from(viajes)
        .leftJoin(colegios, eq(viajes.colegioDestinoId, colegios.id))
        .where(where)
        .orderBy(desc(viajes.fechaInicio))
        .limit(limit)
        .offset(offset);
      return rows.map((r) => ({ ...r.viaje, colegioDestinoNombre: r.colegioDestinoNombre }));
    },
    // El leftJoin solo resuelve el nombre del colegio destino (FK → PK, no
    // multiplica filas) y ningún filtro lo toca: contar `viajes` alcanza.
    () => db.select({ n: count() }).from(viajes).where(where).then(totalDe)
  );
}

export async function listViajesPorEstado(estados: Viaje["estado"][]): Promise<Viaje[]> {
  if (estados.length === 0) return [];
  return db.select().from(viajes).where(inArray(viajes.estado, estados));
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
  return unicaFila(rows, "viajes");
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
