import { describe, expect, it } from "vitest";

import { VIAJE_ESTADOS } from "./schema";
import {
  TRANSICIONES_VIAJE,
  opcionesEstado,
  puedeTransicionar,
  transicionesPermitidas,
  type EstadoViaje,
} from "./transiciones";

describe("puedeTransicionar", () => {
  it("acepta el flujo normal completo", () => {
    expect(puedeTransicionar("inscripcion_abierta", "confirmado")).toBe(true);
    expect(puedeTransicionar("confirmado", "en_curso")).toBe(true);
    expect(puedeTransicionar("en_curso", "finalizado")).toBe(true);
  });

  it("permite volver de confirmado a inscripción abierta", () => {
    expect(puedeTransicionar("confirmado", "inscripcion_abierta")).toBe(true);
  });

  it("permite cancelar desde cualquier estado no terminal", () => {
    expect(puedeTransicionar("inscripcion_abierta", "cancelado")).toBe(true);
    expect(puedeTransicionar("confirmado", "cancelado")).toBe(true);
    expect(puedeTransicionar("en_curso", "cancelado")).toBe(true);
  });

  it("finalizado y cancelado son terminales", () => {
    for (const destino of VIAJE_ESTADOS) {
      if (destino !== "finalizado") {
        expect(puedeTransicionar("finalizado", destino)).toBe(false);
      }
      if (destino !== "cancelado") {
        expect(puedeTransicionar("cancelado", destino)).toBe(false);
      }
    }
  });

  it("no permite saltearse pasos del flujo", () => {
    expect(puedeTransicionar("inscripcion_abierta", "en_curso")).toBe(false);
    expect(puedeTransicionar("inscripcion_abierta", "finalizado")).toBe(false);
    expect(puedeTransicionar("confirmado", "finalizado")).toBe(false);
  });

  it("no permite revivir un viaje (volver atrás desde en_curso o terminales)", () => {
    expect(puedeTransicionar("en_curso", "confirmado")).toBe(false);
    expect(puedeTransicionar("cancelado", "inscripcion_abierta")).toBe(false);
  });

  it("quedarse en el mismo estado siempre es válido", () => {
    for (const estado of VIAJE_ESTADOS) {
      expect(puedeTransicionar(estado, estado)).toBe(true);
    }
  });
});

describe("transicionesPermitidas / opcionesEstado", () => {
  it("opcionesEstado antepone el estado actual a las transiciones", () => {
    for (const estado of VIAJE_ESTADOS) {
      expect(opcionesEstado(estado)).toEqual([estado, ...transicionesPermitidas(estado)]);
    }
  });

  it("el grafo cubre todos los estados del enum", () => {
    expect(Object.keys(TRANSICIONES_VIAJE).sort()).toEqual([...VIAJE_ESTADOS].sort());
  });

  it("ningún estado se lista a sí mismo como transición", () => {
    for (const estado of VIAJE_ESTADOS) {
      expect(TRANSICIONES_VIAJE[estado as EstadoViaje]).not.toContain(estado);
    }
  });
});
