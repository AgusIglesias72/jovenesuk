import { describe, expect, it } from "vitest";

import { VIAJE_ESTADOS } from "./schema";
import {
  TRANSICIONES_VIAJE,
  opcionesEstado,
  puedeTransicionar,
  transicionesPermitidas,
  transicionAutomaticaPorFecha,
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

describe("transicionAutomaticaPorFecha (US-13)", () => {
  const inicio = new Date("2026-07-01");
  const fin = new Date("2026-07-15");

  it("confirmado pasa a en_curso el día de inicio (no antes)", () => {
    expect(transicionAutomaticaPorFecha("confirmado", inicio, fin, new Date("2026-06-30"))).toBeNull();
    expect(transicionAutomaticaPorFecha("confirmado", inicio, fin, new Date("2026-07-01"))).toBe("en_curso");
    expect(transicionAutomaticaPorFecha("confirmado", inicio, fin, new Date("2026-07-05"))).toBe("en_curso");
  });

  it("en_curso pasa a finalizado DESPUÉS del día de fin", () => {
    expect(transicionAutomaticaPorFecha("en_curso", inicio, fin, new Date("2026-07-15"))).toBeNull();
    expect(transicionAutomaticaPorFecha("en_curso", inicio, fin, new Date("2026-07-16"))).toBe("finalizado");
  });

  it("no toca estados que no transicionan por fecha", () => {
    expect(transicionAutomaticaPorFecha("inscripcion_abierta", inicio, fin, new Date("2026-07-05"))).toBeNull();
    expect(transicionAutomaticaPorFecha("finalizado", inicio, fin, new Date("2026-08-01"))).toBeNull();
    expect(transicionAutomaticaPorFecha("cancelado", inicio, fin, new Date("2026-08-01"))).toBeNull();
  });
});
