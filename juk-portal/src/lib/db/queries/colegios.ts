import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  colegios,
  colegioDocumentoConfig,
  type Colegio,
  type NewColegio,
} from "@/lib/db/schema/colegios";
import {
  ColegioNotFoundError,
  configDocumentalEfectiva,
  DOCUMENTOS_PROGRAMA,
  type ColegioFilters,
  type ConfigDocumental,
  type DocumentoPrograma,
  type RequisitoDocumento,
} from "@/lib/domain/colegios";

import { unicaFila } from "./errors";

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
  return unicaFila(rows, "colegios");
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

// --- Config documental por colegio (US-05b) ---

/** Config efectiva del colegio: defaults del dominio + overrides persistidos. */
export async function getConfigDocumental(colegioId: string): Promise<ConfigDocumental> {
  const rows = await db
    .select()
    .from(colegioDocumentoConfig)
    .where(eq(colegioDocumentoConfig.colegioId, colegioId));

  const overrides: Partial<ConfigDocumental> = {};
  for (const row of rows) {
    overrides[row.documento as DocumentoPrograma] = row.requisito as RequisitoDocumento;
  }
  return configDocumentalEfectiva(overrides);
}

/** Upsert de las 5 filas de config (explícitas, auditables con fecha/usuario). */
export async function upsertConfigDocumental(
  colegioId: string,
  config: ConfigDocumental,
  updatedBy: string
): Promise<void> {
  for (const documento of DOCUMENTOS_PROGRAMA) {
    await db
      .insert(colegioDocumentoConfig)
      .values({ colegioId, documento, requisito: config[documento], updatedBy })
      .onConflictDoUpdate({
        target: [colegioDocumentoConfig.colegioId, colegioDocumentoConfig.documento],
        set: { requisito: config[documento], updatedAt: new Date(), updatedBy },
      });
  }
}
