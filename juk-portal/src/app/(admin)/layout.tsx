import { requireAdminJuk } from "@/lib/auth/helpers";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * (admin) route group layout.
 *
 * Wraps all admin pages in the AdminShell (sidebar + topbar + drawer mobile).
 * Server-side auth check happens here — any page under (admin)/ requires
 * admin_juk or super_admin. Without a session it redirects to /login; with
 * another role, to that role's home (HOME_BY_ROLE in src/lib/routes.ts).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminJuk();

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
