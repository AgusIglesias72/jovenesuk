import { Kicker, SectionTitle } from "../_components/primitives";

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
