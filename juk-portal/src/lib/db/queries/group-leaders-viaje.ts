import { and, asc, count, eq, notExists, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { groupLeaders, type GroupLeader } from "@/lib/db/schema/grupos-leaders";
import { groupLeadersViaje, type GroupLeaderViaje } from "@/lib/db/schema/pasos-viaje";

import { unicaFila } from "./errors";

/** Lo único que la UI necesita de un elegible: el label del select y el id. */
export type GroupLeaderElegible = Pick<GroupLeader, "id" | "nombre" | "apellido">;

// Group Leaders que todavía NO están asignados a este viaje: un solo
// round-trip (NOT EXISTS correlacionado) y solo las columnas del select.
export async function groupLeadersElegibles(
  viajeId: string
): Promise<GroupLeaderElegible[]> {
  return db
    .select({
      id: groupLeaders.id,
      nombre: groupLeaders.nombre,
      apellido: groupLeaders.apellido,
    })
    .from(groupLeaders)
    .where(
      notExists(
        db
          .select({ x: sql`1` })
          .from(groupLeadersViaje)
          .where(
            and(
              eq(groupLeadersViaje.groupLeaderId, groupLeaders.id),
              eq(groupLeadersViaje.viajeId, viajeId)
            )
          )
      )
    )
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
// principal por viaje. neon-http no expone db.transaction(), pero db.batch()
// manda los dos updates en UN request dentro de una transacción del servidor:
// nunca queda el viaje sin principal ni con dos.
export async function marcarPrincipal(
  viajeId: string,
  groupLeaderId: string
): Promise<GroupLeaderViaje | null> {
  const [, elegido] = await db.batch([
    db
      .update(groupLeadersViaje)
      .set({ esPrincipal: false })
      .where(eq(groupLeadersViaje.viajeId, viajeId)),
    db
      .update(groupLeadersViaje)
      .set({ esPrincipal: true })
      .where(
        and(
          eq(groupLeadersViaje.viajeId, viajeId),
          eq(groupLeadersViaje.groupLeaderId, groupLeaderId)
        )
      )
      .returning(),
  ]);
  return elegido[0] ?? null;
}
