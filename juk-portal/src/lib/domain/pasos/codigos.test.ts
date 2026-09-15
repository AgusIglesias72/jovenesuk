import { describe, expect, it } from "vitest";

import {
  esPasoEditable,
  GRUPO_LABELS,
  GRUPOS_PASO,
  grupoDePaso,
  PASO_CODIGOS,
  PASO_LABELS,
  PASO_NUMERACION_VIEJA,
} from "./codigos";

describe("grupoDePaso", () => {
  it("el Paso 0 es la referencia de origen, no un grupo del tablero", () => {
    expect(grupoDePaso("paso_0")).toBe("referencia");
  });

  it("cada paso cae en el grupo de su letra", () => {
    expect(grupoDePaso("a1")).toBe("a");
    expect(grupoDePaso("a3")).toBe("a");
    expect(grupoDePaso("b2")).toBe("b");
    expect(grupoDePaso("c3")).toBe("c");
    expect(grupoDePaso("d1")).toBe("d");
  });

  it("nunca devuelve un grupo que no existe", () => {
    for (const codigo of PASO_CODIGOS) {
      expect(GRUPOS_PASO).toContain(grupoDePaso(codigo));
    }
  });

  it("todo grupo del tablero tiene al menos un paso", () => {
    const usados = new Set(PASO_CODIGOS.map(grupoDePaso));
    for (const grupo of GRUPOS_PASO) {
      expect(usados.has(grupo)).toBe(true);
    }
  });
});

describe("etiquetas", () => {
  it("cada paso y cada grupo tienen una etiqueta no vacía", () => {
    for (const codigo of PASO_CODIGOS) expect(PASO_LABELS[codigo].trim()).not.toBe("");
    for (const grupo of GRUPOS_PASO) expect(GRUPO_LABELS[grupo].trim()).not.toBe("");
  });

  it("no hay dos pasos con la misma etiqueta (se usan para ubicarlos en la UI)", () => {
    const etiquetas = PASO_CODIGOS.map((c) => PASO_LABELS[c]);
    expect(new Set(etiquetas).size).toBe(etiquetas.length);
  });
});

describe("PASO_NUMERACION_VIEJA", () => {
  it("es una biyección entre los 10 pasos editables y los números 1 a 10", () => {
    const pasos = PASO_CODIGOS.filter((c) => c !== "paso_0");
    const numeros = pasos.map((c) => PASO_NUMERACION_VIEJA[c]).sort((a, b) => a - b);
    expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(Object.keys(PASO_NUMERACION_VIEJA)).toHaveLength(pasos.length);
  });
});

describe("esPasoEditable", () => {
  it("solo el Paso 0 es de solo lectura", () => {
    const noEditables = PASO_CODIGOS.filter((c) => !esPasoEditable(c));
    expect(noEditables).toEqual(["paso_0"]);
  });
});
