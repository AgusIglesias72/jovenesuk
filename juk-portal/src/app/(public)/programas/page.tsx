import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Cta, Kicker, PublicPageHeader, SectionTitle } from "../_components/primitives";
import { CtaFinal } from "../_sections";
import { JsonLd, breadcrumbSchema, courseListSchema, langAlternates } from "../seo";

export const metadata: Metadata = {
  title: "Programas y cursos de inglés en el exterior",
  description:
    "Junior Programmes, English Plus, inglés general, preparación de exámenes (Cambridge, Trinity, IELTS, TOEFL), Study & Work en Irlanda, programas +40/+50, CELTA y DELTA, e inglés para profesionales.",
  alternates: langAlternates("/programas"),
};

type Programa = {
  nombre: string;
  resumen: string;
  detalles: string[];
  img?: string;
  alt?: string;
};

type GrupoProgramas = {
  id: string;
  publico: string;
  titulo: string;
  intro: string;
  programas: Programa[];
};

const GRUPOS: GrupoProgramas[] = [
  {
    id: "adolescentes",
    publico: "Adolescentes",
    titulo: "El primer gran viaje, bien acompañado",
    intro:
      "Programas pensados para que los más jóvenes potencien su inglés mientras exploran lugares nuevos, hacen amigos de todo el mundo y ganan confianza al hablar.",
    programas: [
      {
        nombre: "Junior Programmes",
        resumen:
          "En campus universitario o casa de familia, durante el verano europeo.",
        detalles: [
          "Se cursa en colegios típicos ingleses o universidades, con las habitaciones en el campus o en residencias muy cercanas",
          "Aprovechan los meses de verano: días largos, actividades al aire libre, excursiones y visitas culturales",
          "Pensión completa, cursos a elección y actividades recreativas también por las noches",
        ],
        img: "/landing/programa-01.webp",
        alt: "Juniors de JUK paseando por una calle inglesa",
      },
      {
        nombre: "English Plus",
        resumen: "Inglés a la mañana + tu hobby favorito a la tarde.",
        detalles: [
          "Clases tradicionales por la mañana y actividades en inglés por la tarde",
          "Deportes (golf, tenis, fútbol), voluntariado en áreas naturales, prácticas laborales o actividades artísticas como teatro y manualidades",
          "No todos los destinos lo ofrecen: consultanos y te asesoramos según lo que te guste",
        ],
        img: "/landing/programa-02.webp",
        alt: "Estudiante jugando al fútbol en un programa English Plus",
      },
    ],
  },
  {
    id: "jovenes-adultos",
    publico: "Jóvenes y adultos",
    titulo: "Un enfoque para cada objetivo",
    intro:
      "Desde cursos clásicos hasta combinaciones de estudio y trabajo: programas que se adaptan a tus intereses, tu nivel y tu momento de vida.",
    programas: [
      {
        nombre: "Inglés general",
        resumen:
          "Programas clásicos que trabajan todas las facetas del idioma.",
        detalles: [
          "Gramática, vocabulario, expresión oral, comprensión auditiva, pronunciación, lectura y escritura",
          "Foco especial en la competencia oral en clases internacionales, dinámicas y con objetivos claros",
          "Docentes altamente calificados que te ayudan a perder el miedo a hablar",
        ],
        img: "/landing/programa-04.webp",
        alt: "Clase internacional de inglés general",
      },
      {
        nombre: "Preparación de exámenes internacionales",
        resumen:
          "Maximizá tu resultado en Cambridge, Trinity, IELTS o TOEFL.",
        detalles: [
          "Diseñados para el examen que elijas: Cambridge University, Trinity College, IELTS o TOEFL",
          "Mejorás en todas las áreas evaluadas, con práctica específica del formato",
          "También hay cursos para propósitos académicos: aspirantes universitarios y estudiantes de grado o posgrado en instituciones de habla inglesa",
        ],
        img: "/landing/programa-08.webp",
        alt: "Estudiante de JUK con su diploma",
      },
      {
        nombre: "Study & Work",
        resumen:
          "Estudiá inglés y trabajá legalmente. Hoy disponible en Irlanda.",
        detalles: [
          "6 meses de estudio + 2 de vacaciones (8 en total, renovables estando allá) con pasaporte argentino vigente",
          "El instituto te guía con la visa, el permiso laboral y la apertura de cuenta bancaria",
          "Trabajás part-time (20 hs semanales) mientras estudiás; en las vacaciones podés volver, viajar y renovar, o trabajar full-time (40 hs)",
        ],
      },
      {
        nombre: "Adult Programmes",
        resumen:
          "Para +40/+50: inglés en un ambiente relajado, con agenda cultural.",
        detalles: [
          "Excursiones, visitas guiadas y encuentros en bares y cafés locales, siempre con el personal de la institución",
          "En épocas del año con clima ideal para explorar el destino",
          "Compañeros de edades similares y ritmo pensado para adultos",
        ],
        img: "/landing/programa-07.webp",
        alt: "Participantes de un Adult Programme paseando por Londres",
      },
      {
        nombre: "Teacher Training",
        resumen:
          "Para docentes de inglés: desde primeras armas hasta el DELTA.",
        detalles: [
          "Cursos para quienes empiezan a enseñar y quieren afianzar su inglés y sus recursos pedagógicos",
          "CELTA: una de las certificaciones más prestigiosas para enseñar inglés como segunda lengua, reconocida mundialmente",
          "DELTA: la máxima calificación docente, con nivel equivalente a una maestría",
        ],
        img: "/landing/programa-06.webp",
        alt: "Docentes con sus certificados de Teacher Training",
      },
    ],
  },
  {
    id: "profesionales",
    publico: "Profesionales",
    titulo: "Inglés para crecer en tu carrera",
    intro:
      "Para recién graduados que dan sus primeros pasos y profesionales que buscan nuevas oportunidades, acá y en el exterior.",
    programas: [
      {
        nombre: "Inglés de negocios",
        resumen:
          "El idioma de las reuniones, las presentaciones y los e-mails.",
        detalles: [
          "Vocabulario específico del mundo corporativo",
          "Práctica real: presentaciones, liderar reuniones, negociar, llamadas telefónicas, informes y e-mails",
        ],
      },
      {
        nombre: "Cursos especializados",
        resumen: "Inglés específico para tu profesión.",
        detalles: [
          "Programas para médicos, profesionales del turismo y la hospitalidad, abogados y pilotos, entre otros",
          "Contanos tu especialidad y buscamos el curso indicado",
        ],
      },
    ],
  },
];

