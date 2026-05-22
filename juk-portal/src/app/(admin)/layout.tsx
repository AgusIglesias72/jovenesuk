import { requireAdminJuk } from "@/lib/auth/helpers";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * (admin) route group layout.
 *
 * Wraps all admin pages in the JUK AppShell (sidebar + topbar).
 * Server-side auth check happens here — any page under (admin)/ requires
 * admin_juk or super_admin role, or redirects to /login.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminJuk();

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
