import Link from "next/link";

import { EMAIL, MAIL_URL, PHONE_DISPLAY, SOCIALS, WHATSAPP_URL } from "../contact";
import { NAV_LINKS } from "./nav";
import { Wordmark } from "./primitives";

export function Footer() {
  return (
    <footer className="bg-[var(--c-surface-inverse)] px-4 pb-10 pt-16 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark inverse />
            <p className="mt-4 max-w-xs text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-onbrand-muted)]">
              Viajes de estudio y programas de idiomas en el exterior, con
              acompañamiento de verdad. Educational Tour Operator.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-1 gap-y-0">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[var(--tap)] items-center px-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand-muted)] transition-colors hover:text-[var(--c-honey)]"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Secciones">
            <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-brand-300)]">
              Secciones
            </p>
            <ul className="mt-2 space-y-0.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-[40px] items-center text-[length:var(--t-small)] text-[var(--c-ink-onbrand-muted)] transition-colors hover:text-[var(--c-ink-onbrand)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-brand-300)]">
              Contacto
            </p>
            <ul className="mt-2 space-y-0.5 text-[length:var(--t-small)] text-[var(--c-ink-onbrand-muted)]">
              <li>
                <a href={MAIL_URL} className="inline-flex min-h-[40px] items-center transition-colors hover:text-[var(--c-ink-onbrand)]">
                  {EMAIL}
                </a>
              </li>
              <li>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center transition-colors hover:text-[var(--c-ink-onbrand)]">
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li className="pt-1.5">Buenos Aires, Argentina</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-0">
            <p className="text-[length:var(--t-label)] text-[var(--c-ink-onbrand-muted)]">
              © {new Date().getFullYear()} Jóvenes en UK. Todos los derechos reservados.
            </p>
            <Link
              href="/privacidad"
              className="inline-flex min-h-[40px] items-center text-[length:var(--t-label)] text-[var(--c-ink-onbrand-muted)] underline underline-offset-4 transition-colors hover:text-[var(--c-honey)]"
            >
              Política de Privacidad
            </Link>
          </div>
          <Link
            href="/login"
            className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.12em] text-[var(--c-ink-onbrand-muted)] transition-colors hover:text-[var(--c-honey)]"
          >
            Acceso al portal →
          </Link>
        </div>
      </div>
    </footer>
  );
}
