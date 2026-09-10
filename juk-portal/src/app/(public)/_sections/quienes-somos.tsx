import Image from "next/image";

import { CheckItem, Cta, Kicker, SectionTitle } from "../_components/primitives";

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