const CURSOS = GRUPOS.flatMap((g) =>
  g.programas.map((p) => ({ name: p.nombre, description: p.resumen })),
);

type NotaRelacionada = {
  slug: string;
  titulo: string;
  resumen: string;
};

const NOTAS_RELACIONADAS: NotaRelacionada[] = [
  {
    slug: "ielts-toefl-cambridge-que-examen-conviene",
    titulo: "IELTS, TOEFL o Cambridge: qué examen te conviene",
    resumen:
      "Una guía para elegir el examen internacional según tu objetivo, tu carrera y los plazos que tengas.",
  },
  {
    slug: "study-work-irlanda-guia-argentinos",
    titulo: "Study & Work en Irlanda: guía para argentinos",
    resumen:
      "Cómo funciona estudiar y trabajar legalmente en Irlanda con pasaporte argentino, paso a paso.",
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

function ProgramaCard({ p }: { p: Programa }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-soft)]">
      {p.img && (
        <div className="relative h-52 overflow-hidden">
          <Image
            src={p.img}
            alt={p.alt ?? p.nombre}
            fill
            sizes="(min-width: 1024px) 380px, 100vw"
            className="object-cover object-[center_30%]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
          {p.nombre}
        </h3>
        <p className="mt-1.5 text-[length:var(--t-small)] font-semibold text-[var(--c-brand-600)]">
          {p.resumen}
        </p>
        <ul className="mt-4 space-y-2.5">
          {p.detalles.map((d) => (
            <li
              key={d}
              className="flex items-start gap-2.5 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]"
            >
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function ProgramasPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Programas", path: "/programas" }])} />
      <JsonLd data={courseListSchema(CURSOS)} />
      <PublicPageHeader
        kicker="Programas"
        title="Un programa para cada etapa de tu inglés"
        sub="Adolescentes, jóvenes, adultos y profesionales: todos nuestros programas se eligen junto a vos, según tu nivel, tus intereses y tus objetivos."
      />

      {GRUPOS.map((g, i) => (
        <section
          key={g.id}
          id={g.id}
          className={`scroll-mt-20 px-4 py-16 sm:px-6 lg:px-10 lg:py-24 ${i % 2 === 1 ? "bg-[var(--c-surface-2)]" : ""}`}
        >
          <div className="mx-auto max-w-6xl">
            <Kicker n={`0${i + 1}`}>{g.publico}</Kicker>
            <SectionTitle>{g.titulo}</SectionTitle>
            <p className="mt-4 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              {g.intro}
            </p>
            {g.id === "adolescentes" && (
              <p className="mt-3 max-w-xl text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                La mayoría de los adolescentes los hace en nuestras{" "}
                <Link
                  href="/salidas#grupal"
                  className="font-semibold text-[var(--c-brand)] underline-offset-2 hover:underline"
                >
                  salidas grupales de febrero y julio
                </Link>
                , viajando con un grupo de su edad y el equipo de JUK.
              </p>
            )}
            {g.id === "jovenes-adultos" && (
              <p className="mt-3 max-w-xl text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                Estos programas también se pueden hacer en{" "}
                <Link
                  href="/salidas#individual"
                  className="font-semibold text-[var(--c-brand)] underline-offset-2 hover:underline"
                >
                  salidas individuales todo el año
                </Link>
                , con fechas y duración a tu medida.
              </p>
            )}
            <div
              className={`mt-10 grid gap-6 md:grid-cols-2 ${g.programas.length > 2 ? "lg:grid-cols-3" : "lg:max-w-4xl"}`}
            >
              {g.programas.map((p) => (
                <ProgramaCard key={p.nombre} p={p} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="px-4 pb-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 rounded-[var(--r-xl)] bg-[var(--c-brand-50)] px-8 py-8">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
              ¿No sabés cuál es para vos?
            </h2>
            <p className="mt-1 max-w-md text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              Contanos tu edad, tu nivel y qué querés lograr, y te recomendamos el
              programa y el destino justos.
            </p>
          </div>
          <Cta href="/consulta" variant="accent">
            Pedir asesoramiento
          </Cta>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <Kicker>Notas relacionadas</Kicker>
          <SectionTitle>Para seguir leyendo antes de elegir</SectionTitle>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
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
