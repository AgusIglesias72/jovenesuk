import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  groupLeaders,
  type GroupLeader,
  type NewGroupLeader,
} from "@/lib/db/schema/grupos-leaders";
import { GroupLeaderNotFoundError, type GroupLeaderFilters } from "@/lib/domain/group-leaders";

export async function listGroupLeaders(
  filters: GroupLeaderFilters = {}
): Promise<GroupLeader[]> {
  const conditions: SQL[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    const match = or(
      ilike(groupLeaders.nombre, like),
      ilike(groupLeaders.apellido, like),
      ilike(groupLeaders.email, like)
    );
    if (match) conditions.push(match);
  }
  if (filters.policeCheckEstado) {
    conditions.push(eq(groupLeaders.policeCheckEstado, filters.policeCheckEstado));
  }

  return db
    .select()
    .from(groupLeaders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(groupLeaders.apellido), asc(groupLeaders.nombre));
}

export async function getGroupLeaderById(id: string): Promise<GroupLeader | null> {
  const rows = await db.select().from(groupLeaders).where(eq(groupLeaders.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createGroupLeader(data: NewGroupLeader): Promise<GroupLeader> {
  const rows = await db.insert(groupLeaders).values(data).returning();
  return rows[0]!;
}

export async function updateGroupLeader(
  id: string,
  data: Partial<NewGroupLeader>
): Promise<GroupLeader> {
  const rows = await db
    .update(groupLeaders)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(groupLeaders.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new GroupLeaderNotFoundError(id);
  return row;
}
