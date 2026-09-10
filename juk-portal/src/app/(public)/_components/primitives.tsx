/*
 * Primitivos del sitio público (dirección STUDIO). Consumen los tokens de
 * src/styles/tokens.css vía custom properties, sin depender de
 * @/components/ui (que es del portal interno).
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type CtaVariant = "accent" | "brand" | "inverse" | "outline" | "outline-inverse";

const CTA_VARIANTS: Record<CtaVariant, string> = {
  accent:
    "bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)] hover:brightness-[1.04]",
  brand:
    "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] hover:bg-[var(--c-brand-700)]",
  inverse:
    "bg-[var(--c-surface-inverse)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] hover:bg-[var(--c-brand)]",
  outline:
    "border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink)] shadow-[shadow:var(--shadow-soft)] hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)]",
  "outline-inverse":
    "border border-white/25 text-[var(--c-ink-onbrand)] hover:border-white/60 hover:bg-white/10",
};

export function Cta({
  href,
  children,
  variant = "accent",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: CtaVariant;
  className?: string;
}) {
  const isHttp = href.startsWith("http");
  return (
    <Link
      href={href}
      target={isHttp ? "_blank" : undefined}
      rel={isHttp ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex min-h-[var(--tap)] items-center justify-center gap-2 rounded-[var(--r-pill)] px-6 text-[length:var(--t-body)] font-semibold transition-[transform,box-shadow,background-color,border-color] duration-150 active:scale-[0.97]",
        CTA_VARIANTS[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Kicker({ n, children, inverse }: { n?: string; children: ReactNode; inverse?: boolean }) {
  return (
    <p
      className={cn(
        "font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.18em]",
        inverse ? "text-[var(--c-brand-300)]" : "text-[var(--c-brand)]",
      )}
    >
      {n && (
        <>
          <span className={inverse ? "text-[var(--c-honey)]" : "text-[var(--c-accent-600)]"}>{n}</span>
          {" — "}
        </>
      )}
      {children}
    </p>
  );
}

export function SectionTitle({ children, inverse }: { children: ReactNode; inverse?: boolean }) {
  return (
    <h2
      className={cn(
        "mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-bold leading-[var(--lh-tight)] tracking-[var(--ls-tight)]",
        inverse ? "text-[var(--c-ink-onbrand)]" : "text-[var(--c-ink)]",
      )}
    >
      {children}
    </h2>
  );
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--c-brand-100)] text-[var(--c-brand)]">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">{children}</span>
    </li>
  );
}

export const WhatsAppIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3a8.2 8.2 0 1 1 7.1 3.8Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.2-.3.3-.5v-.5L9.6 7.6c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.4Z" />
  </svg>
);

export function Wordmark({ inverse }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 items-center justify-center rounded-[var(--r-pill)] bg-white px-1.5 shadow-[shadow:var(--shadow-soft)]">
        <Image src="/landing/logo-juk.png" alt="Logo de Jóvenes en UK" width={38} height={30} className="h-[26px] w-auto" />
      </span>
      <span
        className={cn(
          "font-[family-name:var(--font-display)] text-lg font-bold tracking-[var(--ls-tight)]",
          inverse ? "text-[var(--c-ink-onbrand)]" : "text-[var(--c-ink)]",
        )}
      >
        Jóvenes en UK
      </span>
    </span>
  );
}

export const DESTINOS = [
  { nombre: "Reino Unido", cc: "gb" },
  { nombre: "Irlanda", cc: "ie" },
  { nombre: "Malta", cc: "mt" },
  { nombre: "Canadá", cc: "ca" },
  { nombre: "Estados Unidos", cc: "us" },
  { nombre: "Australia", cc: "au" },
  { nombre: "Nueva Zelanda", cc: "nz" },
  { nombre: "Sudáfrica", cc: "za" },
] as const;

export function Bandera({ cc, nombre, className }: { cc: string; nombre: string; className?: string }) {
  return (
    <span className={cn("relative inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[3px]", className)}>
      <Image src={`/landing/flags/${cc}.png`} alt={`Bandera de ${nombre}`} fill sizes="24px" className="object-cover" />
    </span>
  );
}

/** Encabezado de subpágina (quienes-somos, salidas, programas, …). */
export function PublicPageHeader({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: ReactNode;
  sub?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-[var(--c-surface-inverse)] px-4 pb-16 pt-12 sm:px-6 lg:px-10 lg:pb-20 lg:pt-16">
      <div
        className="absolute inset-0 bg-[image:radial-gradient(700px_360px_at_90%_-20%,rgba(255,138,91,0.16),transparent_60%),radial-gradient(540px_300px_at_-5%_120%,rgba(70,179,160,0.2),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl animate-[landing-rise_0.7s_cubic-bezier(0.2,0.7,0.2,1)_both]">
        <Kicker inverse>{kicker}</Kicker>
        <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink-onbrand)]">
          {title}
        </h1>
        {sub && (
          <p className="mt-5 max-w-2xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-onbrand-muted)]">
            {sub}
          </p>
        )}
      </div>
    </section>
  );
}
