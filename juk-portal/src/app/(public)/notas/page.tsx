import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { CtaFinal, PageHeader } from "../sections";
import { JsonLd, breadcrumbSchema, langAlternates } from "../seo";
import { NOTAS, fechaCorta } from "./notas-data";

export const metadata: Metadata = {
  title: "Notas y guías para estudiar inglés en el exterior",
  description:
    "Guías prácticas para tu viaje de estudio: qué hacer en Londres, cómo viajar a Inglaterra desde Argentina, Study & Work en Irlanda y más, por el equipo de Jóvenes en UK.",
  alternates: langAlternates("/notas"),
};

export default function NotasPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Notas", path: "/notas" }])} />
      <PageHeader
        kicker="Notas"
        title="Guías y consejos para estudiar inglés en el exterior"
        sub="Lo que aprendimos en más de 10 años organizando viajes de estudio, contado en simple: destinos, trámites, programas y tips para que tu experiencia salga redonda."
      />

      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {NOTAS.map((n) => (
            <article
              key={n.slug}
              className="group flex flex-col overflow-hidden rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-soft)] transition-shadow duration-200 hover:shadow-[shadow:var(--shadow-2)]"
            >
              <Link href={`/notas/${n.slug}`} className="flex flex-1 flex-col">
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={n.img}
                    alt={n.alt}
                    fill
                    sizes="(min-width: 1024px) 380px, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-4 top-4 rounded-[var(--r-pill)] bg-[var(--c-brand-50)] px-3.5 py-1.5 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--c-brand)] shadow-[shadow:var(--shadow-soft)]">
                    {n.categoria}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
                    {fechaCorta(n.fecha)} · {n.lecturaMin} min de lectura
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold leading-[var(--lh-snug)] text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-brand)]">
                    {n.titulo}
                  </h2>
                  <p className="mt-2 flex-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                    {n.descripcion}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[length:var(--t-small)] font-bold text-[var(--c-brand)]">
                    Leer la nota
                    <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" aria-hidden>
                      <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <CtaFinal />
    </>
  );
}
