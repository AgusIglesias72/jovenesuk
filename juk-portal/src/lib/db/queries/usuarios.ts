import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema/users";
import { UsuarioNotFoundError } from "@/lib/domain/usuarios";

export type UsuarioListItem = Pick<User, "id" | "name" | "email" | "role" | "isActive">;

export async function listUsuarios(): Promise<UsuarioListItem[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(inArray(users.role, ["admin_juk", "super_admin"]))
    .orderBy(asc(users.name));
}

/** Emails de los admins activos — destinatarios de los avisos internos. */
export async function listEmailsAdmins(): Promise<string[]> {
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(
      and(inArray(users.role, ["admin_juk", "super_admin"]), eq(users.isActive, true))
    );
  return rows.map((r) => r.email);
}

export async function getUsuarioById(id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

// Tras crear el usuario con Better-Auth, fija su rol y lo marca verificado
// (puede loguearse directo con la password temporal).
export async function finalizarAltaUsuario(
  email: string,
  role: User["role"]
): Promise<void> {
  await db
    .update(users)
    .set({ role, emailVerified: true, updatedAt: new Date() })
    .where(eq(users.email, email));
}

export async function setUsuarioRole(id: string, role: User["role"]): Promise<User> {
  const rows = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new UsuarioNotFoundError(id);
  return row;
}

export async function setUsuarioActivo(id: string, isActive: boolean): Promise<User> {
  const rows = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new UsuarioNotFoundError(id);
  return row;
}
