"use client";

import { usePathname } from "next/navigation";
import {
  AppShell,
  SidebarLogo,
  SidebarNavSection,
  SidebarNavItem,
  SidebarUserChip,
  Breadcrumb,
} from "@/components/ui";

/**
 * AdminShell — composes AppShell with the JUK navigation tree.
 *
 * Owns the sidebar nav items, the topbar layout, and the user chip.
 * Pages inside (admin) only need to focus on their content area.
 *
 * Counts (4 alerts, 62 alumnos, etc.) are hardcoded for now — Fase 6
 * replaces them with real data via server-fetched counts.
 */

interface AdminShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  children: React.ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel =
    user.role === "super_admin"
      ? "Super Admin"
      : user.role === "admin_juk"
      ? "Admin JUK"
      : user.role;

  const sidebar = (
    <>
      <SidebarLogo orgName="JUK" subtitle="Portal Interno" />

      <SidebarNavSection title="Operación">
        <SidebarNavItem
          icon={<IconGrid />}
          label="Dashboard"
          href="/dashboard"
          active={pathname === "/dashboard"}
        />
        <SidebarNavItem
          icon={<IconUser />}
          label="Alumnos"
          href="/alumnos"
          active={pathname.startsWith("/alumnos")}
        />
        <SidebarNavItem
          icon={<IconPlane />}
          label="Viajes"
          href="/viajes"
          active={pathname.startsWith("/viajes")}
        />
        <SidebarNavItem
          icon={<IconSchool />}
          label="Colegios"
          href="/colegios"
          active={pathname.startsWith("/colegios")}
        />
        <SidebarNavItem
          icon={<IconUsers />}
          label="Group Leaders"
          href="/group-leaders"
          active={pathname.startsWith("/group-leaders")}
        />
        <SidebarNavItem icon={<IconCard />} label="Pagos" soon />
      </SidebarNavSection>

      {user.role === "super_admin" && (
        <SidebarNavSection title="Administración">
          <SidebarNavItem
            icon={<IconUsers />}
            label="Usuarios"
            href="/usuarios"
            active={pathname.startsWith("/usuarios")}
          />
          <SidebarNavItem icon={<IconGear />} label="Configuración" soon />
        </SidebarNavSection>
      )}

      <SidebarUserChip
        initials={initials || "U"}
        name={user.name}
        role={roleLabel}
      />
    </>
  );

  const topbar = <Breadcrumb items={buildBreadcrumb(pathname)} />;

  return (
    <AppShell sidebar={sidebar} topbar={topbar}>
      {children}
    </AppShell>
  );
}

/* ============================================================
   Breadcrumb derived from pathname
   ============================================================ */

function buildBreadcrumb(pathname: string): { label: string; href?: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Inicio" }];

  const LABEL_MAP: Record<string, string> = {
    dashboard: "Dashboard",
    alumnos: "Alumnos",
    viajes: "Viajes",
    colegios: "Colegios",
    pagos: "Pagos",
    usuarios: "Usuarios",
    configuracion: "Configuración",
  };

  return segments.map((seg, i) => {
    const isLast = i === segments.length - 1;
    return {
      label: LABEL_MAP[seg] ?? seg,
      href: isLast ? undefined : "/" + segments.slice(0, i + 1).join("/"),
    };
  });
}

/* ============================================================
   Inline icons (minimal — replace with lucide-react if preferred)
   ============================================================ */

function IconGrid() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x={2} y={2} width={5} height={5} />
      <rect x={9} y={2} width={5} height={5} />
      <rect x={2} y={9} width={5} height={5} />
      <rect x={9} y={9} width={5} height={5} />
    </svg>
  );
}
function IconUser() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx={8} cy={5} r={3} />
      <path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" />
    </svg>
  );
}
function IconPlane() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M8 1l7 4-7 4-7-4 7-4z" />
      <path d="M1 9l7 4 7-4" />
    </svg>
  );
}
function IconSchool() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M3 4l5-2 5 2v8l-5 2-5-2V4z" />
      <path d="M3 4l5 2 5-2M8 6v8" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x={2} y={3} width={12} height={10} rx={1} />
      <path d="M2 6h12" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx={6} cy={5} r={2.5} />
      <path d="M1 14c0-2.5 2-4 5-4s5 1.5 5 4" />
      <circle cx={11.5} cy={6} r={1.8} opacity={0.6} />
    </svg>
  );
}
function IconGear() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx={8} cy={8} r={3} />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
    </svg>
  );
}
