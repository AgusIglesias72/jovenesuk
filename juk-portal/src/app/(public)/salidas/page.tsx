import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  Bandera,
  CheckItem,
  Cta,
  CtaFinal,
  DESTINOS,
  Kicker,
  PageHeader,
  SectionTitle,
  WHATSAPP_URL,
  WhatsAppIcon,
} from "../sections";
import { JsonLd, SITE_URL, breadcrumbSchema, langAlternates, serviceSchema } from "../seo";

export const metadata: Metadata = {
  title: "Salidas grupales e individuales para estudiar inglés",
  description:
    "Salidas grupales en febrero y julio a Cambridge y Londres, viajes de estudio a medida para colegios e institutos, y salidas individuales todo el año a 8 destinos de habla inglesa.",
  alternates: langAlternates("/salidas"),
};

type SalidaDetalle = {
  slug: string;
  kicker: string;
  titulo: string;
  intro: string;
  img: string;
  alt: string;
  bullets: string[];
  nota?: string;
};

const SALIDAS_DETALLE: SalidaDetalle[] = [
  {
    slug: "grupal",
    kicker: "Febrero y julio",
    titulo: "Salida grupal",
    intro:
      "La manera más elegida de hacer tu primer viaje de estudio: viajás con un grupo de juks de tu edad y con el equipo de JUK acompañándote desde el aeropuerto de Ezeiza hasta la vuelta.",
    img: "/landing/salida-grupal.webp",
    alt: "Estudiantes de JUK frente al Eastgate Clock, Chester",
    bullets: [
      "Dos salidas por año: febrero y julio, en las vacaciones",
      "Dos ciudades para elegir: Cambridge y Londres",
      "Alojamiento en campus universitario o casa de familia",
      "Actividades sociales y culturales todos los días",
      "Equipo acompañante de JUK durante todo el viaje",
    ],
  },
  {
    slug: "institutos",
    kicker: "Para instituciones",
    titulo: "Salida grupal para colegios e institutos",
    intro:
      "Armamos el viaje de estudio de tu institución a medida: el grupo viaja con sus propios líderes y nosotros nos ocupamos de toda la logística, antes y durante la experiencia.",
    img: "/landing/salida-institutos.webp",
    alt: "Grupo de estudiantes de JUK en Notting Hill, Londres",
    bullets: [
      "Asesoramiento personalizado y planificación del itinerario",
      "Reuniones informativas con familias y estudiantes",
      "Gestión integral: pasajes, alojamiento, excursiones, transfers y seguros",
      "Acompañamiento permanente desde Argentina",
    ],
  },
  {
    slug: "individual",
    kicker: "Todo el año",
    titulo: "Salida individual",
    intro:
      "Para jóvenes, adultos y profesionales que quieren armar su experiencia a medida: vos elegís cuándo, cuánto tiempo y qué tipo de curso, y nosotros lo hacemos realidad.",
    img: "/landing/salida-individual.webp",
    alt: "Alumna de JUK con su certificado en English in Chester",
    bullets: [
      "Salidas en cualquier momento del año",
      "Fechas, duración, curso y alojamiento personalizables",
      "Gestión de pasajes y excursiones incluida",
      "Ideal para exámenes internacionales, Study & Work y programas profesionales",
    ],
    nota: "Si tenés un objetivo puntual (un examen, una carrera, un trabajo), contanos y armamos el programa alrededor de eso.",
  },
];

const SALIDAS_LIST_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: SALIDAS_DETALLE.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE_URL}/salidas#${s.slug}`,
    item: serviceSchema(s.titulo, s.intro),
  })),
};

type NotaRelacionada = {
  slug: string;
  titulo: string;
  resumen: string;
};

