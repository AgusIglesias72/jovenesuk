"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { LogoutButton } from "./logout-button";

/**
 * FamiliaShell — chrome del Portal de Familias.
 *
 * Replica el lenguaje visual del AdminShell (gradiente de marca, items pill,
 * chip del tutor abajo) pero adaptado al portal del alumno: NO importa el
 * AdminShell (es del back-office). En desktop es una sidebar fija; en mobile
 * un header + una tira de tabs scrolleable.
 */

type AlumnoLite = { dni: string; nombre: string; apellido: string };

interface FamiliaShellProps {
  dniActual: string;
  nombreAlumno: string;
  nombreTutor: string;
  alumnos: AlumnoLite[];
  children: ReactNode;
}

type Modulo = {
  label: string;
  sub?: string;
  icon: ReactNode;
  soon?: boolean;
};

const MODULOS: Modulo[] = [
  { label: "Resumen", icon: <IconHome /> },
  { label: "Documentación", sub: "documentacion", icon: <IconDoc /> },
  { label: "Pagos", sub: "pagos", icon: <IconCard /> },
  { label: "Viaje", sub: "viaje", icon: <IconPlane /> },
  { label: "Mis datos", sub: "datos", icon: <IconId /> },
  { label: "Diario", icon: <IconBook />, soon: true },
  { label: "Certificado", icon: <IconCert />, soon: true },
  { label: "Encuesta", icon: <IconStar />, soon: true },
];

function hrefDe(base: string, mod: Modulo): string {
  return mod.sub ? `${base}/${mod.sub}` : base;
}

function esActivo(pathname: string, base: string, mod: Modulo): boolean {
  return mod.sub ? pathname.startsWith(`${base}/${mod.sub}`) : pathname === base;
}

