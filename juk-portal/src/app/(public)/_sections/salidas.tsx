import Image from "next/image";
import Link from "next/link";

import { Kicker, SectionTitle } from "../_components/primitives";

type Salida = {
  slug: string;
  titulo: string;
  badge: string;
  img: string;
  alt: string;
  desc: string;
  incluye: string[];
};

const SALIDAS: Salida[] = [
  {
    slug: "grupal",
    titulo: "Salida grupal",
    badge: "Febrero y julio",
    img: "/landing/salida-grupal.webp",
    alt: "Estudiantes de JUK frente al Eastgate Clock, Chester",
    desc: "Viajá en grupo a Cambridge o Londres con el equipo de JUK acompañándote durante todo el viaje.",
    incluye: [
      "Campus universitario o casa de familia",
      "Actividades sociales y culturales",
      "Equipo JUK presente toda la estadía",
    ],
  },
  {
    slug: "institutos",
    titulo: "Colegios e institutos",
    badge: "Para instituciones",
    img: "/landing/salida-institutos.webp",
    alt: "Grupo de estudiantes de JUK en Notting Hill, Londres",
    desc: "Programas a medida para grupos de estudiantes con líderes de la institución, con gestión integral del viaje.",
    incluye: [
      "Itinerario y reuniones informativas a medida",
      "Pasajes, alojamiento, excursiones, transfers y seguros",
      "Acompañamiento permanente desde Argentina",
    ],
  },
  {
    slug: "individual",
    titulo: "Salida individual",
    badge: "Todo el año",
    img: "/landing/salida-individual.webp",
    alt: "Alumna de JUK con su certificado en English in Chester",
    desc: "Para jóvenes, adultos y profesionales: armá tu experiencia con fechas, duración, curso y alojamiento a tu medida.",
    incluye: [
      "Salidas en cualquier momento del año",
      "Curso y alojamiento personalizados",
      "Gestión de pasajes y excursiones",
    ],
  },
];

export function Salidas() {
  return (
    <section id="salidas" className="scroll-mt-20 bg-[var(--c-surface-2)] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Kicker n="02">Salidas</Kicker>
        <SectionTitle>Tres maneras de viajar, un mismo acompañamiento</SectionTitle>
        <p className="mt-4 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          Variedad de cursos, destinos y modalidades para perfeccionar tu inglés.
          Elegí la que mejor se adapte a tu momento.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SALIDAS.map((s) => (
            <article
              key={s.titulo}
              className="group flex flex-col overflow-hidden rounded-[var(--r-xl)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)] transition-shadow duration-200 hover:shadow-[shadow:var(--shadow-2)]"
            >
              <div className="relative h-52 overflow-hidden">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 1024px) 380px, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span className="absolute left-4 top-4 rounded-[var(--r-pill)] bg-[var(--c-brand-50)] px-3.5 py-1.5 font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--c-brand)] shadow-[shadow:var(--shadow-soft)]">
                  {s.badge}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
                  {s.titulo}
                </h3>
                <p className="mt-2 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                  {s.desc}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {s.incluye.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/salidas#${s.slug}`}
                  className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[length:var(--t-small)] font-bold text-[var(--c-brand)] transition-colors hover:text-[var(--c-brand-600)]"
                >
                  Más información
                  <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" aria-hidden>
                    <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
