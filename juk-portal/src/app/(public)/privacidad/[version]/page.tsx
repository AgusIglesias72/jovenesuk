import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  HISTORIAL_POLITICAS,
  POLITICA_ACTUAL,
  buscarPolitica,
} from "@/lib/domain/privacidad/politica";
import { formatFecha } from "@/lib/utils/date";

import { PublicPageHeader } from "../../_components/primitives";
import { JsonLd, breadcrumbSchema, langAlternates } from "../../seo";
import { IndicePolitica, PoliticaSecciones } from "../_politica-contenido";

type Params = { version: string };

export function generateStaticParams(): Params[] {
  return HISTORIAL_POLITICAS.map((p) => ({ version: p.version }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { version } = await params;
  const politica = buscarPolitica(version);
  if (!politica) return {};

  const esVigente = politica.version === POLITICA_ACTUAL.version;
  return {
    title: `Política de Privacidad — versión ${politica.version}`,
    description: `Texto de la Política de Privacidad de Jóvenes en UK con vigencia desde el ${formatFecha(politica.vigenteDesde)}.`,
    // El archivo de versiones no se indexa: duplica el texto de /privacidad, que
    // es la URL que tiene que aparecer en los buscadores.
    alternates: langAlternates(esVigente ? "/privacidad" : `/privacidad/${politica.version}`),
    robots: { index: false, follow: true },
  };
}

export default async function PoliticaVersionPage({ params }: { params: Promise<Params> }) {
  const { version } = await params;
  const politica = buscarPolitica(version);
  if (!politica) notFound();

  const esVigente = politica.version === POLITICA_ACTUAL.version;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Privacidad", path: "/privacidad" },
          { name: `Versión ${politica.version}`, path: `/privacidad/${politica.version}` },
        ])}
      />

      <PublicPageHeader
        kicker={`Privacidad · versión ${politica.version}`}
        title="Política de Privacidad"
        sub={politica.resumen}
      />

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        {esVigente ? (
          <p className="rounded-[var(--r-lg)] border border-[var(--c-success)] bg-[var(--c-success-bg)] px-5 py-4 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)] sm:px-6">
            <strong className="font-bold">Esta es la versión vigente.</strong> Rige desde el{" "}
            {formatFecha(politica.vigenteDesde)}. También la podés leer en{" "}
            <Link
              href="/privacidad"
              className="font-semibold text-[var(--c-brand)] underline underline-offset-2 transition-colors hover:text-[var(--c-brand-600)]"
            >
              la página de la política
            </Link>
            .
          </p>
        ) : (
          <p className="rounded-[var(--r-lg)] border border-[var(--c-warning)] bg-[var(--c-warning-bg)] px-5 py-4 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)] sm:px-6">
            <strong className="font-bold">Estás leyendo una versión anterior</strong>, que rigió
            desde el {formatFecha(politica.vigenteDesde)} y ya no está vigente. Se conserva porque
            es el texto que aceptaron quienes completaron un formulario mientras regía. La versión
            que rige hoy es la{" "}
            <Link
              href="/privacidad"
              className="font-semibold text-[var(--c-brand)] underline underline-offset-2 transition-colors hover:text-[var(--c-brand-600)]"
            >
              Política de Privacidad vigente
            </Link>
            .
          </p>
        )}

        <IndicePolitica secciones={politica.secciones} />

        <PoliticaSecciones secciones={politica.secciones} />

        <p className="mt-12 border-t border-[var(--c-border)] pt-6 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          <Link
            href="/privacidad#versiones"
            className="font-semibold text-[var(--c-brand)] transition-colors hover:text-[var(--c-brand-600)]"
          >
            Ver todas las versiones de la política
          </Link>
        </p>
      </article>
    </>
  );
}
