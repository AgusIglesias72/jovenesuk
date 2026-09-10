import { describe, expect, it } from "vitest";

import {
  GRUPO_LABELS_FAMILIA,
  PASO_AYUDA_FAMILIA,
  PASO_LABELS_FAMILIA,
  RESPONSABLE_LABELS,
  agruparPorGrupoPaso,
  codigoVisible,
  esPasoCodigo,
} from "./ayuda-familia";
import { GRUPOS_PASO, PASO_CODIGOS } from "./codigos";

describe("ayuda de pasos para familias", () => {
  it("cada paso del tablero tiene nombre familiar y una línea de ayuda con responsable", () => {
    for (const codigo of PASO_CODIGOS) {
      expect(PASO_LABELS_FAMILIA[codigo].trim().length, codigo).toBeGreaterThan(0);
      const ayuda = PASO_AYUDA_FAMILIA[codigo];
      expect(ayuda.que.trim().length, codigo).toBeGreaterThan(20);
      expect(RESPONSABLE_LABELS[ayuda.responsable], codigo).toBeDefined();
    }
  });

  it("la ayuda es una sola línea (sin saltos) y en voseo, nunca 'usted'", () => {
    for (const codigo of PASO_CODIGOS) {
      const { que } = PASO_AYUDA_FAMILIA[codigo];
      expect(que, codigo).not.toMatch(/\n/);
      expect(que.toLowerCase(), codigo).not.toMatch(/\busted\b/);
    }
  });

  it("Parental Consent se explica en criollo, no solo con el nombre en inglés", () => {
    expect(PASO_AYUDA_FAMILIA.a3.que).toMatch(/permiso/i);
    expect(PASO_LABELS_FAMILIA.a3).toMatch(/Parental Consent/);
    expect(PASO_LABELS_FAMILIA.a3).toMatch(/permiso/i);
  });

  it("los pasos que mueve la familia son los que tienen accionable en el portal", () => {
    const deLaFamilia = PASO_CODIGOS.filter(
      (c) => c !== "paso_0" && PASO_AYUDA_FAMILIA[c].responsable === "familia"
    );
    expect(deLaFamilia).toEqual(["a1", "a3", "c1", "d1", "d2"]);
  });

  it("cada grupo tiene título y bajada para familias", () => {
    for (const grupo of GRUPOS_PASO) {
      expect(GRUPO_LABELS_FAMILIA[grupo].titulo.length, grupo).toBeGreaterThan(0);
      expect(GRUPO_LABELS_FAMILIA[grupo].bajada.length, grupo).toBeGreaterThan(0);
    }
  });
});

describe("codigoVisible", () => {
  it("muestra el identificador del tablero en mayúscula", () => {
    expect(codigoVisible("a1")).toBe("A1");
    expect(codigoVisible("c1")).toBe("C1");
    expect(codigoVisible("d2")).toBe("D2");
  });

  it("el Paso 0 se nombra como tal", () => {
    expect(codigoVisible("paso_0")).toBe("Paso 0");
  });
});

describe("agruparPorGrupoPaso", () => {
  const p = (codigo: string, id = codigo) => ({ id, codigo });

  it("agrupa en orden canónico (referencia, A, B, C, D) sin importar el orden de entrada", () => {
    const grupos = agruparPorGrupoPaso([p("d1"), p("c1"), p("a1"), p("paso_0"), p("b1")]);
    expect(grupos.map((g) => g.grupo)).toEqual(["referencia", "a", "b", "c", "d"]);
  });

  it("omite los grupos sin pasos", () => {
    const grupos = agruparPorGrupoPaso([p("a1"), p("c2")]);
    expect(grupos.map((g) => g.grupo)).toEqual(["a", "c"]);
  });

  it("conserva el orden relativo dentro de cada grupo", () => {
    const grupos = agruparPorGrupoPaso([p("a3"), p("a1"), p("a2")]);
    expect(grupos[0]?.items.map((i) => i.codigo)).toEqual(["a3", "a1", "a2"]);
  });

  it("descarta códigos desconocidos en vez de romper", () => {
    const grupos = agruparPorGrupoPaso([p("a1"), p("z9")]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.items).toHaveLength(1);
  });

  it("sin pasos devuelve una lista vacía", () => {
    expect(agruparPorGrupoPaso([])).toEqual([]);
  });
});

describe("esPasoCodigo", () => {
  it("reconoce los códigos del tablero y rechaza el resto", () => {
    expect(esPasoCodigo("c1")).toBe(true);
    expect(esPasoCodigo("paso_0")).toBe(true);
    expect(esPasoCodigo("C1")).toBe(false);
    expect(esPasoCodigo("")).toBe(false);
  });
});