const NOTAS_RELACIONADAS: NotaRelacionada[] = [
  {
    slug: "que-se-puede-hacer-en-londres",
    titulo: "Qué se puede hacer en Londres",
    resumen:
      "Ideas y lugares imperdibles para aprovechar al máximo una salida grupal o individual a Londres.",
  },
  {
    slug: "viaje-de-estudio-adolescentes-guia-para-padres",
    titulo: "Viaje de estudio para adolescentes: guía para padres",
    resumen:
      "Todo lo que una familia necesita saber antes de que su hijo o hija haga su primer viaje de estudio.",
  },
  {
    slug: "opciones-para-viajar-a-inglaterra",
    titulo: "Opciones para viajar a Inglaterra",
    resumen:
      "Las distintas maneras de viajar a Inglaterra a estudiar inglés y cuál se adapta mejor a cada caso.",
  },
];

function NotaRelacionadaCard({ n }: { n: NotaRelacionada }) {
  return (
    <Link
      href={`/notas/${n.slug}`}
      className="group flex flex-col rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[shadow:var(--shadow-soft)] transition-shadow duration-200 hover:shadow-[shadow:var(--shadow-2)]"
    >
      <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-brand)]">
        {n.titulo}
      </h3>
      <p className="mt-2 flex-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        {n.resumen}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[length:var(--t-small)] font-bold text-[var(--c-brand)] transition-colors group-hover:text-[var(--c-brand-600)]">
        Leer la nota
        <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" aria-hidden>
          <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

export default function SalidasPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Salidas", path: "/salidas" }])} />
      <JsonLd data={SALIDAS_LIST_SCHEMA} />
      <PageHeader
        kicker="Salidas"
        title="Tres maneras de viajar, un mismo acompañamiento"
        sub="Variedad de cursos, destinos y modalidades para perfeccionar tu inglés. Cualquiera sea la que elijas, viajás con la misma red de contención de JUK."
      />

      {SALIDAS_DETALLE.map((s, i) => (
        <section
          key={s.slug}
          id={s.slug}
          className={`scroll-mt-20 px-4 py-16 sm:px-6 lg:px-10 lg:py-24 ${i % 2 === 1 ? "bg-[var(--c-surface-2)]" : ""}`}
        >
          <div
            className={`mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[direction:rtl]" : ""}`}
          >
            <div className="lg:[direction:ltr]">
              <Kicker n={`0${i + 1}`}>{s.kicker}</Kicker>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-bold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
                {s.titulo}
              </h2>
              <p className="mt-4 max-w-lg text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {s.intro}
              </p>
              <ul className="mt-6 space-y-3.5">
                {s.bullets.map((b) => (
                  <CheckItem key={b}>{b}</CheckItem>
                ))}
              </ul>
              {s.nota && (
                <p className="mt-5 max-w-lg rounded-[var(--r-md)] bg-[var(--c-honey-soft)] px-4 py-3 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)]">
                  {s.nota}
                </p>
              )}
              <div className="mt-7">
                <Cta href={WHATSAPP_URL} variant="accent">
                  {WhatsAppIcon}
                  Consultar por esta salida
                </Cta>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:[direction:ltr]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--r-xl)] shadow-[shadow:var(--shadow-2)]">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="bg-[var(--c-surface-inverse)] px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <Kicker inverse>Destinos</Kicker>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink-onbrand)]">
            8 destinos de habla inglesa
          </h2>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {DESTINOS.map((d) => (
              <li
                key={d.cc}
                className="flex items-center gap-2.5 rounded-[var(--r-pill)] border border-white/15 bg-white/5 px-5 py-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand)]"
              >
                <Bandera cc={d.cc} nombre={d.nombre} />
                {d.nombre}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <Kicker>Notas relacionadas</Kicker>
          <SectionTitle>Para planear mejor tu salida</SectionTitle>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {NOTAS_RELACIONADAS.map((n) => (
              <NotaRelacionadaCard key={n.slug} n={n} />
            ))}
          </div>
        </div>
      </section>

      <CtaFinal />
    </>
  );
}
