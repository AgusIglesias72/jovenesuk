import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm";

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
import {
  paginarEnSql,
  totalDe,
  type Pagina,
  type Paginado,
} from "@/lib/utils/paginate";

import { unicaFila } from "./errors";

function condicionesColegios(filters: ColegioFilters): SQL | undefined {
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

  return conditions.length ? and(...conditions) : undefined;
}

/**
 * Sin paginar: alimenta los combos de colegio destino/cliente del alta y la
 * edición de viajes, que necesitan todas las opciones. El listado del ABM usa
 * `listColegiosPaginado`.
 */
export async function listColegios(filters: ColegioFilters = {}): Promise<Colegio[]> {
  return db
    .select()
    .from(colegios)
    .where(condicionesColegios(filters))
    .orderBy(asc(colegios.nombre));
}

export async function listColegiosPaginado(
  filters: ColegioFilters,
  pagina: Pagina
): Promise<Paginado<Colegio>> {
  const where = condicionesColegios(filters);

  return paginarEnSql(
    pagina,
    (limit, offset) =>
      db
        .select()
        .from(colegios)
        .where(where)
        .orderBy(asc(colegios.nombre))
        .limit(limit)
        .offset(offset),
    () => db.select({ n: count() }).from(colegios).where(where).then(totalDe)
  );
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

/**
 * Upsert de las 5 filas de config (explícitas, auditables con fecha/usuario).
 * Un solo INSERT multi-fila: el `set` toma el requisito de la fila entrante
 * (`excluded`), que es la única forma de que cada fila reciba el suyo.
 */
export async function upsertConfigDocumental(
  colegioId: string,
  config: ConfigDocumental,
  updatedBy: string
): Promise<void> {
  await db
    .insert(colegioDocumentoConfig)
    .values(
      DOCUMENTOS_PROGRAMA.map((documento) => ({
        colegioId,
        documento,
        requisito: config[documento],
        updatedBy,
      }))
    )
    .onConflictDoUpdate({
      target: [colegioDocumentoConfig.colegioId, colegioDocumentoConfig.documento],
      set: { requisito: sql`excluded.requisito`, updatedAt: new Date(), updatedBy },
    });
}
