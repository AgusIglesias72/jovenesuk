import { describe, expect, it } from "vitest";

import {
  ENLACE_POLITICA,
  HISTORIAL_POLITICAS,
  POLITICA_ACTUAL,
  TEXTO_CONSENTIMIENTO,
  VERSION_CONSENTIMIENTO,
  buscarPolitica,
} from "./politica";

const FORMATO_VERSION = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-13-01" matchea el regex pero no es una fecha: se chequea aparte. */
function esFechaReal(version: string): boolean {
  const d = new Date(`${version}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === version;
}

describe("versión de la política", () => {
  it("la versión actual es un AAAA-MM-DD real", () => {
    expect(POLITICA_ACTUAL.version).toMatch(FORMATO_VERSION);
    expect(esFechaReal(POLITICA_ACTUAL.version)).toBe(true);
  });

  it("todas las versiones del historial respetan el formato y son fechas reales", () => {
    for (const politica of HISTORIAL_POLITICAS) {
      expect(politica.version).toMatch(FORMATO_VERSION);
      expect(esFechaReal(politica.version)).toBe(true);
    }
  });

  it("la fecha de vigencia coincide con la versión", () => {
    for (const politica of HISTORIAL_POLITICAS) {
      expect(politica.vigenteDesde.toISOString().slice(0, 10)).toBe(politica.version);
    }
  });

  it("la versión del consentimiento también es un AAAA-MM-DD real", () => {
    expect(VERSION_CONSENTIMIENTO).toMatch(FORMATO_VERSION);
    expect(esFechaReal(VERSION_CONSENTIMIENTO)).toBe(true);
  });
});

describe("historial", () => {
  it("contiene la versión actual: sin esto, editar el copy sin subir la versión deja consentimientos apuntando a un texto inexistente", () => {
    const enHistorial = HISTORIAL_POLITICAS.find((p) => p.version === POLITICA_ACTUAL.version);
    expect(enHistorial).toBe(POLITICA_ACTUAL);
  });

  it("no repite versiones", () => {
    const versiones = HISTORIAL_POLITICAS.map((p) => p.version);
    expect(new Set(versiones).size).toBe(versiones.length);
  });

  it("va de la más nueva a la más vieja", () => {
    const versiones = HISTORIAL_POLITICAS.map((p) => p.version);
    expect(versiones).toEqual([...versiones].sort().reverse());
  });

  it("resuelve una versión guardada y devuelve null para una desconocida", () => {
    expect(buscarPolitica(POLITICA_ACTUAL.version)).toBe(POLITICA_ACTUAL);
    expect(buscarPolitica("1999-01-01")).toBeNull();
    expect(buscarPolitica("")).toBeNull();
  });
});

describe("secciones", () => {
  it("hay al menos una sección", () => {
    expect(POLITICA_ACTUAL.secciones.length).toBeGreaterThan(0);
  });

  it("toda sección tiene título y cuerpo no vacíos (ni solo espacios)", () => {
    for (const seccion of POLITICA_ACTUAL.secciones) {
      expect(seccion.titulo.trim()).not.toBe("");
      expect(seccion.cuerpo.trim()).not.toBe("");
    }
  });

  it("los títulos no se repiten: se usan como ancla de la página", () => {
    const titulos = POLITICA_ACTUAL.secciones.map((s) => s.titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("el resumen no está vacío", () => {
    expect(POLITICA_ACTUAL.resumen.trim()).not.toBe("");
  });

  it("dice a qué casilla se ejercen los derechos", () => {
    const texto = POLITICA_ACTUAL.secciones.map((s) => s.cuerpo).join(" ");
    expect(texto).toContain("info@jovenesenuk.com");
  });

  it("menciona la ley que aplica", () => {
    const texto = POLITICA_ACTUAL.secciones.map((s) => s.cuerpo).join(" ");
    expect(texto).toContain("25.326");
  });
});

describe("texto del consentimiento", () => {
  it("nombra la política y lo hace con el texto que se linkea", () => {
    expect(TEXTO_CONSENTIMIENTO).toContain(ENLACE_POLITICA);
    expect(ENLACE_POLITICA.trim()).not.toBe("");
  });

  it("declara la finalidad, no solo que se aceptan condiciones", () => {
    expect(TEXTO_CONSENTIMIENTO).toMatch(/responder|contactar/i);
  });

  it("es una sola frase corta, apta para un checkbox", () => {
    expect(TEXTO_CONSENTIMIENTO.length).toBeLessThan(300);
    expect(TEXTO_CONSENTIMIENTO.trim()).toBe(TEXTO_CONSENTIMIENTO);
    expect(TEXTO_CONSENTIMIENTO).not.toContain("\n");
  });
});
