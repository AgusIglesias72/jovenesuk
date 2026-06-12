import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { groupLeaders, type GroupLeader } from "@/lib/db/schema/grupos-leaders";
import { groupLeadersViaje, pasosViaje, type PasoViaje } from "@/lib/db/schema/pasos-viaje";
import {
  PASO_VIAJE_TIPOS,
  PasoViajeNotFoundError,
  type PasoViajeEstado,
  type PasoViajeTipo,
} from "@/lib/domain/pasos-viaje";

/** Los 5 pasos del viaje. Si faltan filas (viaje nuevo), las crea en "pendiente". */
export async function listOrInitPasosViaje(viajeId: string): Promise<PasoViaje[]> {
  const existentes = await db.select().from(pasosViaje).where(eq(pasosViaje.viajeId, viajeId));
  const tiposExistentes = new Set(existentes.map((p) => p.tipo));
  const faltantes = PASO_VIAJE_TIPOS.filter((t) => !tiposExistentes.has(t));

  if (faltantes.length === 0) return existentes;

  await db
    .insert(pasosViaje)
    .values(faltantes.map((tipo) => ({ viajeId, tipo })))
    .onConflictDoNothing();

  return db.select().from(pasosViaje).where(eq(pasosViaje.viajeId, viajeId));
}

export async function updateEstadoPasoViaje(
  viajeId: string,
  tipo: PasoViajeTipo,
  estado: PasoViajeEstado,
  updatedBy: string
): Promise<PasoViaje> {
  const rows = await db
    .update(pasosViaje)
    .set({ estado, updatedAt: new Date(), updatedBy })
    .where(and(eq(pasosViaje.viajeId, viajeId), eq(pasosViaje.tipo, tipo)))
    .returning();
  const row = rows[0];
  if (!row) throw new PasoViajeNotFoundError(viajeId, tipo);
  return row;
}

export async function updateMetadataPasoViaje(
  viajeId: string,
  tipo: PasoViajeTipo,
  metadata: Record<string, unknown>,
  updatedBy: string
): Promise<PasoViaje> {
  const rows = await db
    .update(pasosViaje)
    .set({ metadata, updatedAt: new Date(), updatedBy })
    .where(and(eq(pasosViaje.viajeId, viajeId), eq(pasosViaje.tipo, tipo)))
    .returning();
  const row = rows[0];
  if (!row) throw new PasoViajeNotFoundError(viajeId, tipo);
  return row;
}

export type GroupLeaderDeViaje = {
  groupLeaderId: string;
  nombre: string;
  apellido: string;
  esPrincipal: boolean;
  policeCheckEstado: GroupLeader["policeCheckEstado"];
  policeCheckFechaVencimiento: Date | null;
};

/** Group Leaders asignados al viaje, con sus datos de police check (para el paso 5). */
export async function listGroupLeadersDeViaje(viajeId: string): Promise<GroupLeaderDeViaje[]> {
  return db
    .select({
      groupLeaderId: groupLeaders.id,
      nombre: groupLeaders.nombre,
      apellido: groupLeaders.apellido,
      esPrincipal: groupLeadersViaje.esPrincipal,
      policeCheckEstado: groupLeaders.policeCheckEstado,
      policeCheckFechaVencimiento: groupLeaders.policeCheckFechaVencimiento,
    })
    .from(groupLeadersViaje)
    .innerJoin(groupLeaders, eq(groupLeadersViaje.groupLeaderId, groupLeaders.id))
    .where(eq(groupLeadersViaje.viajeId, viajeId))
    .orderBy(asc(groupLeaders.apellido), asc(groupLeaders.nombre));
}
