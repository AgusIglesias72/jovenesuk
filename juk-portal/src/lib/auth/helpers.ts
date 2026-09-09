import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HOME_BY_ROLE } from "@/lib/routes";
import type { User } from "@/lib/db/schema/users";
import { auth } from "./index";

/**
 * Get the current session on the server.
 * Returns null if no session exists.
 *
 * Memoizada por request con `cache()`: layout + page + server action comparten
 * una sola lectura de sessions+users (sin cookieCache, cada llamada pega a la DB).
 */
export const getSession = cache(async () =>
  auth.api.getSession({
    headers: await headers(),
  })
);

/**
 * Require a valid session, redirecting to /login if not authenticated.
 * Use this in server components and server actions that need auth.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  // Usuario desactivado (isActive=false): se lo bloquea aunque tenga sesión
  // válida. Se borra la sesión del server para que /login no lo rebote de
  // vuelta al portal (loop /login → /dashboard → /login).
  if (session.user.isActive === false) {
    await auth.api.signOut({ headers: await headers() });
    redirect("/login?inactivo=1");
  }
  return session;
}

/**
 * Require a specific role (or one of several).
 * Redirects to the real role's home if the user lacks the required role.
 */
export async function requireRole(roles: User["role"] | User["role"][]) {
  const session = await requireSession();
  const allowed = Array.isArray(roles) ? roles : [roles];
  const rol = session.user.role as User["role"];

  if (!allowed.includes(rol)) {
    // Al home del rol real, para evitar loops admin/familia.
    redirect(rol in HOME_BY_ROLE ? HOME_BY_ROLE[rol] : "/dashboard");
  }
  return session;
}

/**
 * Convenience: require the "familia" role.
 * Used by all familias/ routes (Portal de Familias).
 */
export async function requireFamilia() {
  return requireRole("familia");
}

/**
 * Convenience: require admin_juk or super_admin.
 * Used by all (admin)/ routes.
 */
export async function requireAdminJuk() {
  return requireRole(["admin_juk", "super_admin"]);
}
