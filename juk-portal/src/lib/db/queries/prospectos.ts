import { randomBytes } from "node:crypto";

import { and, asc, count, desc, eq, ilike, max, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import type { Colegio } from "@/lib/db/schema/colegios";
import {
  prospectoComunicaciones,
  prospectos,
  type NewProspectoComunicacion,
  type Prospecto,
  type ProspectoComunicacion,
} from "@/lib/db/schema/prospectos";
import {
  PROSPECTO_ESTADOS,
  ProspectoNotFoundError,
  type ProspectoCreateData,
  type ProspectoEstado,
  type ProspectoImportado,
} from "@/lib/domain/prospectos";

import { createColegio } from "./colegios";

type NewProspectoInsert = typeof prospectos.$inferInsert;

export type ListProspectosFilters = {
  q?: string;
  estado?: ProspectoEstado;
  responsableId?: string;
};

export async function listProspectos(
  filters: ListProspectosFilters = {}
): Promise<Prospecto[]> {
  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const match = or(ilike(prospectos.nombre, like), ilike(prospectos.ciudad, like));
    if (match) conditions.push(match);
  }
  if (filters.estado) conditions.push(eq(prospectos.estado, filters.estado));
  if (filters.responsableId) {
    conditions.push(eq(prospectos.responsableId, filters.responsableId));
  }

  return db
    .select()
    .from(prospectos)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(prospectos.estado), asc(prospectos.posicion));
}