export function FamiliaShell({
  dniActual,
  nombreAlumno,
  nombreTutor,
  alumnos,
  children,
}: FamiliaShellProps) {
  const pathname = usePathname();
  const base = `/familias/${dniActual}`;

  const inicialesTutor = nombreTutor
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hayVariosAlumnos = alumnos.length > 1;

  return (
    <div className="min-h-screen bg-[var(--c-page)] text-[var(--c-ink)] lg:grid lg:h-screen lg:grid-cols-[264px_1fr] lg:overflow-hidden">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="hidden lg:flex lg:h-screen lg:flex-col bg-[image:var(--grad-brand)] p-4 text-[var(--c-ink-onbrand)]">
        <SidebarLogo />

        <div className="mt-6">
          <p className="px-2 text-[length:var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onbrand-muted)]">
            Alumno
          </p>
          <p className="mt-1 px-2 font-display text-[length:var(--t-body)] font-bold leading-tight text-[var(--c-ink-onbrand)]">
            {nombreAlumno}
          </p>
          {hayVariosAlumnos && (
            <div className="mt-2 space-y-1">
              {alumnos.map((a) => {
                const activo = a.dni === dniActual;
                return (
                  <Link
                    key={a.dni}
                    href={`/familias/${a.dni}`}
                    aria-current={activo ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-[var(--r-pill)] px-2 py-1.5 text-[length:var(--t-small)] transition-colors",
                      activo
                        ? "bg-white/10 font-bold text-[var(--c-ink-onbrand)]"
                        : "font-semibold text-[var(--c-ink-onbrand-muted)] hover:bg-white/5 hover:text-[var(--c-ink-onbrand)]"
                    )}
                  >
                    <span aria-hidden>{activo ? "●" : "○"}</span>
                    <span className="truncate">
                      {a.nombre} {a.apellido}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <nav
          aria-label="Secciones"
          className="mt-6 flex-1 space-y-1 overflow-y-auto"
        >
          {MODULOS.map((mod) =>
            mod.soon ? (
              <SidebarItemSoon key={mod.label} icon={mod.icon} label={mod.label} />
            ) : (
              <SidebarItem
                key={mod.label}
                icon={mod.icon}
                label={mod.label}
                href={hrefDe(base, mod)}
                active={esActivo(pathname, base, mod)}
              />
            )
          )}
        </nav>

        {/* Chip del tutor + Salir */}
        <div className="mt-3 flex items-center gap-3 rounded-[var(--r-lg)] bg-white/10 p-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] text-[11px] font-extrabold text-[var(--c-ink-onaccent)]"
            aria-hidden
          >
            {inicialesTutor || "T"}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[length:var(--t-small)] font-bold text-[var(--c-ink-onbrand)]">
              {nombreTutor}
            </p>
            <p className="mt-0.5 truncate text-[length:var(--t-label)] text-[var(--c-ink-onbrand-muted)]">
              Familia
            </p>
          </div>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ---------- Header + tabs (mobile) ---------- */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-10 bg-[image:var(--grad-brand)] text-[var(--c-ink-onbrand)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
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
                <p className="truncate text-[length:var(--t-label)] text-[var(--c-ink-onbrand-muted)]">
                  {nombreAlumno}
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>

          {hayVariosAlumnos && (
            <MobileAlumnoSwitch alumnos={alumnos} dniActual={dniActual} />
          )}

          <nav
            aria-label="Secciones"
            className="flex gap-2 overflow-x-auto px-4 pb-2"
          >
            {MODULOS.map((mod) =>
              mod.soon ? (
                <span
                  key={mod.label}
                  aria-disabled
                  className="flex shrink-0 items-center gap-1.5 rounded-[var(--r-pill)] px-3 py-1.5 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand-muted)] opacity-60"
                >
                  <span className="h-4 w-4" aria-hidden>
                    {mod.icon}
                  </span>
                  <span>{mod.label}</span>
                </span>
              ) : (
                <MobileTab
                  key={mod.label}
                  icon={mod.icon}
                  label={mod.label}
                  href={hrefDe(base, mod)}
                  active={esActivo(pathname, base, mod)}
                />
              )
            )}
          </nav>
        </header>
      </div>

      {/* ---------- Contenido ---------- */}
      <main className="lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:mx-0 lg:max-w-none lg:flex-1 lg:overflow-auto lg:px-8 lg:py-8">
          <ConfirmProvider>
            <ToastProvider>{children}</ToastProvider>
          </ConfirmProvider>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   Switch de alumno (mobile)
   ============================================================ */

function MobileAlumnoSwitch({
  alumnos,
  dniActual,
}: {
  alumnos: AlumnoLite[];
  dniActual: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = alumnos.find((a) => a.dni === dniActual);

  return (
    <div className="px-4 pb-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--r-pill)] bg-white/10 px-3 py-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand)]"
      >
        <span className="truncate">
          {actual ? `${actual.nombre} ${actual.apellido}` : "Elegí un alumno"}
        </span>
        <span aria-hidden>{abierto ? "▴" : "▾"}</span>
      </button>
      {abierto && (
        <ul className="mt-1 space-y-1">
          {alumnos.map((a) => {
            const activo = a.dni === dniActual;
            return (
              <li key={a.dni}>
                <Link
                  href={`/familias/${a.dni}`}
                  onClick={() => setAbierto(false)}
                  aria-current={activo ? "true" : undefined}
                  className={cn(
                    "block rounded-[var(--r-pill)] px-3 py-2 text-[length:var(--t-small)]",
                    activo
                      ? "bg-white/10 font-bold text-[var(--c-ink-onbrand)]"
                      : "font-semibold text-[var(--c-ink-onbrand-muted)] hover:bg-white/5"
                  )}
                >
                  {a.nombre} {a.apellido}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   Sidebar parts (desktop)
   ============================================================ */

function SidebarLogo() {
  return (
    <div className="flex items-center gap-3 px-2 pt-1">
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
          Portal de Familias
        </p>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  href,
  active,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
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

function SidebarItemSoon({ icon, label }: { icon: ReactNode; label: string }) {
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

/* ============================================================
   Tab (mobile)
   ============================================================ */

function MobileTab({
  icon,
  label,
  href,
  active,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-[var(--r-pill)] px-3 py-1.5 text-[length:var(--t-small)] font-semibold transition-colors",
        active
          ? "bg-white/15 text-[var(--c-ink-onbrand)]"
          : "text-[var(--c-ink-onbrand-muted)] hover:bg-white/5 hover:text-[var(--c-ink-onbrand)]"
      )}
    >
      <span className="h-4 w-4" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

/* ============================================================
   Iconos (minimal, stroke currentColor)
   ============================================================ */

function IconHome() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M2 7l6-5 6 5" />
      <path d="M3.5 6.5V14h9V6.5" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 1.5h5l3 3V14.5H4z" />
      <path d="M9 1.5v3h3M6 8h4M6 11h4" />
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
function IconPlane() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M8 1l7 4-7 4-7-4 7-4z" />
      <path d="M1 9l7 4 7-4" />
    </svg>
  );
}
function IconId() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x={1.5} y={3} width={13} height={10} rx={1.5} />
      <circle cx={5.5} cy={7.5} r={1.5} />
      <path d="M3.5 11c0-1.2 1-2 2-2s2 .8 2 2M9.5 6.5h3M9.5 9h3" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M2 3.5C2 2.7 2.7 2 3.5 2H8v11H3.5C2.7 13 2 12.3 2 11.5z" />
      <path d="M8 2h4.5c.8 0 1.5.7 1.5 1.5v8c0 .8-.7 1.5-1.5 1.5H8" />
    </svg>
  );
}
function IconCert() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx={8} cy={6} r={3.5} />
      <path d="M6 9l-1 5 3-1.5L11 14l-1-5" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
    </svg>
  );
}
