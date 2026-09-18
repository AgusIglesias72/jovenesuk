import { describe, expect, it } from "vitest";

import { ACREDITACIONES_JUK, FOTO_HERO_INSCRIPCION, STATS_JUK } from "./marca";

/*
 * Estos datos alimentan dos superficies públicas (la home y `/inscripcion`), y
 * los rompe un error de tipeo en una ruta: la imagen no carga y nadie se entera
 * hasta que una familia la mira. Se chequea acá —barato y sin navegador— lo que
 * si no caza el E2E de accesibilidad recién en el browser.
 */

describe("datos de marca compartidos", () => {
  it("las acreditaciones son las ocho de la home, sin repetir archivo", () => {
    expect(ACREDITACIONES_JUK).toHaveLength(8);
    expect(new Set(ACREDITACIONES_JUK.map((a) => a.src)).size).toBe(8);
  });

  it("toda imagen de marca sale de /landing/ y tiene texto alternativo", () => {
    for (const acreditacion of [...ACREDITACIONES_JUK, FOTO_HERO_INSCRIPCION]) {
      expect(acreditacion.src, acreditacion.alt).toMatch(/^\/landing\/[\w./-]+\.(png|jpg|webp)$/);
      // Vacío sería "decorativa", y un sello de respaldo no lo es.
      expect(acreditacion.alt.trim().length, acreditacion.src).toBeGreaterThan(0);
    }
  });

  it("las cifras son cuatro y ninguna viene vacía", () => {
    expect(STATS_JUK).toHaveLength(4);
    for (const stat of STATS_JUK) {
      expect(stat.valor.trim().length).toBeGreaterThan(0);
      expect(stat.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("las cuatro cifras tienen etiquetas distintas (son la key del listado)", () => {
    expect(new Set(STATS_JUK.map((s) => s.label)).size).toBe(STATS_JUK.length);
  });
});
