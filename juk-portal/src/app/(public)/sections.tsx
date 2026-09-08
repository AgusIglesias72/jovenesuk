/*
 * Secciones de la landing pública de Jóvenes en UK.
 * Autocontenidas (dirección STUDIO): consumen los tokens de
 * src/styles/tokens.css vía custom properties, sin depender de
 * @/components/ui (que es del portal interno).
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { EMAIL, MAIL_URL, PHONE_DISPLAY, SOCIALS, WHATSAPP_URL } from "./contact";
import { DesktopNav } from "./DesktopNav";
import { LeadForm } from "./LeadForm";
import { MobileMenu } from "./MobileMenu";
import { NewsletterForm } from "./NewsletterForm";

export { MAIL_URL, WHATSAPP_URL };

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Primitivos chicos ─────────────────────────────────────────────── */

type CtaVariant = "accent" | "brand" | "outline" | "outline-inverse";

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
  const variants: Record<CtaVariant, string> = {
    accent:
      "bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)] hover:brightness-[1.04]",
    brand:
      "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] hover:bg-[var(--c-brand-700)]",
    outline:
      "border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink)] shadow-[shadow:var(--shadow-soft)] hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)]",
    "outline-inverse":
      "border border-white/25 text-[var(--c-ink-onbrand)] hover:border-white/60 hover:bg-white/10",
  };
  const isHttp = href.startsWith("http");
  return (
    <Link
      href={href}
      target={isHttp ? "_blank" : undefined}
      rel={isHttp ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex min-h-[var(--tap)] items-center justify-center gap-2 rounded-[var(--r-pill)] px-6 text-[length:var(--t-body)] font-semibold transition-[transform,box-shadow,background-color,border-color] duration-150 active:scale-[0.97]",
        variants[variant],
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

/* ── Header ────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/salidas", label: "Salidas" },
  { href: "/programas", label: "Programas" },
  { href: "/notas", label: "Notas" },
  { href: "/contacto", label: "Contacto" },
] as const;

function Wordmark({ inverse }: { inverse?: boolean }) {
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

/* ── Header de subpágina (quienes-somos, salidas, programas, …) ────── */

export function PageHeader({
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

/* ── Hero ──────────────────────────────────────────────────────────── */

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

function FlightPath() {
  return (
    <svg
      viewBox="0 0 520 300"
      className="pointer-events-none absolute -right-6 top-2 hidden h-[300px] w-[520px] opacity-50 lg:block"
      fill="none"
      aria-hidden
    >
      <path
        d="M30 270 C 140 240, 200 140, 300 100 S 470 40, 495 28"
        stroke="var(--c-honey)"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
        className="animate-[landing-dash_14s_linear_infinite]"
      />
      <circle cx="30" cy="270" r="5" fill="var(--c-accent)" />
      <text x="44" y="278" fill="var(--c-ink-onbrand-muted)" fontSize="11" fontFamily="var(--font-mono)">
        BUE
      </text>
      <text x="452" y="52" fill="var(--c-ink-onbrand-muted)" fontSize="11" fontFamily="var(--font-mono)">
        LON
      </text>
      <g transform="translate(495 28) rotate(38)">
        <path d="M0 0 -4 10 0 8 4 10Z" fill="var(--c-honey)" transform="scale(1.8) rotate(180)" />
      </g>
    </svg>
  );
}

function HeroPhoto({
  src,
  alt,
  caption,
  className,
  tilt,
  delay,
  priority,
}: {
  src: string;
  alt: string;
  caption: string;
  className?: string;
  tilt: string;
  delay: string;
  priority?: boolean;
}) {
  return (
    <figure
      className={cn(
        "absolute rounded-[var(--r-lg)] bg-[var(--c-surface)] p-2 pb-3 shadow-[shadow:var(--shadow-3)]",
        "animate-[landing-drift_9s_ease-in-out_infinite]",
        tilt,
        delay,
        className,
      )}
    >
      <div className="relative h-[78%] w-full overflow-hidden rounded-[var(--r-md)]">
        <Image src={src} alt={alt} fill sizes="320px" priority={priority} className="object-cover" />
      </div>
      <figcaption className="flex items-center justify-between px-1.5 pt-2 font-[family-name:var(--font-mono)] text-[11px] font-bold text-[var(--c-ink-muted)]">
        <span>{caption}</span>
        <span className="text-[var(--c-accent-600)]">✈</span>
      </figcaption>
    </figure>
  );
}

export function Hero() {
  return (
    <section id="inicio" className="landing-anim relative overflow-hidden bg-[var(--c-surface-inverse)]">
      <div className="absolute inset-0 bg-[image:radial-gradient(900px_500px_at_85%_-10%,rgba(255,138,91,0.18),transparent_60%),radial-gradient(700px_420px_at_-10%_110%,rgba(70,179,160,0.22),transparent_55%)]" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-32 lg:pt-24">
        <div className="animate-[landing-rise_0.8s_cubic-bezier(0.2,0.7,0.2,1)_both]">
          <span className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/15 bg-white/5 px-4 py-1.5 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.14em] text-[var(--c-brand-300)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-honey)]" />
            <span data-tweak-text="hero-badge" data-tweak-label="Badge del hero">
              Educational Tour Operator · +10 años
            </span>
          </span>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-[length:var(--t-display-1)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink-onbrand)]">
            Aprendé inglés
            <br />
            <span className="landing-grad-text">sin límites.</span>
          </h1>

          <p
            data-tweak-text="hero-sub"
            data-tweak-label="Subtítulo del hero"
            className="mt-6 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-onbrand-muted)]"
          >
            Viajes de estudio y programas de idiomas en el Reino Unido y el mundo.
            Elegimos instituciones acreditadas, evaluamos tu nivel antes de viajar y
            te acompañamos durante toda la experiencia — desde Argentina y en destino.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Cta href="/consulta" variant="accent">
              Pedí tu propuesta
            </Cta>
            <Cta href="#salidas" variant="outline-inverse">
              Ver salidas
            </Cta>
          </div>

          <p
            data-tweak-text="hero-proof"
            data-tweak-label="Línea de prueba social"
            className="mt-7 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] tracking-[0.08em] text-[var(--c-ink-onbrand-muted)]"
          >
4,9/5 de satisfacción en encuestas post-viaje · +1.000 estudiantes ya viajaron
          </p>

          <div className="mt-7 border-t border-white/10 pt-6">
            <p className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand)]">
              Suscribite al newsletter y enterate de las próximas salidas y novedades.
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Composición de fotos estilo postales apiladas */}
        <div className="relative hidden min-h-[440px] sm:block">
          <FlightPath />
          <HeroPhoto
            src="/landing/trips/oxford.jpg"
            alt="Edificios históricos de Oxford"
            caption="OXFORD"
            tilt="[--tilt:-7deg]"
            delay="[animation-delay:0.6s]"
            priority
            className="left-0 top-6 h-56 w-48 lg:h-64 lg:w-56"
          />
          <HeroPhoto
            src="/landing/trips/london-westminster.jpg"
            alt="Westminster y el Big Ben, Londres"
            caption="LONDRES"
            tilt="[--tilt:3deg]"
            delay="[animation-delay:0s]"
            priority
            className="right-2 top-20 h-72 w-60 lg:h-80 lg:w-72"
          />
          <div className="absolute bottom-2 left-10 animate-[landing-rise_0.9s_0.35s_cubic-bezier(0.2,0.7,0.2,1)_both] rounded-[var(--r-lg)] border border-white/10 bg-white/10 px-5 py-4 shadow-[shadow:var(--shadow-2)] backdrop-blur-md">
            <p
              data-tweak-text="salida-kicker"
              data-tweak-label="Banner: rótulo"
              className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--c-honey)]"
            >
              Próxima salida grupal
            </p>
            <p
              data-tweak-text="salida-valor"
              data-tweak-label="Banner: fecha y ciudad"
              className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--c-ink-onbrand)]"
            >
              Julio 2026 · Londres
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[36px] items-center rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] px-4 text-[length:var(--t-small)] font-bold text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)] transition-transform active:scale-[0.97]"
            >
              Me interesa
            </a>
          </div>
        </div>
      </div>

      {/* Marquee de destinos */}
      <div className="relative border-t border-white/10 bg-black/15 py-3.5">
        <div className="flex w-max animate-[landing-marquee_36s_linear_infinite] gap-0">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {DESTINOS.map((d) => (
                <li
                  key={d.cc}
                  className="flex items-center gap-3 pr-6 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold uppercase tracking-[0.16em] text-[var(--c-ink-onbrand-muted)]"
                >
                  <Bandera cc={d.cc} nombre={d.nombre} className="opacity-90" />
                  {d.nombre}
                  <span className="pl-3 text-[var(--c-accent)]">·</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Banda de números ──────────────────────────────────────────────── */

const STATS = [
  { valor: "+10", label: "años de trayectoria" },
  { valor: "+1.000", label: "estudiantes capacitados" },
  { valor: "4,9/5", label: "satisfacción post-viaje" },
  { valor: "8", label: "destinos en el mundo" },
] as const;

export function StatsBand() {
  return (
    <div className="relative z-10 mx-auto -mt-10 max-w-5xl px-4 sm:px-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-border)] shadow-[shadow:var(--shadow-2)] lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-[var(--c-surface)] px-6 py-6 text-center">
            <dd className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-brand)]">
              {s.valor}
            </dd>
            <dt className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── Quiénes somos ─────────────────────────────────────────────────── */

export function QuienesSomos() {
  return (
    <section id="quienes-somos" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <Kicker n="01">Quiénes somos</Kicker>
          <SectionTitle>Referentes de educación internacional de calidad</SectionTitle>
          <p className="mt-5 max-w-lg text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
            Seleccionamos instituciones educativas de excelencia en países de habla
            inglesa, con acreditaciones internacionales y docentes de primer nivel.
            Cada estudiante se asigna según su dominio del inglés, para que el curso
            lo motive y lo haga progresar de verdad.
          </p>
          <ul className="mt-7 space-y-4">
            <CheckItem>
              Autorizados como <strong className="font-semibold text-[var(--c-ink)]">Educational Tour Operator (ETO)</strong>.
            </CheckItem>
            <CheckItem>
              Participación continua en congresos educativos nacionales e internacionales.
            </CheckItem>
            <CheckItem>
              Selección meticulosa de destinos, cursos, alojamientos y actividades culturales.
            </CheckItem>
          </ul>
          <div className="mt-8">
            <Cta href="/quienes-somos" variant="brand">
              Conocé más sobre nosotros
            </Cta>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -left-4 -top-4 h-full w-full rounded-[var(--r-xl)] bg-[var(--c-honey-soft)]" aria-hidden />
          <div className="absolute -bottom-4 -right-4 h-full w-full rounded-[var(--r-xl)] bg-[var(--c-brand-100)]" aria-hidden />
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--r-xl)] shadow-[shadow:var(--shadow-2)]">
            <Image
              src="/landing/trips/london-bridge.jpg"
              alt="Tower Bridge, Londres"
              fill
              sizes="(min-width: 1024px) 520px, 100vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-5 left-6 rounded-[var(--r-pill)] bg-[var(--c-surface)] px-5 py-2.5 shadow-[shadow:var(--shadow-2)]">
            <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.12em] text-[var(--c-brand)]">
              Nuestros juks, prioridad N°1
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Salidas ───────────────────────────────────────────────────────── */

type Salida = {
  slug: string;
  titulo: string;
  badge: string;
  img: string;
  alt: string;
  desc: string;
  incluye: string[];
};

export const SALIDAS: Salida[] = [
  {
    slug: "grupal",
    titulo: "Salida grupal",
    badge: "Febrero y julio",
    img: "/landing/salida-grupal.jpg",
    alt: "Estudiantes de JUK frente al Eastgate Clock, Chester",
    desc: "Viajá en grupo a Cambridge o Londres con el equipo de JUK acompañándote durante todo el viaje.",
    incluye: [
      "Campus universitario o casa de familia",
      "Actividades sociales y culturales",
      "Equipo JUK presente toda la estadía",
    ],
  },
  {
    slug: "institutos",
    titulo: "Colegios e institutos",
    badge: "Para instituciones",
    img: "/landing/salida-institutos.jpg",
    alt: "Grupo de estudiantes de JUK en Notting Hill, Londres",
    desc: "Programas a medida para grupos de estudiantes con líderes de la institución, con gestión integral del viaje.",
    incluye: [
      "Itinerario y reuniones informativas a medida",
      "Pasajes, alojamiento, excursiones, transfers y seguros",
      "Acompañamiento permanente desde Argentina",
    ],
  },
  {
    slug: "individual",
    titulo: "Salida individual",
    badge: "Todo el año",
    img: "/landing/salida-individual.jpg",
    alt: "Alumna de JUK con su certificado en English in Chester",
    desc: "Para jóvenes, adultos y profesionales: armá tu experiencia con fechas, duración, curso y alojamiento a tu medida.",
    incluye: [
      "Salidas en cualquier momento del año",
      "Curso y alojamiento personalizados",
      "Gestión de pasajes y excursiones",
    ],
  },
];

export function Salidas() {
  return (
    <section id="salidas" className="scroll-mt-20 bg-[var(--c-surface-2)] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Kicker n="02">Salidas</Kicker>
        <SectionTitle>Tres maneras de viajar, un mismo acompañamiento</SectionTitle>
        <p className="mt-4 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          Variedad de cursos, destinos y modalidades para perfeccionar tu inglés.
          Elegí la que mejor se adapte a tu momento.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SALIDAS.map((s) => (
            <article
              key={s.titulo}
              className="group flex flex-col overflow-hidden rounded-[var(--r-xl)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)] transition-shadow duration-200 hover:shadow-[shadow:var(--shadow-2)]"
            >
              <div className="relative h-52 overflow-hidden">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 1024px) 380px, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span className="absolute left-4 top-4 rounded-[var(--r-pill)] bg-[var(--c-brand-50)] px-3.5 py-1.5 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--c-brand)] shadow-[shadow:var(--shadow-soft)]">
                  {s.badge}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
                  {s.titulo}
                </h3>
                <p className="mt-2 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                  {s.desc}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {s.incluye.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/salidas#${s.slug}`}
                  className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[length:var(--t-small)] font-bold text-[var(--c-brand)] transition-colors hover:text-[var(--c-brand-600)]"
                >
                  Más información
                  <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" aria-hidden>
                    <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Programas ─────────────────────────────────────────────────────── */

type GrupoPrograma = {
  publico: string;
  emoji: string;
  programas: Array<{ nombre: string; detalle: string }>;
};

const PROGRAMAS: GrupoPrograma[] = [
  {
    publico: "Adolescentes",
    emoji: "🎒",
    programas: [
      { nombre: "Junior Programmes", detalle: "En campus o casa de familia durante el verano" },
      { nombre: "English Plus", detalle: "Inglés + deportes, artes, voluntariado o prácticas" },
    ],
  },
  {
    publico: "Jóvenes y adultos",
    emoji: "🎓",
    programas: [
      { nombre: "Inglés general", detalle: "Programas clásicos, todos los niveles" },
      { nombre: "Exámenes internacionales", detalle: "Cambridge, Trinity, IELTS y TOEFL" },
      { nombre: "Study & Work", detalle: "Irlanda: 6 meses de estudio + 2 de vacaciones" },
      { nombre: "Adult Programmes", detalle: "Grupos +40/+50, ambiente relajado y cultural" },
      { nombre: "Teacher Training", detalle: "CELTA y DELTA para docentes de inglés" },
    ],
  },
  {
    publico: "Profesionales",
    emoji: "💼",
    programas: [
      { nombre: "Inglés de negocios", detalle: "Comunicación profesional y corporativa" },
      { nombre: "Cursos especializados", detalle: "Salud, turismo, derecho, aviación y más" },
    ],
  },
];

export function Programas() {
  return (
    <section id="programas" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Kicker n="03">Programas</Kicker>
        <SectionTitle>Un programa para cada etapa</SectionTitle>
        <p className="mt-4 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          Desde el primer viaje de un adolescente hasta cursos específicos para tu
          profesión. Te ayudamos a elegir el que mejor encaje con tus objetivos.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PROGRAMAS.map((g) => (
            <div
              key={g.publico}
              className="rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-7 shadow-[shadow:var(--shadow-soft)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] bg-[var(--c-accent-soft)] text-xl" aria-hidden>
                  {g.emoji}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
                  {g.publico}
                </h3>
              </div>
              <ul className="mt-6 space-y-4">
                {g.programas.map((p) => (
                  <li key={p.nombre} className="border-l-2 border-[var(--c-brand-300)] pl-4">
                    <p className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">{p.nombre}</p>
                    <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{p.detalle}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Acreditaciones ────────────────────────────────────────────────── */

const ACREDITACIONES = [
  { src: "/landing/acreditacion-01.png", alt: "English UK — Partner Agency" },
  { src: "/landing/acreditacion-02.jpg", alt: "Quality English — Online Courses" },
  { src: "/landing/acreditacion-03.jpg", alt: "British Council" },
  { src: "/landing/acreditacion-04.jpg", alt: "Trinity College London — Listed Education Agent" },
  { src: "/landing/acreditacion-05.png", alt: "ICEF Accredited Agency" },
  { src: "/landing/acreditacion-06.jpg", alt: "IALC — Approved Agency" },
  { src: "/landing/acreditacion-07.png", alt: "Cambridge English Qualifications — Trained Agent" },
  { src: "/landing/acreditacion-08.jpg", alt: "Quality English — Authorised Agent" },
] as const;

export function Acreditaciones() {
  return (
    <section className="border-y border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-14 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.18em] text-[var(--c-ink-subtle)]">
          Nuestras acreditaciones
        </p>
        <ul className="mt-8 grid grid-cols-4 items-center gap-x-6 gap-y-6 sm:flex sm:justify-between sm:gap-8">
          {ACREDITACIONES.map((a) => (
            <li key={a.src} className="relative h-10 min-w-0 sm:h-14 sm:flex-1" title={a.alt}>
              <Image
                src={a.src}
                alt={a.alt}
                fill
                sizes="140px"
                className="object-contain opacity-80 transition-opacity hover:opacity-100"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Acompañamiento ────────────────────────────────────────────────── */

export function Acompanamiento() {
  return (
    <section id="acompanamiento" className="scroll-mt-20 bg-[var(--c-surface-inverse)] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Kicker n="04" inverse>
          Acompañamiento
        </Kicker>
        <SectionTitle inverse>No viajás solo: estamos antes, durante y después</SectionTitle>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[var(--r-xl)] border border-white/10 bg-white/5 p-8">
            <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-honey)]">
              Fase 1 · Antes de viajar
            </span>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink-onbrand)]">
              Evaluamos y diseñamos tu experiencia
            </h3>
            <p className="mt-3 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-onbrand-muted)]">
              Evaluamos tu nivel de inglés, te asesoramos sobre destino, curso y
              alojamiento, y organizamos reuniones informativas para que viajes con
              todo claro — vos y tu familia.
            </p>
          </div>
          <div className="rounded-[var(--r-xl)] border border-white/10 bg-white/5 p-8">
            <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-honey)]">
              Fase 2 · Durante la experiencia
            </span>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink-onbrand)]">
              Seguimiento permanente, de los dos lados
            </h3>
            <p className="mt-3 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-onbrand-muted)]">
              Mientras estás afuera, validamos que el programa cumpla lo prometido y
              quedamos disponibles para vos y tu familia, desde Argentina y en destino.
            </p>
          </div>
        </div>

        <blockquote className="mx-auto mt-16 max-w-3xl text-center">
          <p className="font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-bold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink-onbrand)]">
            “Nuestros <span className="text-[var(--c-accent)]">juks</span> siempre son prioridad N°1.”
          </p>
        </blockquote>
      </div>
    </section>
  );
}

/* ── Testimonios ───────────────────────────────────────────────────── */

type Testimonio = {
  nombre: string;
  foto: string;
  texto: string;
};

const TESTIMONIOS: Testimonio[] = [
  {
    nombre: "Camila O'Toole",
    foto: "/landing/testimonio-camila.png",
    texto:
      "¡Gracias JUK por organizarme absolutamente todo! Me gustaron mucho las clases. Me voy muy contenta y ahora voy a seguir hablando Inglés con los amigos que hice de todas las nacionalidades",
  },
  {
    nombre: "Mariano Ordoñez",
    foto: "/landing/testimonio-mariano.jpg",
    texto:
      "¡Sin dudas fue una de las mejores experiencias de mi vida! Realmente no me alcanzan las palabras para agradecer todo lo que hicieron. Ojalá otros también vivan esta increíble experiencia.",
  },
  {
    nombre: "Nicolás Ianniccillo",
    foto: "/landing/testimonio-nicolas.jpg",
    texto:
      "Experiencia super recomendable. Estando tan lejos de casa el apoyo de JUK fue indispensable en todo momento. Sin dudas lo volvería a repetir!",
  },
  {
    nombre: "Clara Michelini",
    foto: "/landing/testimonio-clara.jpeg",
    texto:
      "Fue una de las experiencias más enriquecedoras que he vivido! Decidí hacer este intercambio porque quería mejorar mi inglés y, además, noté un crecimiento personal impresionante ¡Si tienen la oportunidad, hagan este viaje!",
  },
];

export function Testimonios() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Kicker n="05">Testimonios</Kicker>
        <SectionTitle>Los que ya viajaron lo cuentan mejor</SectionTitle>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIOS.map((t) => (
            <figure
              key={t.nombre}
              className="flex flex-col rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[shadow:var(--shadow-soft)]"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--c-brand-300)]" fill="currentColor" aria-hidden>
                <path d="M5 16c0-4.4 2.4-8 7-10l1 1.8C9.8 9.4 8.6 11 8.3 13H11v6H5v-3Zm9 0c0-4.4 2.4-8 7-10l1 1.8c-3.2 1.6-4.4 3.2-4.7 5.2H20v6h-6v-3Z" />
              </svg>
              <blockquote className="mt-3 flex-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {t.texto}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[var(--c-brand-100)]">
                  <Image src={t.foto} alt={`Foto de ${t.nombre}`} fill sizes="44px" className="object-cover" />
                </span>
                <span>
                  <span className="block text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">{t.nombre}</span>
                  <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">Viajó con JUK</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Preguntas frecuentes ──────────────────────────────────────────── */

const FAQS = [
  {
    q: "¿Cuándo son las salidas grupales para estudiar inglés?",
    a: "Hay dos salidas grupales por año, en febrero y en julio, aprovechando las vacaciones. Los destinos son Cambridge y Londres, con alojamiento en campus universitario o casa de familia y un equipo de JUK acompañando al grupo durante todo el viaje.",
  },
  {
    q: "¿A qué destinos puedo viajar a estudiar inglés?",
    a: "Trabajamos con instituciones acreditadas en 8 destinos de habla inglesa: Reino Unido, Irlanda, Malta, Canadá, Estados Unidos, Australia, Nueva Zelanda y Sudáfrica.",
  },
  {
    q: "¿Necesito un nivel mínimo de inglés para viajar?",
    a: "No. Antes de viajar evaluamos tu nivel de inglés sin costo y te asignamos el curso adecuado, así arrancás en un grupo que te motive y te haga progresar, cualquiera sea tu punto de partida.",
  },
  {
    q: "¿Cómo funciona el programa Study & Work?",
    a: "Hoy está disponible en Irlanda: son 6 meses de estudio más 2 de vacaciones (8 en total, renovables estando allá) con pasaporte argentino vigente. El instituto te guía con la visa y el permiso laboral, y podés trabajar part-time (20 horas semanales) mientras estudiás.",
  },
  {
    q: "¿Hay programas de inglés para adultos y profesionales?",
    a: "Sí. Tenemos Adult Programmes para +40/+50 con agenda cultural, cursos de inglés de negocios, programas específicos para médicos, turismo, abogados y pilotos, y Teacher Training (CELTA y DELTA) para docentes de inglés.",
  },
  {
    q: "¿Cómo empiezo a planear mi viaje de estudio?",
    a: "Escribinos por WhatsApp al +54 9 11 3378-3515 o por mail a info@jovenesenuk.com. Te asesoramos sobre destino, curso y alojamiento, y armamos una propuesta personalizada sin compromiso.",
  },
] as const;

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function Faq() {
  return (
    <section id="preguntas-frecuentes" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />
      <div className="mx-auto max-w-3xl">
        <Kicker n="06">Preguntas frecuentes</Kicker>
        <SectionTitle>Lo que todos nos preguntan antes de viajar</SectionTitle>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-soft)]"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 text-[length:var(--t-body)] font-bold text-[var(--c-ink)] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-brand-100)] text-[var(--c-brand)] transition-transform group-open:rotate-45">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </span>
              </summary>
              <p className="px-6 pb-5 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Sección destacada: formulario de captación ───────────────────────── */

export function LeadSection() {
  return (
    <section id="consulta" className="scroll-mt-20 bg-[var(--c-surface-2)] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <Kicker n="07">Pedí tu propuesta</Kicker>
          <SectionTitle>Armemos juntos tu viaje de estudio</SectionTitle>
          <p className="mt-4 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
            Dejanos tus datos y contanos qué tenés en mente. Te respondemos con una
            propuesta personalizada —destino, curso, alojamiento y fechas— sin
            compromiso.
          </p>
          <ul className="mt-6 space-y-3">
            <CheckItem>Evaluación de tu nivel de inglés sin costo.</CheckItem>
            <CheckItem>Asesoramiento de una persona del equipo, no un bot.</CheckItem>
            <CheckItem>Respuesta a la brevedad por tu medio preferido.</CheckItem>
          </ul>
        </div>
        <LeadForm />
      </div>
    </section>
  );
}

/* ── CTA final ─────────────────────────────────────────────────────── */

export function CtaFinal() {
  return (
    <section id="contacto" className="scroll-mt-20 px-4 pb-24 pt-16 sm:px-6 lg:px-10 lg:pt-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[var(--r-xl)] bg-[image:var(--grad-warm)] px-6 py-16 text-center shadow-[shadow:var(--shadow-accent)] sm:px-12 lg:py-20">
        <div className="absolute inset-0 bg-[image:radial-gradient(600px_300px_at_15%_-20%,rgba(255,255,255,0.35),transparent_60%)]" aria-hidden />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink-onaccent)]">
            ¡Empezá a alcanzar tus metas!
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-onaccent)]/85">
            Contanos qué querés lograr con tu inglés y te armamos una propuesta
            personalizada: destino, curso, alojamiento y fechas a tu medida.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Cta href={WHATSAPP_URL} variant="brand" className="bg-[var(--c-surface-inverse)] hover:bg-[#1d4b45]">
              {WhatsAppIcon}
              Escribinos por WhatsApp
            </Cta>
            <a
              href={MAIL_URL}
              className="inline-flex min-h-[var(--tap)] items-center justify-center rounded-[var(--r-pill)] border-2 border-[var(--c-ink-onaccent)]/30 px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink-onaccent)] transition-colors hover:border-[var(--c-ink-onaccent)]/60"
            >
              {EMAIL}
            </a>
          </div>
          <p className="mt-6 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] tracking-[0.08em] text-[var(--c-ink-onaccent)]/75">
            {PHONE_DISPLAY} · Buenos Aires, Argentina
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────────────── */

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

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="text-[length:var(--t-label)] text-[var(--c-ink-onbrand-muted)]">
            © {new Date().getFullYear()} Jóvenes en UK. Todos los derechos reservados.
          </p>
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
