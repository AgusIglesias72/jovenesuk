import { describe, expect, it } from "vitest";

import { CLASES_MODO_CARD } from "./data-table";
import { sectionTitleClasses } from "./section-title";

const clases = CLASES_MODO_CARD.split(" ").filter(Boolean);

describe("modo card del DataTable", () => {
  it("no cambia nada por encima de 640px", () => {
    const sinBreakpoint = clases.filter((c) => !c.startsWith("max-sm:"));
    expect(sinBreakpoint).toEqual([]);
  });

  it("desarma la tabla completa: display:block se propaga a thead, tbody, tr y td", () => {
    // Si falta uno, el navegador genera cajas de tabla anónimas y la card se
    // rompe (o peor: se rompe sola en Safari).
    expect(clases).toContain("max-sm:block");
    expect(clases).toContain("max-sm:[&_thead]:hidden");
    expect(clases).toContain("max-sm:[&_tbody]:block");
    expect(clases).toContain("max-sm:[&_tr]:block");
    expect(clases.some((c) => c.startsWith("max-sm:[&_td]:flex"))).toBe(true);
  });

  it("separa las filas con el borde de la card, sin borde extra en la última", () => {
    expect(clases).toContain("max-sm:[&_tbody_tr]:border-[var(--c-border)]");
    expect(clases).toContain("max-sm:[&_tbody_tr:last-child]:border-b-0");
  });
});

describe("tokens del design system", () => {
  const PALETA_DEFAULT = /(^|[^a-z-])(bg|text|border|divide)-(gray|slate|zinc|amber|green|red|blue)-\d/;

  it.each([
    ["CLASES_MODO_CARD", CLASES_MODO_CARD],
    ["sectionTitleClasses", sectionTitleClasses],
  ])("%s no usa hex ni la paleta default de Tailwind", (_nombre, valor) => {
    expect(valor).not.toMatch(/#[0-9a-fA-F]{3}/);
    expect(valor).not.toMatch(PALETA_DEFAULT);
  });

  it("sectionTitleClasses tipa el hint de la variable de tamaño (Tailwind v3)", () => {
    // text-[var(--x)] compila como COLOR: sin `length:` el título sale sin tamaño.
    expect(sectionTitleClasses).toContain("text-[length:var(--t-label)]");
  });
});
