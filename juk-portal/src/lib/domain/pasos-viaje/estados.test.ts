import { describe, expect, it } from "vitest";

import {
  PASO_VIAJE_DEPENDENCIAS,
  PASO_VIAJE_ESTADOS,
  PASO_VIAJE_TIPOS,
  esPasoDerivado,
  puedeTransicionarPaso,
  transicionesPasoPermitidas,
} from "./estados";

describe("puedeTransicionarPaso", () => {
  it("desde pendiente se puede ir a cualquier otro estado", () => {
    expect(puedeTransicionarPaso("pendiente", "en_progreso")).toBe(true);
    expect(puedeTransicionarPaso("pendiente", "completado")).toBe(true);
    expect(puedeTransicionarPaso("pendiente", "bloqueado")).toBe(true);
  });

  it("completado se puede reabrir pero no bloquear directo", () => {
    expect(puedeTransicionarPaso("completado", "en_progreso")).toBe(true);
    expect(puedeTransicionarPaso("completado", "pendiente")).toBe(true);
    expect(puedeTransicionarPaso("completado", "bloqueado")).toBe(false);
  });

  it("bloqueado se desbloquea pero no se completa directo", () => {
    expect(puedeTransicionarPaso("bloqueado", "pendiente")).toBe(true);
    expect(puedeTransicionarPaso("bloqueado", "en_progreso")).toBe(true);
    expect(puedeTransicionarPaso("bloqueado", "completado")).toBe(false);
  });

  it("quedarse en el mismo estado siempre es válido", () => {
    for (const estado of PASO_VIAJE_ESTADOS) {
      expect(puedeTransicionarPaso(estado, estado)).toBe(true);
    }
  });
});

describe("transicionesPasoPermitidas", () => {
  it("antepone el estado actual", () => {
    for (const estado of PASO_VIAJE_ESTADOS) {
      expect(transicionesPasoPermitidas(estado)[0]).toBe(estado);
    }
  });
});

describe("dependencias y derivados", () => {
  it("transfers depende de pasajes (PRD M7 §7.4)", () => {
    expect(PASO_VIAJE_DEPENDENCIAS.transfers).toBe("pasajes");
  });

  it("police_checks es el único paso derivado", () => {
    const derivados = PASO_VIAJE_TIPOS.filter(esPasoDerivado);
    expect(derivados).toEqual(["police_checks"]);
  });
});
