"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { useScrollLock } from "@/components/ui/use-scroll-lock";
import { cn } from "@/lib/utils/cn";

import { buildBreadcrumb, type Crumb } from "./breadcrumb-labels";
import { LogoutButton } from "./logout-button";

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

const FOCUSABLES =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const hamburguesaRef = useRef<HTMLButtonElement>(null);

  const cerrarDrawer = () => setDrawerOpen(false);
  // El drawer se cierra al tocar un item de nav (onNavigate → cerrarDrawer),
  // igual que el shell de familias; no hace falta un effect sobre pathname.

  // El body se congela con el hook del DS: `overflow: hidden` a secas no frena
  // el scroll-through de iOS.
  useScrollLock(drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const hamburguesa = hamburguesaRef.current;
    drawerRef.current?.querySelector<HTMLElement>(FOCUSABLES)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      // El `inert` del fondo ya se levantó cuando corre esta limpieza.
      hamburguesa?.focus();
    };
  }, [drawerOpen]);

  function atraparFoco(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== "Tab") return;
    const focusables = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLES) ?? []
    );
    const primero = focusables[0];
    const ultimo = focusables[focusables.length - 1];
    if (!primero || !ultimo) return;

    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  return (
    <div className="min-h-screen bg-[var(--c-page)] text-[var(--c-ink)] lg:grid lg:h-screen lg:grid-cols-[264px_1fr] lg:overflow-hidden">
      {/* ---------- Sidebar fija (desktop) ---------- */}
      <aside className="hidden bg-[image:var(--grad-brand)] p-4 text-[var(--c-ink-onbrand)] lg:flex lg:h-screen lg:flex-col">
        <SidebarBody user={user} pathname={pathname} />
      </aside>

      {/* ---------- Header sticky (mobile) ---------- */}
      <div className="sticky top-0 z-30 lg:hidden" inert={drawerOpen}>
        <header className="flex items-center justify-between gap-3 bg-[image:var(--grad-brand)] px-4 py-3 pl-[calc(1rem+var(--safe-left))] pr-[calc(1rem+var(--safe-right))] pt-[calc(0.75rem+var(--safe-top))] text-[var(--c-ink-onbrand)]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-md)] bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)]"
              aria-hidden
            >
              <span className="font-display text-base font-extrabold">J</span>
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[length:var(--t-small)] font-bold text-[var(--c-ink-onbrand)]">
                Jóvenes en UK
              </p>
              <p className="truncate text-[length:var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onbrand-muted)]">
                Portal Interno
              </p>
            </div>
          </div>
          <button
            type="button"
            ref={hamburguesaRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={drawerOpen}
            aria-controls="admin-drawer"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-md)] bg-white/10 text-[var(--c-ink-onbrand)] transition-colors hover:bg-white/15"
          >
            <IconMenu />
          </button>
        </header>
        <div className="border-b border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-2.5 pl-[calc(1rem+var(--safe-left))] pr-[calc(1rem+var(--safe-right))]">
          <Breadcrumb items={buildBreadcrumb(pathname)} />
        </div>
      </div>

      {/* ---------- Drawer de navegación (mobile) ---------- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={cerrarDrawer}
            className="absolute inset-0 touch-none bg-black/50"
          />
          <aside
            id="admin-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navegación"
            onKeyDown={atraparFoco}
            className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col bg-[image:var(--grad-brand)] p-4 pb-[calc(1rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] pt-[calc(1rem+var(--safe-top))] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-3)]"
          >
            <SidebarBody user={user} pathname={pathname} onNavigate={cerrarDrawer} />
          </aside>
        </div>
      )}

      {/* ---------- Contenido ---------- */}
      <main className="lg:flex lg:h-screen lg:flex-col lg:overflow-hidden" inert={drawerOpen}>
        {/* Topbar (desktop) */}
        <div className="hidden items-center gap-4 border-b border-[var(--c-border)] bg-[var(--c-surface)] px-6 py-3 lg:flex">
          <Breadcrumb items={buildBreadcrumb(pathname)} />
        </div>
        <div className="bg-[image:var(--grad-page)] p-4 pb-[calc(1rem+var(--safe-bottom))] sm:p-6 sm:pb-[calc(1.5rem+var(--safe-bottom))] lg:flex-1 lg:overflow-auto lg:pb-6">
          <ConfirmProvider>
            <ToastProvider>{children}</ToastProvider>
          </ConfirmProvider>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   Sidebar body — reutilizado por la sidebar fija (desktop) y
   el drawer (mobile). Logo + secciones + chip del usuario.
   ============================================================ */

