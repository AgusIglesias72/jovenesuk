import type { Metadata } from "next";

import { CheckItem, PublicPageHeader } from "../_components/primitives";
import { LeadForm } from "../lead-form";
import { JsonLd, breadcrumbSchema, langAlternates } from "../seo";

export const metadata: Metadata = {
  title: "Pedí tu propuesta de viaje de estudio",
  description:
    "Dejanos tus datos y armamos una propuesta personalizada para tu viaje de estudio: destino, curso, alojamiento y fechas a tu medida. Sin compromiso.",
  alternates: langAlternates("/consulta"),
};

export default function ConsultaPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Pedí tu propuesta", path: "/consulta" }])} />
      <PublicPageHeader
        kicker="Pedí tu propuesta"
        title="Armemos juntos tu viaje de estudio"
        sub="Contanos qué tenés en mente y te respondemos con una propuesta a tu medida —destino, curso, alojamiento y fechas— sin compromiso."
      />

      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Cómo seguimos
            </h2>
            <ul className="mt-5 space-y-3.5">
              <CheckItem>Evaluamos tu nivel de inglés sin costo.</CheckItem>
              <CheckItem>Te asesora una persona del equipo, no un bot.</CheckItem>
              <CheckItem>Te armamos la propuesta y te contactamos por tu medio preferido.</CheckItem>
              <CheckItem>Vos decidís sin apuro: el primer paso no compromete a nada.</CheckItem>
            </ul>
            <p className="mt-6 max-w-md text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              Más de 10 años y +1.000 estudiantes que ya viajaron con nosotros.
            </p>
          </div>
          <LeadForm />
        </div>
      </section>
    </>
  );
}
