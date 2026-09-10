import Image from "next/image";

const ACREDITACIONES = [
  { src: "/landing/acreditacion-01.png", alt: "English UK — Partner Agency" },
  { src: "/landing/acreditacion-02.jpg", alt: "Quality English — Online Courses" },
  { src: "/landing/acreditacion-03.jpg", alt: "British Council" },
  { src: "/landing/acreditacion-04.jpg", alt: "Trinity College London — Listed Education Agent" },
  { src: "/landing/acreditacion-05.png", alt: "ICEF Accredited Agency" },
  { src: "/landing/acreditacion-06.jpg", alt: "IALC — Approved Agency" },
  { src: "/landing/acreditacion-07.png", alt: "Cambridge English Qualifications — Trained Agent" },
  { src: "/landing/acreditacion-08.jpg", alt: "Quality English — Authorised Agent" },
] as const;

export function Acreditaciones() {
  return (
    <section className="border-y border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-14 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.18em] text-[var(--c-ink-subtle)]">
          Nuestras acreditaciones
        </p>
        <ul className="mt-8 grid grid-cols-4 items-center gap-x-6 gap-y-6 sm:flex sm:justify-between sm:gap-8">
          {ACREDITACIONES.map((a) => (
            <li key={a.src} className="relative h-10 min-w-0 sm:h-14 sm:flex-1" title={a.alt}>
              <Image
                src={a.src}
                alt={a.alt}
                fill
                sizes="140px"
                className="object-contain opacity-80 transition-opacity hover:opacity-100"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
