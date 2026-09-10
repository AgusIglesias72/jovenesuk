import Link from "next/link";

import { WHATSAPP_URL } from "../contact";
import { DesktopNav } from "../desktop-nav";
import { MobileMenu } from "../mobile-menu";
import { Wordmark } from "./primitives";

export const NAV_LINKS = [
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/salidas", label: "Salidas" },
  { href: "/programas", label: "Programas" },
  { href: "/notas", label: "Notas" },
  { href: "/contacto", label: "Contacto" },
] as const;

export function TopNav() {
  return (
    <header className="relative z-40 border-b border-white/10 bg-[var(--c-surface-inverse)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label="Jóvenes en UK — inicio">
          <Wordmark inverse />
        </Link>

        <DesktopNav links={NAV_LINKS} />

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-[36px] items-center rounded-[var(--r-pill)] px-4 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand-muted)] transition-colors hover:text-[var(--c-ink-onbrand)] sm:inline-flex"
          >
            Portal
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] px-5 text-[length:var(--t-small)] font-bold text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)] transition-transform active:scale-[0.97]"
          >
            Escribinos
          </a>

          <MobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