function SidebarBody({
  user,
  pathname,
  onNavigate,
}: {
  user: AdminShellProps["user"];
  pathname: string;
  onNavigate?: () => void;
}) {
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
    <>
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

      <div className="scroll-fino scroll-fino-onbrand flex-1 overflow-y-auto overscroll-contain">
        <SidebarSection title="Operación">
          <SidebarItem
            icon={<IconGrid />}
            label="Dashboard"
            href="/dashboard"
            active={pathname === "/dashboard"}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={<IconUser />}
            label="Alumnos"
            href="/alumnos"
            active={pathname.startsWith("/alumnos")}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={<IconPlane />}
            label="Viajes"
            href="/viajes"
            active={pathname.startsWith("/viajes")}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={<IconSchool />}
            label="Colegios"
            href="/colegios"
            active={pathname.startsWith("/colegios")}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={<IconTarget />}
            label="Prospectos"
            href="/prospectos"
            active={pathname.startsWith("/prospectos")}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={<IconUsers />}
            label="Group Leaders"
            href="/group-leaders"
            active={pathname.startsWith("/group-leaders")}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={<IconCard />}
            label="Pagos"
            href="/pagos"
            active={pathname.startsWith("/pagos")}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={<IconInbox />}
            label="Consultas"
            href="/consultas"
            active={pathname.startsWith("/consultas")}
            onNavigate={onNavigate}
          />
          <SidebarItem
            icon={<IconForm />}
            label="Inscripciones"
            href="/inscripciones"
            active={pathname.startsWith("/inscripciones")}
            onNavigate={onNavigate}
          />
        </SidebarSection>

        {user.role === "super_admin" && (
          <SidebarSection title="Administración">
            <SidebarItem
              icon={<IconUsers />}
              label="Usuarios"
              href="/usuarios"
              active={pathname.startsWith("/usuarios")}
              onNavigate={onNavigate}
            />
            <SidebarItem
              icon={<IconGear />}
              label="Configuración"
              href="/configuracion"
              active={pathname.startsWith("/configuracion")}
              onNavigate={onNavigate}
            />
          </SidebarSection>
        )}
      </div>

      {/* User chip — fuera del área scrolleable: siempre visible */}
      <div className="mt-3 flex items-center gap-3 rounded-[var(--r-lg)] bg-white/10 p-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] text-[length:var(--t-label)] font-extrabold text-[var(--c-ink-onaccent)]"
          aria-hidden
        >
          {initials || "U"}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[length:var(--t-small)] font-bold text-[var(--c-ink-onbrand)]">
            {user.name}
          </p>
          <p className="mt-0.5 truncate text-[length:var(--t-label)] text-[var(--c-ink-onbrand-muted)]">
            {roleLabel}
          </p>
        </div>
        <LogoutButton />
      </div>
    </>
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
  onNavigate?: () => void;
}

function SidebarItem({ icon, label, href, active, soon, onNavigate }: SidebarItemProps) {
  if (soon) {
    return (
      <div
        className="flex min-h-[var(--tap)] w-full cursor-default select-none items-center gap-3 rounded-[var(--r-pill)] px-4 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand-muted)] opacity-60"
        aria-disabled="true"
      >
        <span className="h-4 w-4 flex-shrink-0 opacity-80">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className="rounded-[var(--r-pill)] bg-white/10 px-2 py-0.5 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onbrand-muted)]">
          Pronto
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href ?? "/dashboard"}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[var(--tap)] w-full items-center gap-3 rounded-[var(--r-pill)] px-4 text-[length:var(--t-small)] transition-colors duration-150",
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

function Breadcrumb({ items }: { items: Crumb[] }) {
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
   Inline icons (minimal — replace with lucide-react if preferred)
   ============================================================ */

function IconMenu() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </svg>
  );
}
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
function IconTarget() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx={8} cy={8} r={6} />
      <circle cx={8} cy={8} r={3} />
      <circle cx={8} cy={8} r={0.6} fill="currentColor" />
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
function IconInbox() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M2 9l2-6h8l2 6M2 9v4h12V9M2 9h3l1 2h4l1-2h3" />
    </svg>
  );
}
function IconForm() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x={3} y={2} width={10} height={12} rx={1} />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
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
