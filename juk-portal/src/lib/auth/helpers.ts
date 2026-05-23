import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./index";
import type { User } from "@/lib/db/schema/users";

/**
 * Get the current session on the server.
 * Returns null if no session exists.
 */
export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Require a valid session, redirecting to /login if not authenticated.
 * Use this in server components and server actions that need auth.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  // Usuario desactivado (isActive=false): se lo bloquea aunque tenga sesión válida.
  if (session.user.isActive === false) {
    redirect("/login?inactivo=1");
  }
  return session;
}

/**
 * Require a specific role (or one of several).
 * Throws if the user is authenticated but lacks the required role.
 */
export async function requireRole(roles: User["role"] | User["role"][]) {
  const session = await requireSession();
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!allowed.includes(session.user.role as User["role"])) {
    redirect("/");
  }
  return session;
}

/**
 * Convenience: require admin_juk or super_admin.
 * Used by all (admin)/ routes.
 */
export async function requireAdminJuk() {
  return requireRole(["admin_juk", "super_admin"]);
}
