import { Kicker, SectionTitle } from "../_components/primitives";

type GrupoPrograma = {
  publico: string;
  emoji: string;
  programas: Array<{ nombre: string; detalle: string }>;
};

const PROGRAMAS: GrupoPrograma[] = [
  {
    publico: "Adolescentes",
    emoji: "🎒",
    programas: [
      { nombre: "Junior Programmes", detalle: "En campus o casa de familia durante el verano" },
      { nombre: "English Plus", detalle: "Inglés + deportes, artes, voluntariado o prácticas" },
    ],
  },
  {
    publico: "Jóvenes y adultos",
    emoji: "🎓",
    programas: [
      { nombre: "Inglés general", detalle: "Programas clásicos, todos los niveles" },
      { nombre: "Exámenes internacionales", detalle: "Cambridge, Trinity, IELTS y TOEFL" },
      { nombre: "Study & Work", detalle: "Irlanda: 6 meses de estudio + 2 de vacaciones" },
      { nombre: "Adult Programmes", detalle: "Grupos +40/+50, ambiente relajado y cultural" },
      { nombre: "Teacher Training", detalle: "CELTA y DELTA para docentes de inglés" },
    ],
  },
  {
    publico: "Profesionales",
    emoji: "💼",
    programas: [
      { nombre: "Inglés de negocios", detalle: "Comunicación profesional y corporativa" },
      { nombre: "Cursos especializados", detalle: "Salud, turismo, derecho, aviación y más" },
    ],
  },
];

export function Programas() {
  return (
    <section id="programas" className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Kicker n="03">Programas</Kicker>
        <SectionTitle>Un programa para cada etapa</SectionTitle>
        <p className="mt-4 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          Desde el primer viaje de un adolescente hasta cursos específicos para tu
          profesión. Te ayudamos a elegir el que mejor encaje con tus objetivos.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PROGRAMAS.map((g) => (
            <div
              key={g.publico}
              className="rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-7 shadow-[shadow:var(--shadow-soft)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[var(--r-md)] bg-[var(--c-accent-soft)] text-xl" aria-hidden>
                  {g.emoji}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
                  {g.publico}
                </h3>
              </div>
              <ul className="mt-6 space-y-4">
                {g.programas.map((p) => (
                  <li key={p.nombre} className="border-l-2 border-[var(--c-brand-300)] pl-4">
                    <p className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">{p.nombre}</p>
                    <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{p.detalle}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
