import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Cta, Kicker } from "../../sections";
import { JsonLd, SITE_URL, breadcrumbSchema, langAlternates } from "../../seo";
import { NOTAS, fechaCorta, getNota } from "../notas-data";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return NOTAS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const nota = getNota(slug);
  if (!nota) return {};
  const ogImage = nota.ogImage ?? `/notas/${nota.slug}/og`;
  return {
    title: nota.tituloSeo,
    description: nota.descripcion,
    alternates: langAlternates(`/notas/${nota.slug}`),
    openGraph: {
      type: "article",
      title: nota.tituloSeo,
      description: nota.descripcion,
      publishedTime: nota.fecha,
      images: [{ url: ogImage, width: 1200, height: 630, alt: nota.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: nota.tituloSeo,
      description: nota.descripcion,
      images: [ogImage],
    },
  };
}

function anchorId(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function articleSchema(nota: NonNullable<ReturnType<typeof getNota>>) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: nota.titulo,
    description: nota.descripcion,
    image: `${SITE_URL}${nota.img}`,
    datePublished: nota.fecha,
    dateModified: nota.fecha,
    inLanguage: "es-AR",
    mainEntityOfPage: `${SITE_URL}/notas/${nota.slug}`,
    articleSection: nota.categoria,
    timeRequired: `PT${nota.lecturaMin}M`,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

function faqSchema(nota: NonNullable<ReturnType<typeof getNota>>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: nota.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default async function NotaPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const nota = getNota(slug);
  if (!nota) notFound();

  const otras = NOTAS.filter((n) => n.slug !== nota.slug);

  return (
    <>
      <JsonLd data={articleSchema(nota)} />
      <JsonLd data={faqSchema(nota)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Notas", path: "/notas" },
          { name: nota.titulo, path: `/notas/${nota.slug}` },
        ])}
      />

      <article>
        <header className="relative overflow-hidden bg-[var(--c-surface-inverse)] px-4 pb-16 pt-12 sm:px-6 lg:px-10 lg:pb-20 lg:pt-16">
          <div
            className="absolute inset-0 bg-[image:radial-gradient(700px_360px_at_90%_-20%,rgba(255,138,91,0.16),transparent_60%),radial-gradient(540px_300px_at_-5%_120%,rgba(70,179,160,0.2),transparent_55%)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl animate-[landing-rise_0.7s_cubic-bezier(0.2,0.7,0.2,1)_both]">
            <nav aria-label="Migas de pan">
              <ol className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.14em] text-[var(--c-brand-300)]">
                <li>
                  <Link href="/notas" className="transition-colors hover:text-[var(--c-ink-onbrand)]">
                    Notas
                  </Link>
                </li>
                <li aria-hidden className="text-[var(--c-honey)]">
                  /
                </li>
                <li className="text-[var(--c-honey)]">{nota.categoria}</li>
              </ol>
            </nav>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink-onbrand)]">
              {nota.titulo}
            </h1>
            <p className="mt-5 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] tracking-[0.08em] text-[var(--c-ink-onbrand-muted)]">
              {fechaCorta(nota.fecha)} · {nota.lecturaMin} min de lectura · por el equipo de JUK
            </p>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-10">
          <div className="relative mx-auto -mt-8 aspect-[16/8] max-w-4xl overflow-hidden rounded-[var(--r-xl)] shadow-[shadow:var(--shadow-2)]">
            <Image
              src={nota.img}
              alt={nota.alt}
              fill
              priority
              sizes="(min-width: 1024px) 896px, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
          {nota.intro.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-5 text-[1.05rem] leading-[1.75] text-[var(--c-ink)]"
            >
              {p}
            </p>
          ))}

          {/* Puntos clave: bloque extractable por buscadores y motores generativos */}
          <aside className="mt-8 rounded-[var(--r-xl)] border border-[var(--c-brand-300)] bg-[var(--c-brand-50)] p-7">
            <h2 className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-brand)]">
              En pocas palabras
            </h2>
            <ul className="mt-4 space-y-3">
              {nota.resumen.map((r) => (
                <li key={r.slice(0, 40)} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--c-brand-100)] text-[var(--c-brand)]">
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-[length:var(--t-small)] font-medium leading-[var(--lh-body)] text-[var(--c-ink)]">
                    {r}
                  </span>
                </li>
              ))}
            </ul>
          </aside>

          {/* Índice con anclas */}
          <nav aria-label="Contenido de la nota" className="mt-8 rounded-[var(--r-lg)] bg-[var(--c-surface-2)] px-6 py-5">
            <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-ink-subtle)]">
              En esta nota
            </p>
            <ol className="mt-2 space-y-0.5">
              {nota.secciones.map((s, i) => (
                <li key={s.titulo}>
                  <a
                    href={`#${anchorId(s.titulo)}`}
                    className="group flex min-h-[40px] items-center gap-2.5 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)] transition-colors hover:text-[var(--c-brand)]"
                  >
                    <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold text-[var(--c-accent-600)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {nota.secciones.map((s) => (
            <section key={s.titulo} id={anchorId(s.titulo)} className="mt-10 scroll-mt-24">
              <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
                {s.titulo}
              </h2>
              {s.parrafos?.map((p) => (
                <p
                  key={p.slice(0, 40)}
                  className="mt-4 text-[length:var(--t-body)] leading-[1.75] text-[var(--c-ink-muted)]"
                >
                  {p}
                </p>
              ))}
              {s.lista && (
                <ul className="mt-5 space-y-3.5">
                  {s.lista.map((item) => (
                    <li key={item.texto.slice(0, 40)} className="flex items-start gap-3">
                      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
                      <span className="text-[length:var(--t-body)] leading-[1.7] text-[var(--c-ink-muted)]">
                        {item.titulo && (
                          <strong className="font-semibold text-[var(--c-ink)]">{item.titulo}: </strong>
                        )}
                        {item.texto}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {s.tabla && (
                <div className="mt-6 overflow-x-auto rounded-[var(--r-md)] border border-[var(--c-border)]">
                  <table className="w-full border-collapse text-left text-[length:var(--t-small)]">
                    <thead>
                      <tr className="bg-[var(--c-surface-2)]">
                        {s.tabla.encabezados.map((th, i) => (
                          <th
                            key={th || `col-${i}`}
                            scope="col"
                            className="border-b border-[var(--c-border)] px-4 py-3 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.08em] text-[var(--c-ink)]"
                          >
                            {th}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.tabla.filas.map((fila, ri) => (
                        <tr key={fila[0] || `fila-${ri}`} className="align-top">
                          {fila.map((celda, ci) =>
                            ci === 0 ? (
                              <th
                                key={`${ri}-${ci}`}
                                scope="row"
                                className="border-t border-[var(--c-border)] px-4 py-3 font-semibold text-[var(--c-ink)]"
                              >
                                {celda}
                              </th>
                            ) : (
                              <td
                                key={`${ri}-${ci}`}
                                className="border-t border-[var(--c-border)] px-4 py-3 leading-[1.6] text-[var(--c-ink-muted)]"
                              >
                                {celda}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          <section id="preguntas-frecuentes" className="mt-12 scroll-mt-24">
            <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Preguntas frecuentes
            </h2>
            <div className="mt-5 space-y-3">
              {nota.faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-soft)]"
                >
                  <summary className="flex items-center justify-between gap-4 px-5 py-3.5 text-[length:var(--t-body)] font-bold text-[var(--c-ink)] [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--c-brand-100)] text-[var(--c-brand)] transition-transform group-open:rotate-45">
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-4 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {nota.aviso && (
            <p className="mt-10 rounded-[var(--r-md)] bg-[var(--c-honey-soft)] px-5 py-4 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)]">
              {nota.aviso}
            </p>
          )}

          {nota.enlaces && nota.enlaces.length > 0 && (
            <nav aria-label="Enlaces útiles" className="mt-10 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface-2)] px-6 py-5">
              <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-ink-subtle)]">
                Enlaces útiles
              </p>
              <ul className="mt-3 space-y-1.5">
                {nota.enlaces.map((e) => (
                  <li key={e.href}>
                    <Link
                      href={e.href}
                      className="group inline-flex items-center gap-2 text-[length:var(--t-small)] font-semibold text-[var(--c-brand)] transition-colors hover:text-[var(--c-brand-600)]"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" aria-hidden>
                        <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {e.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <aside className="mt-12 rounded-[var(--r-xl)] bg-[var(--c-brand-50)] p-8 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
              {nota.cta.titulo}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              {nota.cta.texto}
            </p>
            <div className="mt-6">
              <Cta href={nota.cta.href} variant="accent">
                {nota.cta.label}
              </Cta>
            </div>
          </aside>
        </div>
      </article>

      {otras.length > 0 && (
      <section className="border-t border-[var(--c-border)] px-4 py-14 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <Kicker>Seguí leyendo</Kicker>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {otras.map((n) => (
              <Link
                key={n.slug}
                href={`/notas/${n.slug}`}
                className="group flex items-center gap-5 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-soft)] transition-shadow hover:shadow-[shadow:var(--shadow-1)]"
              >
                <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-[var(--r-md)]">
                  <Image src={n.img} alt={n.alt} fill sizes="112px" className="object-cover" />
                </span>
                <span>
                  <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.12em] text-[var(--c-brand-600)]">
                    {n.categoria}
                  </span>
                  <span className="mt-1 block font-[family-name:var(--font-display)] text-[length:var(--t-body)] font-bold leading-[var(--lh-snug)] text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-brand)]">
                    {n.titulo}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}
    </>
  );
}
