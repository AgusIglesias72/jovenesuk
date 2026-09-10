import { Kicker, SectionTitle } from "../_components/primitives";

const FAQS = [
  {
    q: "¿Cuándo son las salidas grupales para estudiar inglés?",
    a: "Hay dos salidas grupales por año, en febrero y en julio, aprovechando las vacaciones. Los destinos son Cambridge y Londres, con alojamiento en campus universitario o casa de familia y un equipo de JUK acompañando al grupo durante todo el viaje.",
  },
  {
    q: "¿A qué destinos puedo viajar a estudiar inglés?",
    a: "Trabajamos con instituciones acreditadas en 8 destinos de habla inglesa: Reino Unido, Irlanda, Malta, Canadá, Estados Unidos, Australia, Nueva Zelanda y Sudáfrica.",
  },
  {
    q: "¿Necesito un nivel mínimo de inglés para viajar?",
    a: "No. Antes de viajar evaluamos tu nivel de inglés sin costo y te asignamos el curso adecuado, así arrancás en un grupo que te motive y te haga progresar, cualquiera sea tu punto de partida.",
  },
  {
    q: "¿Cómo funciona el programa Study & Work?",
    a: "Hoy está disponible en Irlanda: son 6 meses de estudio más 2 de vacaciones (8 en total, renovables estando allá) con pasaporte argentino vigente. El instituto te guía con la visa y el permiso laboral, y podés trabajar part-time (20 horas semanales) mientras estudiás.",
  },
  {
    q: "¿Hay programas de inglés para adultos y profesionales?",
    a: "Sí. Tenemos Adult Programmes para +40/+50 con agenda cultural, cursos de inglés de negocios, programas específicos para médicos, turismo, abogados y pilotos, y Teacher Training (CELTA y DELTA) para docentes de inglés.",
  },
  {
    q: "¿Cómo empiezo a planear mi viaje de estudio?",
    a: "Escribinos por WhatsApp al +54 9 11 3378-3515 o por mail a info@jovenesenuk.com. Te asesoramos sobre destino, curso y alojamiento, y armamos una propuesta personalizada sin compromiso.",
  },
] as const;

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function Faq() {
  return (
    <section id="preguntas-frecuentes" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />
      <div className="mx-auto max-w-3xl">
        <Kicker n="06">Preguntas frecuentes</Kicker>
        <SectionTitle>Lo que todos nos preguntan antes de viajar</SectionTitle>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-soft)]"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 text-[length:var(--t-body)] font-bold text-[var(--c-ink)] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-brand-100)] text-[var(--c-brand)] transition-transform group-open:rotate-45">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </span>
              </summary>
              <p className="px-6 pb-5 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
