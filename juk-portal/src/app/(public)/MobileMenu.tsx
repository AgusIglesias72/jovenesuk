"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useScrollLock } from "@/components/ui/use-scroll-lock";

type NavLink = { href: string; label: string };

const PANEL_ID = "menu-mobile-publico";

export function MobileMenu({ links }: { links: readonly NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú al cambiar de ruta (incluye el botón "atrás" del navegador).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Con el menú abierto el fondo no scrollea (el hook del DS cubre iOS) y
  // Escape lo cierra devolviendo el foco al botón que lo abrió.
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", alTeclear);
    const boton = botonRef.current;
    panelRef.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
    return () => {
      document.removeEventListener("keydown", alTeclear);
      boton?.focus();
    };
  }, [open]);

  const itemClass =
    "flex min-h-[var(--tap)] items-center rounded-[var(--r-sm)] px-4 text-[length:var(--t-body)] font-semibold hover:bg-[var(--c-surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-brand)]";

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        ref={botonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls={open ? PANEL_ID : undefined}
        className="flex h-[var(--tap)] w-[var(--tap)] items-center justify-center rounded-[var(--r-sm)] text-[var(--c-ink-onbrand)] transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-honey)]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} aria-hidden />
          <nav
            id={PANEL_ID}
            ref={panelRef}
            aria-label="Menú"
            className="absolute right-0 top-12 z-10 w-60 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-2 shadow-[shadow:var(--shadow-3)]"
          >
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`${itemClass} ${active ? "bg-[var(--c-brand-50)] text-[var(--c-brand)]" : "text-[var(--c-ink)]"}`}
                >
                  {l.label}
                </Link>
              );
            })}
            <div className="mx-2 my-1 border-t border-[var(--c-border)]" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={`${itemClass} text-[var(--c-ink-muted)]`}
            >
              Acceso al portal
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
