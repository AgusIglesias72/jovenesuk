import { CheckItem, Kicker, SectionTitle } from "../_components/primitives";
import { LeadForm } from "../lead-form";

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
