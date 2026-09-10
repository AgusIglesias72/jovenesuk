import Image from "next/image";

import { SALIDAS_GRUPALES, etiquetaMesSalida, proximaSalida } from "@/lib/domain/salidas";
import { cn } from "@/lib/utils/cn";

import { Bandera, Cta, DESTINOS } from "../_components/primitives";
import { WHATSAPP_URL } from "../contact";
import { NewsletterForm } from "../newsletter-form";

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

// La fecha se evalúa en el prerender: page.tsx revalida a diario, así el
// banner avanza solo sin volver dinámica la home.
function ProximaSalidaBanner() {
  const salida = proximaSalida(SALIDAS_GRUPALES, new Date());
  if (!salida) return null;

  return (
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
        data-tweak-label="Banner: fecha"
        className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--c-ink-onbrand)]"
      >
        {etiquetaMesSalida(salida)}
      </p>
      <p
        data-tweak-text="salida-destino"
        data-tweak-label="Banner: destino"
        className="text-[length:var(--t-small)] text-[var(--c-ink-onbrand-muted)]"
      >
        {salida.destino}
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
            src="/landing/trips/oxford.webp"
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
          <ProximaSalidaBanner />
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
