/*
 * Render del texto de una versión de la política. Lo comparten la página
 * vigente (/privacidad) y la de una versión histórica (/privacidad/<version>):
 * las dos muestran exactamente el mismo cuerpo, con distinto encabezado.
 *
 * El `cuerpo` que entrega el dominio es texto plano (párrafos separados por
 * una línea en blanco, viñetas que arrancan con "· "). Interpretarlo es una
 * decisión de presentación, así que el parseo vive acá y no en el dominio.
 */

import type { SeccionPolitica } from "@/lib/domain/privacidad/politica";

/** Ancla estable del índice: el título sin acentos, signos ni mayúsculas. */
export function anclaSeccion(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const VINETA = "· ";

type Bloque = { tipo: "parrafo"; texto: string } | { tipo: "lista"; items: string[] };

function aBloques(cuerpo: string): Bloque[] {
  const bloques: Bloque[] = [];

  for (const linea of cuerpo.split("\n")) {
    const texto = linea.trim();
    if (!texto) continue;

    if (texto.startsWith(VINETA)) {
      const ultimo = bloques[bloques.length - 1];
      const item = texto.slice(VINETA.length);
      if (ultimo?.tipo === "lista") ultimo.items.push(item);
      else bloques.push({ tipo: "lista", items: [item] });
      continue;
    }

    bloques.push({ tipo: "parrafo", texto });
  }

  return bloques;
}

export function IndicePolitica({ secciones }: { secciones: readonly SeccionPolitica[] }) {
  return (
    <nav
      aria-label="Contenido de la política"
      className="mt-8 rounded-[var(--r-lg)] bg-[var(--c-surface-2)] px-5 py-5 sm:px-6"
    >
      <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] font-bold uppercase tracking-[0.16em] text-[var(--c-ink-subtle)]">
        En esta política
      </p>
      <ol className="mt-2 space-y-0.5">
        {secciones.map((s, i) => (
          <li key={s.titulo}>
            <a
              href={`#${anclaSeccion(s.titulo)}`}
              className="group flex min-h-[40px] items-center gap-2.5 text-[length:var(--t-small)] font-semibold leading-[var(--lh-snug)] text-[var(--c-ink-muted)] transition-colors hover:text-[var(--c-brand)]"
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
  );
}

export function PoliticaSecciones({ secciones }: { secciones: readonly SeccionPolitica[] }) {
  return (
    <>
      {secciones.map((seccion) => (
        <section
          key={seccion.titulo}
          id={anclaSeccion(seccion.titulo)}
          className="mt-10 scroll-mt-24"
        >
          <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold leading-[var(--lh-snug)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            {seccion.titulo}
          </h2>
          {aBloques(seccion.cuerpo).map((bloque, i) =>
            bloque.tipo === "parrafo" ? (
              <p
                key={`${i}-${bloque.texto.slice(0, 32)}`}
                className="mt-4 break-words text-[length:var(--t-body)] leading-[1.75] text-[var(--c-ink-muted)]"
              >
                {bloque.texto}
              </p>
            ) : (
              <ul key={`${i}-lista`} className="mt-4 space-y-3">
                {bloque.items.map((item) => (
                  <li key={item.slice(0, 40)} className="flex items-start gap-3">
                    <span
                      className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]"
                      aria-hidden
                    />
                    <span className="break-words text-[length:var(--t-body)] leading-[1.7] text-[var(--c-ink-muted)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </>
  );
}
