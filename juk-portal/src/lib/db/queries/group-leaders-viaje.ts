import { and, asc, count, eq, notInArray, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { groupLeaders, type GroupLeader } from "@/lib/db/schema/grupos-leaders";
import { groupLeadersViaje, type GroupLeaderViaje } from "@/lib/db/schema/pasos-viaje";

import { unicaFila } from "./errors";

// Group Leaders que todavía NO están asignados a este viaje.
export async function groupLeadersElegibles(viajeId: string): Promise<GroupLeader[]> {
  const yaAsignados = await db
    .select({ groupLeaderId: groupLeadersViaje.groupLeaderId })
    .from(groupLeadersViaje)
    .where(eq(groupLeadersViaje.viajeId, viajeId));
  const ids = yaAsignados.map((g) => g.groupLeaderId);

  const conds: SQL[] = [];
  if (ids.length) conds.push(notInArray(groupLeaders.id, ids));

  return db
    .select()
    .from(groupLeaders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(groupLeaders.apellido), asc(groupLeaders.nombre));
}

export async function countGroupLeadersDeViaje(viajeId: string): Promise<number> {
  const rows = await db
    .select({ c: count() })
    .from(groupLeadersViaje)
    .where(eq(groupLeadersViaje.viajeId, viajeId));
  return rows[0]?.c ?? 0;
}

// Inserta la relación GL↔viaje. La unique (viajeId, groupLeaderId) garantiza
// que no se duplique; un re-insert choca con 23505 y lo maneja la action.
export async function asignarGroupLeaderAViaje(
  viajeId: string,
  groupLeaderId: string
): Promise<GroupLeaderViaje> {
  const rows = await db
    .insert(groupLeadersViaje)
    .values({ viajeId, groupLeaderId })
    .returning();
  return unicaFila(rows, "group_leaders_viaje");
}

// Relación pura sin estado: se borra la fila (a diferencia del soft-cancel de alumnos).
export async function quitarGroupLeaderDeViaje(
  viajeId: string,
  groupLeaderId: string
): Promise<boolean> {
  const rows = await db
    .delete(groupLeadersViaje)
    .where(
      and(
        eq(groupLeadersViaje.viajeId, viajeId),
        eq(groupLeadersViaje.groupLeaderId, groupLeaderId)
      )
    )
    .returning();
  return rows.length > 0;
}

// Marca un GL como principal del viaje y limpia el flag del resto: solo un
// principal por viaje. El driver neon-http no soporta transacciones (ver
// asignar-alumno.ts), así que lo hacemos en dos updates secuenciales: primero
// limpiamos el flag de todos y después seteamos el elegido.
export async function marcarPrincipal(
  viajeId: string,
  groupLeaderId: string
): Promise<GroupLeaderViaje | null> {
  await db
    .update(groupLeadersViaje)
    .set({ esPrincipal: false })
    .where(eq(groupLeadersViaje.viajeId, viajeId));

  const rows = await db
    .update(groupLeadersViaje)
    .set({ esPrincipal: true })
    .where(
      and(
        eq(groupLeadersViaje.viajeId, viajeId),
        eq(groupLeadersViaje.groupLeaderId, groupLeaderId)
      )
    )
    .returning();
  return rows[0] ?? null;
}
