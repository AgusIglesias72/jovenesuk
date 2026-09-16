import type { Metadata } from "next";
import Link from "next/link";

import { EMAIL, mailConAsunto } from "@/lib/contact";
import { HISTORIAL_POLITICAS, POLITICA_ACTUAL } from "@/lib/domain/privacidad/politica";
import { formatFecha } from "@/lib/utils/date";

import { Cta, PublicPageHeader } from "../_components/primitives";
import { JsonLd, breadcrumbSchema, langAlternates } from "../seo";
import { IndicePolitica, PoliticaSecciones } from "./_politica-contenido";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Qué datos personales pedimos en Jóvenes en UK, para qué los usamos, con qué proveedores se comparten y cómo pedís acceder a ellos, corregirlos o borrarlos (Ley 25.326).",
  alternates: langAlternates("/privacidad"),
};

export default function PrivacidadPage() {
  const anteriores = HISTORIAL_POLITICAS.filter((p) => p.version !== POLITICA_ACTUAL.version);

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Privacidad", path: "/privacidad" }])} />

      <PublicPageHeader
        kicker="Privacidad"
        title="Política de Privacidad"
        sub={POLITICA_ACTUAL.resumen}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-4 shadow-[shadow:var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.12em] text-[var(--c-ink-muted)]">
            Versión {POLITICA_ACTUAL.version}
            <span aria-hidden className="px-2 text-[var(--c-accent-600)]">
              ·
            </span>
            Vigente desde {formatFecha(POLITICA_ACTUAL.vigenteDesde)}
          </p>
          <a
            href="#versiones"
            className="inline-flex min-h-[40px] items-center text-[length:var(--t-small)] font-semibold text-[var(--c-brand)] transition-colors hover:text-[var(--c-brand-600)]"
          >
            Versiones anteriores
          </a>
        </div>

        <IndicePolitica secciones={POLITICA_ACTUAL.secciones} />

        <PoliticaSecciones secciones={POLITICA_ACTUAL.secciones} />

        <aside className="mt-12 rounded-[var(--r-xl)] bg-[var(--c-brand-50)] p-8 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
            ¿Querés acceder a tus datos, corregirlos o borrarlos?
          </h2>
          <p className="mx-auto mt-2 max-w-md break-words text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
            Escribinos a {EMAIL} y te respondemos en los plazos que fija la Ley 25.326.
          </p>
          <div className="mt-6">
            <Cta href={mailConAsunto("Datos personales")} variant="brand">
              Escribirnos por privacidad
            </Cta>
          </div>
        </aside>

        <section id="versiones" className="mt-12 scroll-mt-24">
          <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Versiones de esta política
          </h2>
          <p className="mt-2 break-words text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
            Cada vez que aceptás un formulario queda registrada la versión vigente en ese momento.
            Todas se pueden seguir leyendo acá.
          </p>
          <ul className="mt-5 space-y-3">
            {HISTORIAL_POLITICAS.map((p) => {
              const vigente = p.version === POLITICA_ACTUAL.version;
              return (
                <li key={p.version}>
                  <Link
                    href={`/privacidad/${p.version}`}
                    className="group flex min-h-[var(--tap)] flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-3.5 shadow-[shadow:var(--shadow-soft)] transition-shadow hover:shadow-[shadow:var(--shadow-1)]"
                  >
                    <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-brand)]">
                      {p.version}
                    </span>
                    <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                      Vigente desde {formatFecha(p.vigenteDesde)}
                    </span>
                    {vigente && (
                      <span className="rounded-[var(--r-pill)] bg-[var(--c-success-bg)] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.08em] text-[var(--c-success)]">
                        Vigente
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          {anteriores.length === 0 && (
            <p className="mt-4 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-subtle)]">
              Todavía no hubo cambios: esta es la primera versión publicada.
            </p>
          )}
        </section>
      </article>
    </>
  );
}
