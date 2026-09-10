import { and, asc, count, desc, eq, gte, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { colegios } from "@/lib/db/schema/colegios";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
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

/** Fila del listado de viajes (US-12): suma los inscriptos para "inscriptos / cupo". */
export type ViajeFila = ViajeListItem & { inscriptos: number };

/**
 * Mismo criterio de "inscripto" que el cupo del detalle y de la asignación
 * (`countAsignacionesActivas` / `listAsignacionesByViaje`): ocupa lugar toda
 * asignación que no esté cancelada. Si cambia allá, cambia acá.
 */
const ocupaCupo = () => ne(asignaciones.estado, "cancelada");

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
  if (filters.pais) conditions.push(eq(viajes.paisDestino, filters.pais));
  if (filters.colegioDestinoId) {
    conditions.push(eq(viajes.colegioDestinoId, filters.colegioDestinoId));
  }
  if (filters.anio !== undefined) {
    // Rango sobre la columna `date` en vez de extract(year): se puede indexar y
    // no depende de la zona horaria del servidor.
    conditions.push(gte(viajes.fechaInicio, new Date(Date.UTC(filters.anio, 0, 1))));
    conditions.push(lt(viajes.fechaInicio, new Date(Date.UTC(filters.anio + 1, 0, 1))));
  }

  return conditions.length ? and(...conditions) : undefined;
}

export async function listViajes(
  filters: ViajeFilters,
  pagina: Pagina
): Promise<Paginado<ViajeFila>> {
  const where = condicionesViajes(filters);

  return paginarEnSql(
    pagina,
    async (limit, offset) => {
      const rows = await db
        .select({
          viaje: viajes,
          colegioDestinoNombre: colegios.nombre,
          // Subquery correlacionada (usa idx_asignaciones_viaje): no multiplica
          // filas, así que la paginación y el count siguen siendo sobre `viajes`.
          inscriptos: db.$count(
            asignaciones,
            and(eq(asignaciones.viajeId, viajes.id), ocupaCupo())
          ),
        })
        .from(viajes)
        .leftJoin(colegios, eq(viajes.colegioDestinoId, colegios.id))
        .where(where)
        .orderBy(desc(viajes.fechaInicio))
        .limit(limit)
        .offset(offset);
      return rows.map((r) => ({
        ...r.viaje,
        colegioDestinoNombre: r.colegioDestinoNombre,
        inscriptos: r.inscriptos,
      }));
    },
    // El leftJoin solo resuelve el nombre del colegio destino (FK → PK, no
    // multiplica filas) y los filtros son todos sobre columnas de `viajes`.
    () => db.select({ n: count() }).from(viajes).where(where).then(totalDe)
  );
}

export type OpcionesFiltroViajes = {
  anios: number[];
  colegios: { id: string; nombre: string }[];
};

/**
 * Opciones de los filtros del listado: solo años y colegios destino que
 * tienen viajes, para que ningún filtro lleve a una tabla vacía por diseño.
 */
export async function opcionesFiltroViajes(): Promise<OpcionesFiltroViajes> {
  const [fechas, destinos] = await Promise.all([
    db.selectDistinct({ fechaInicio: viajes.fechaInicio }).from(viajes),
    db
      .selectDistinct({ id: colegios.id, nombre: colegios.nombre })
      .from(viajes)
      .innerJoin(colegios, eq(viajes.colegioDestinoId, colegios.id))
      .orderBy(asc(colegios.nombre)),
  ]);

  const anios = [...new Set(fechas.map((f) => f.fechaInicio.getUTCFullYear()))].sort(
    (a, b) => b - a
  );
  return { anios, colegios: destinos };
}

export type ViajeOpcion = Pick<Viaje, "id" | "codigo" | "nombre">;

/** Combo "viaje" de otros listados (alumnos): todos, los más nuevos primero. */
export async function listViajesParaFiltro(): Promise<ViajeOpcion[]> {
  return db
    .select({ id: viajes.id, codigo: viajes.codigo, nombre: viajes.nombre })
    .from(viajes)
    .orderBy(desc(viajes.fechaInicio));
}

export type CompletitudViaje = {
  /** Asignaciones activas del viaje (cada una es un alumno con tablero). */
  inscriptos: number;
  /** De esas, cuántas tienen todos sus pasos computables completados. */
  completos: number;
};

/**
 * % de trámites completos por viaje (US-DX-02). Mismo cálculo que el dashboard
 * (`getProximosViajesConOcupacion`), extraído para el header del detalle.
 *
 * Se agrega en SQL (una fila por asignación, no una por paso). WHY del
 * predicado: replica cuentaParaCompletitud() de domain/pasos/estados.ts — un
 * paso cuenta si no es "na" y no quedó marcado opcional. `-> 'opcional'` (json,
 * no ->>) para que solo el booleano true cuente como opcional, igual que el
 * `=== true` del dominio.
 */
export async function completitudPorViaje(
  viajeIds: string[]
): Promise<Map<string, CompletitudViaje>> {
  const porViaje = new Map<string, CompletitudViaje>();
  if (viajeIds.length === 0) return porViaje;

  const cuentaParaCompletitud = sql`${pasosAlumno.estado} <> 'na' and coalesce((${pasosAlumno.metadata} -> 'opcional')::text, 'false') <> 'true'`;

  // LEFT JOIN: una asignación sin pasos suma como inscripto con total 0.
  const porAsignacion = await db
    .select({
      viajeId: asignaciones.viajeId,
      total: sql<number>`count(*) filter (where ${cuentaParaCompletitud})`.mapWith(Number),
      completos:
        sql<number>`count(*) filter (where ${cuentaParaCompletitud} and ${pasosAlumno.estado} = 'completado')`.mapWith(
          Number
        ),
    })
    .from(asignaciones)
    .leftJoin(pasosAlumno, eq(pasosAlumno.asignacionId, asignaciones.id))
    .where(and(eq(asignaciones.estado, "activa"), inArray(asignaciones.viajeId, viajeIds)))
    .groupBy(asignaciones.viajeId, asignaciones.id);

  for (const f of porAsignacion) {
    const acc = porViaje.get(f.viajeId) ?? { inscriptos: 0, completos: 0 };
    acc.inscriptos += 1;
    if (f.total > 0 && f.completos === f.total) acc.completos += 1;
    porViaje.set(f.viajeId, acc);
  }
  return porViaje;
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