export async function getProspectoById(id: string): Promise<Prospecto | null> {
  const rows = await db.select().from(prospectos).where(eq(prospectos.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Todos los prospectos agrupados por estado y ordenados por posición (kanban). */
export async function getProspectosPorEstado(): Promise<
  Record<ProspectoEstado, Prospecto[]>
> {
  const filas = await db
    .select()
    .from(prospectos)
    .orderBy(asc(prospectos.estado), asc(prospectos.posicion));

  const porEstado = Object.fromEntries(
    PROSPECTO_ESTADOS.map((e) => [e, [] as Prospecto[]])
  ) as Record<ProspectoEstado, Prospecto[]>;

  for (const fila of filas) {
    porEstado[fila.estado].push(fila);
  }
  return porEstado;
}

/** Total de prospectos por estado (headers de las columnas del kanban). */
export async function countProspectos(): Promise<Record<ProspectoEstado, number>> {
  const rows = await db
    .select({ estado: prospectos.estado, c: count() })
    .from(prospectos)
    .groupBy(prospectos.estado);

  const totales = Object.fromEntries(
    PROSPECTO_ESTADOS.map((e) => [e, 0])
  ) as Record<ProspectoEstado, number>;

  for (const row of rows) {
    totales[row.estado] = row.c;
  }
  return totales;
}

/** Próxima posición libre al final de la columna de un estado. */
async function siguientePosicion(estado: ProspectoEstado): Promise<number> {
  const [row] = await db
    .select({ maxPos: max(prospectos.posicion) })
    .from(prospectos)
    .where(eq(prospectos.estado, estado));
  return Number(row?.maxPos ?? -1) + 1;
}

export async function createProspecto(
  data: ProspectoCreateData & { createdBy?: string }
): Promise<Prospecto> {
  const { createdBy, ...rest } = data;
  const posicion = await siguientePosicion(rest.estado);

  const rows = await db
    .insert(prospectos)
    .values({
      ...rest,
      posicion,
      unsubscribeToken: randomBytes(16).toString("hex"),
      createdBy,
    })
    .returning();
  return rows[0]!;
}

/**
 * Inserta N prospectos importados (todos en "nuevo") con posiciones incrementales
 * al final de esa columna. neon-http no soporta transacciones: es un único insert
 * con múltiples filas. Devuelve la cantidad creada.
 */
export async function crearProspectosMasivo(
  filas: ProspectoImportado[],
  userId?: string
): Promise<number> {
  if (filas.length === 0) return 0;

  const base = await siguientePosicion("nuevo");

  const values = filas.map((fila, i) => ({
    nombre: fila.nombre,
    estado: "nuevo" as const,
    posicion: base + i,
    pais: fila.pais,
    ciudad: fila.ciudad,
    sitioWeb: fila.sitioWeb,
    ubicacionUrl: fila.ubicacionUrl,
    emails: fila.emails,
    telefonos: fila.telefonos,
    contactoNombre: fila.contactoNombre,
    contactoCargo: fila.contactoCargo,
    fuente: fila.fuente,
    notas: fila.notas,
    unsubscribeToken: randomBytes(16).toString("hex"),
    createdBy: userId,
  }));

  const inserted = await db.insert(prospectos).values(values).returning({ id: prospectos.id });
  return inserted.length;
}

export async function updateProspecto(
  id: string,
  data: Partial<Omit<NewProspectoInsert, "id" | "createdAt" | "createdBy">>
): Promise<Prospecto> {
  const rows = await db
    .update(prospectos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(prospectos.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new ProspectoNotFoundError(id);
  return row;
}

export async function moverProspecto(
  id: string,
  estado: ProspectoEstado,
  posicion: number
): Promise<Prospecto> {
  const rows = await db
    .update(prospectos)
    .set({ estado, posicion, updatedAt: new Date() })
    .where(eq(prospectos.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new ProspectoNotFoundError(id);
  return row;
}

/** Reasigna posicion=index a cada id en orden. Updates secuenciales (sin tx). */
export async function reordenarColumna(
  estado: ProspectoEstado,
  orderedIds: string[]
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]!;
    await db
      .update(prospectos)
      .set({ estado, posicion: i, updatedAt: new Date() })
      .where(eq(prospectos.id, id));
  }
}

export async function getComunicaciones(
  prospectoId: string
): Promise<ProspectoComunicacion[]> {
  return db
    .select()
    .from(prospectoComunicaciones)
    .where(eq(prospectoComunicaciones.prospectoId, prospectoId))
    .orderBy(desc(prospectoComunicaciones.createdAt));
}

export async function registrarComunicacion(
  data: NewProspectoComunicacion
): Promise<ProspectoComunicacion> {
  const rows = await db.insert(prospectoComunicaciones).values(data).returning();
  return rows[0]!;
}

/**
 * Convierte un prospecto en colegio cliente: crea el colegio, marca el prospecto
 * como "ganado" con su colegioId y deja rastro en la bitácora. Secuencial (sin tx).
 */
export async function convertirAColegio(
  prospectoId: string,
  userId?: string
): Promise<{ colegio: Colegio; prospecto: Prospecto }> {
  const prospecto = await getProspectoById(prospectoId);
  if (!prospecto) throw new ProspectoNotFoundError(prospectoId);

  const contacto = {
    nombre: prospecto.contactoNombre || prospecto.nombre,
    email: prospecto.emails[0] ?? "",
    telefono: prospecto.telefonos[0],
  };

  const colegio = await createColegio({
    nombre: prospecto.nombre,
    tipo: "cliente",
    pais: prospecto.pais ?? "otro",
    ciudad: prospecto.ciudad ?? "",
    contactoAcademico: contacto,
    contactoAdministrativo: contacto,
    cursosDisponibles: [],
    tiposAlojamiento: [],
    tipoEntradaRequerida: "eta",
    sitioWeb: prospecto.sitioWeb,
    notas: prospecto.notas,
    createdBy: userId,
  });

  const prospectoActualizado = await updateProspecto(prospectoId, {
    estado: "ganado",
    colegioId: colegio.id,
  });

  await registrarComunicacion({
    prospectoId,
    tipo: "conversion",
    asunto: "Prospecto convertido a colegio cliente",
    meta: { colegioId: colegio.id },
    creadoPor: userId,
  });

  return { colegio, prospecto: prospectoActualizado };
}

export async function darDeBajaOutreach(prospectoId: string): Promise<Prospecto> {
  return updateProspecto(prospectoId, { suscritoOutreach: false });
}
