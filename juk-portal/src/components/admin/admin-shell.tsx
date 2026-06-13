"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * AdminShell — authenticated layout following the STUDIO direction.
 *
 * Owns the sidebar nav items, the topbar layout, and the user chip.
 * Pages inside (admin) only need to focus on their content area.
 *
 * Visual: deep-teal gradient sidebar (--grad-brand) with pill nav items,
 * uppercase section labels and the user chip pinned to the bottom; clean
 * surface topbar with breadcrumb; warm page gradient behind the content.
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

  return (
    <div className="grid h-screen grid-cols-[264px_1fr] overflow-hidden bg-[var(--c-page)]">
      {/* Sidebar fijo: alto = pantalla; la nav scrollea adentro y el chip del
          usuario queda siempre visible abajo. */}
      <aside className="flex h-screen flex-col bg-[image:var(--grad-brand)] p-4 text-[var(--c-ink-onbrand)]">
        {/* Logo */}
        <div className="mb-7 flex items-center gap-3 px-2 pt-1">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-md)] bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)]"
            aria-hidden
          >
            <span className="font-display text-lg font-extrabold">J</span>
          </span>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-bold text-[var(--c-ink-onbrand)]">
              Jóvenes en UK
            </p>
            <p className="mt-0.5 text-[length:var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onbrand-muted)]">
              Portal Interno
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
        <SidebarSection title="Operación">
          <SidebarItem
            icon={<IconGrid />}
            label="Dashboard"
            href="/dashboard"
            active={pathname === "/dashboard"}
          />
          <SidebarItem
            icon={<IconUser />}
            label="Alumnos"
            href="/alumnos"
            active={pathname.startsWith("/alumnos")}
          />
          <SidebarItem
            icon={<IconPlane />}
            label="Viajes"
            href="/viajes"
            active={pathname.startsWith("/viajes")}
          />
          <SidebarItem
            icon={<IconSchool />}
            label="Colegios"
            href="/colegios"
            active={pathname.startsWith("/colegios")}
          />
          <SidebarItem
            icon={<IconUsers />}
            label="Group Leaders"
            href="/group-leaders"
            active={pathname.startsWith("/group-leaders")}
          />
          <SidebarItem
            icon={<IconCard />}
            label="Pagos"
            href="/pagos"
            active={pathname.startsWith("/pagos")}
          />
        </SidebarSection>

        {user.role === "super_admin" && (
          <SidebarSection title="Administración">
            <SidebarItem
              icon={<IconUsers />}
              label="Usuarios"
              href="/usuarios"
              active={pathname.startsWith("/usuarios")}
            />
            <SidebarItem
              icon={<IconGear />}
              label="Configuración"
              href="/configuracion"
              active={pathname.startsWith("/configuracion")}
            />
            <SidebarItem
              icon={<IconFlask />}
              label="Tests"
              href="/tests"
              active={pathname.startsWith("/tests")}
            />
          </SidebarSection>
        )}
        </div>

        {/* User chip — fuera del área scrolleable: siempre visible */}
        <div className="mt-3 flex items-center gap-3 rounded-[var(--r-lg)] bg-white/10 p-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] text-[11px] font-extrabold text-[var(--c-ink-onaccent)]"
            aria-hidden
          >
            {initials || "U"}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[length:var(--t-small)] font-bold text-[var(--c-ink-onbrand)]">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-[length:var(--t-label)] text-[var(--c-ink-onbrand-muted)]">
              {roleLabel}
            </p>
          </div>
        </div>
      </aside>

      <main className="flex h-screen flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center gap-4 border-b border-[var(--c-border)] bg-[var(--c-surface)] px-6 py-3">
          <Breadcrumb items={buildBreadcrumb(pathname)} />
        </div>
        <div className="flex-1 overflow-auto bg-[image:var(--grad-page)] p-6">
          <ConfirmProvider>
            <ToastProvider>{children}</ToastProvider>
          </ConfirmProvider>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   Sidebar parts (STUDIO)
   ============================================================ */

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-4 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onbrand-muted)]">
        {title}
      </p>
      <nav className="space-y-1">{children}</nav>
    </div>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  soon?: boolean;
}

function SidebarItem({ icon, label, href, active, soon }: SidebarItemProps) {
  if (soon) {
    return (
      <div
        className="flex min-h-[42px] w-full cursor-default select-none items-center gap-3 rounded-[var(--r-pill)] px-4 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand-muted)] opacity-60"
        aria-disabled="true"
      >
        <span className="h-4 w-4 flex-shrink-0 opacity-80">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className="rounded-[var(--r-pill)] bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onbrand-muted)]">
          Pronto
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href ?? "/dashboard"}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[42px] w-full items-center gap-3 rounded-[var(--r-pill)] px-4 text-[length:var(--t-small)] transition-colors duration-150",
        active
          ? "bg-white/10 font-bold text-[var(--c-ink-onbrand)]"
          : "font-semibold text-[var(--c-ink-onbrand-muted)] hover:bg-white/5 hover:text-[var(--c-ink-onbrand)]"
      )}
    >
      <span
        className={cn(
          "h-4 w-4 flex-shrink-0",
          active ? "text-[var(--c-accent-300)]" : "opacity-80"
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {active && (
        <span
          className="h-1.5 w-1.5 rounded-[var(--r-pill)] bg-[var(--c-accent)]"
          aria-hidden
        />
      )}
    </Link>
  );
}

/* ============================================================
   Topbar breadcrumb (STUDIO)
   ============================================================ */

function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav
      className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]"
      aria-label="Breadcrumb"
    >
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i}>
            {it.href && !isLast ? (
              <Link
                href={it.href}
                className="transition-colors hover:text-[var(--c-brand)]"
              >
                {it.label}
              </Link>
            ) : (
              <span className={isLast ? "font-semibold text-[var(--c-ink)]" : ""}>
                {it.label}
              </span>
            )}
            {!isLast && (
              <span className="mx-1.5 opacity-50" aria-hidden>
                ›
              </span>
            )}
          </span>
        );
      })}
    </nav>
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
    tests: "Tests",
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
function IconFlask() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M6 1.5h4M6.5 1.5v4L3 12a1.5 1.5 0 0 0 1.3 2.3h7.4A1.5 1.5 0 0 0 13 12L9.5 5.5v-4" />
      <path d="M5 9.5h6" />
    </svg>
  );
}
