import Image from "next/image";

import { Kicker, SectionTitle } from "../_components/primitives";

type Testimonio = {
  nombre: string;
  foto: string;
  texto: string;
};

const TESTIMONIOS: Testimonio[] = [
  {
    nombre: "Camila O'Toole",
    foto: "/landing/testimonio-camila.webp",
    texto:
      "¡Gracias JUK por organizarme absolutamente todo! Me gustaron mucho las clases. Me voy muy contenta y ahora voy a seguir hablando Inglés con los amigos que hice de todas las nacionalidades",
  },
  {
    nombre: "Mariano Ordoñez",
    foto: "/landing/testimonio-mariano.webp",
    texto:
      "¡Sin dudas fue una de las mejores experiencias de mi vida! Realmente no me alcanzan las palabras para agradecer todo lo que hicieron. Ojalá otros también vivan esta increíble experiencia.",
  },
  {
    nombre: "Nicolás Ianniccillo",
    foto: "/landing/testimonio-nicolas.webp",
    texto:
      "Experiencia super recomendable. Estando tan lejos de casa el apoyo de JUK fue indispensable en todo momento. Sin dudas lo volvería a repetir!",
  },
  {
    nombre: "Clara Michelini",
    foto: "/landing/testimonio-clara.webp",
    texto:
      "Fue una de las experiencias más enriquecedoras que he vivido! Decidí hacer este intercambio porque quería mejorar mi inglés y, además, noté un crecimiento personal impresionante ¡Si tienen la oportunidad, hagan este viaje!",
  },
];

export function Testimonios() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Kicker n="05">Testimonios</Kicker>
        <SectionTitle>Los que ya viajaron lo cuentan mejor</SectionTitle>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIOS.map((t) => (
            <figure
              key={t.nombre}
              className="flex flex-col rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[shadow:var(--shadow-soft)]"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--c-brand-300)]" fill="currentColor" aria-hidden>
                <path d="M5 16c0-4.4 2.4-8 7-10l1 1.8C9.8 9.4 8.6 11 8.3 13H11v6H5v-3Zm9 0c0-4.4 2.4-8 7-10l1 1.8c-3.2 1.6-4.4 3.2-4.7 5.2H20v6h-6v-3Z" />
              </svg>
              <blockquote className="mt-3 flex-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {t.texto}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[var(--c-brand-100)]">
                  <Image src={t.foto} alt={`Foto de ${t.nombre}`} fill sizes="44px" className="object-cover" />
                </span>
                <span>
                  <span className="block text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">{t.nombre}</span>
                  <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">Viajó con JUK</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
