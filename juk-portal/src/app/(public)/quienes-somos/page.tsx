import type { Metadata } from "next";
import Image from "next/image";

import {
  Acreditaciones,
  CheckItem,
  Cta,
  CtaFinal,
  Kicker,
  PageHeader,
  SectionTitle,
  StatsBand,
  WHATSAPP_URL,
} from "../sections";
import { JsonLd, breadcrumbSchema, langAlternates } from "../seo";

export const metadata: Metadata = {
  title: "Quiénes somos: agencia de viajes de estudio",
  description:
    "Jóvenes en UK es un Educational Tour Operator argentino con más de 10 años organizando viajes de estudio e inglés en el exterior: instituciones acreditadas, evaluación de nivel y acompañamiento permanente.",
  alternates: langAlternates("/quienes-somos"),
};

const DIFERENCIADORES = [
  {
    titulo: "Instituciones de excelencia",
    texto:
      "Seleccionamos instituciones educativas de primer nivel en países de habla inglesa, con acreditaciones internacionales y docentes altamente calificados.",
  },
  {
    titulo: "Tu nivel, tu curso",
    texto:
      "Evaluamos el dominio del inglés de cada estudiante antes de viajar y lo asignamos al curso justo: ni aburrido ni frustrante, siempre motivador.",
  },
  {
    titulo: "Cuidado en cada detalle",
    texto:
      "Elegimos destino, curso, alojamiento y actividades culturales con atención meticulosa, para que cada experiencia sea redonda de punta a punta.",
  },
];

export default function QuienesSomosPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Quiénes somos", path: "/quienes-somos" }])} />
      <PageHeader
        kicker="Quiénes somos"
        title="Referentes de educación internacional de calidad"
        sub="Somos una agencia argentina especializada en programas de idiomas en el exterior. Hace más de una década que ayudamos a estudiantes de todas las edades a aprender inglés viviendo la experiencia."
      />
      <StatsBand />

      <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <Kicker n="01">Nuestra propuesta</Kicker>
            <SectionTitle>Elegimos cada pieza de tu experiencia</SectionTitle>
            <p className="mt-5 max-w-lg text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              No vendemos paquetes armados: seleccionamos instituciones, cursos y
              alojamientos que conocemos de primera mano, y los combinamos según el
              nivel de inglés, la edad y los objetivos de cada estudiante. Por eso
              decimos que nuestros juks siempre son prioridad N°1.
            </p>
            <ul className="mt-7 space-y-4">
              <CheckItem>
                Autorizados como{" "}
                <strong className="font-semibold text-[var(--c-ink)]">
                  Educational Tour Operator (ETO)
                </strong>
                .
              </CheckItem>
              <CheckItem>
                Participación continua en congresos educativos nacionales e
                internacionales, para estar siempre al día con la oferta académica.
              </CheckItem>
              <CheckItem>
                Acompañamiento real: antes de viajar y durante toda la estadía,
                desde Argentina y en destino.
              </CheckItem>
            </ul>
            <div className="mt-8">
              <Cta href={WHATSAPP_URL} variant="brand">
                Escribinos y conocenos
              </Cta>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -left-4 -top-4 h-full w-full rounded-[var(--r-xl)] bg-[var(--c-brand-100)]" aria-hidden />
            <div className="absolute -bottom-4 -right-4 h-full w-full rounded-[var(--r-xl)] bg-[var(--c-accent-soft)]" aria-hidden />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--r-xl)] shadow-[shadow:var(--shadow-2)]">
              <Image
                src="/landing/salida-institutos.webp"
                alt="Grupo de estudiantes de JUK en Notting Hill, Londres"
                fill
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--c-surface-2)] px-4 py-20 sm:px-6 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <Kicker n="02">Por qué JUK</Kicker>
          <SectionTitle>Lo que nos diferencia</SectionTitle>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {DIFERENCIADORES.map((d, i) => (
              <div
                key={d.titulo}
                className="rounded-[var(--r-xl)] bg-[var(--c-surface)] p-7 shadow-[shadow:var(--shadow-soft)]"
              >
                <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-accent-600)]">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
                  {d.titulo}
                </h3>
                <p className="mt-2 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                  {d.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Acreditaciones />
      <CtaFinal />
    </>
  );
}
