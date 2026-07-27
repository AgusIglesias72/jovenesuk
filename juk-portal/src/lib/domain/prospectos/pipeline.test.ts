import { describe, expect, it } from "vitest";

import {
  esGanado,
  esPerdido,
  esTerminal,
  ESTADOS_TERMINALES,
  PROSPECTO_ESTADOS,
  puedeTransicionar,
  transicionesEstado,
} from "./pipeline";

describe("PROSPECTO_ESTADOS", () => {
  it("mantiene el orden del pipeline", () => {
    expect(PROSPECTO_ESTADOS).toEqual([
      "nuevo",
      "contactado",
      "interesado",
      "propuesta",
      "negociacion",
      "ganado",
      "perdido",
    ]);
  });
});

describe("estados terminales", () => {
  it("ganado y perdido son terminales", () => {
    expect(ESTADOS_TERMINALES).toEqual(["ganado", "perdido"]);
    expect(esGanado("ganado")).toBe(true);
    expect(esPerdido("perdido")).toBe(true);
    expect(esTerminal("ganado")).toBe(true);
    expect(esTerminal("perdido")).toBe(true);
  });

  it("los estados intermedios no son terminales", () => {
    expect(esTerminal("nuevo")).toBe(false);
    expect(esTerminal("negociacion")).toBe(false);
    expect(esGanado("perdido")).toBe(false);
    expect(esPerdido("ganado")).toBe(false);
  });
});

describe("transicionesEstado", () => {
  it("ofrece todos los estados salvo el actual", () => {
    const desde = transicionesEstado("interesado");
    expect(desde).not.toContain("interesado");
    expect(desde).toHaveLength(PROSPECTO_ESTADOS.length - 1);
    expect(desde).toContain("nuevo");
    expect(desde).toContain("ganado");
  });

  it("puedeTransicionar es false solo hacia el mismo estado", () => {
    expect(puedeTransicionar("nuevo", "nuevo")).toBe(false);
    expect(puedeTransicionar("nuevo", "ganado")).toBe(true);
    expect(puedeTransicionar("ganado", "nuevo")).toBe(true);
  });
});
