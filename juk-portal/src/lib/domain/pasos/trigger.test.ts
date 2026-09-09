import { describe, expect, it } from "vitest";

import { debeAutoConfirmar, fechaLimiteA1Default } from "./trigger";

describe("fechaLimiteA1Default", () => {
  it("resta 30 días al inicio del viaje", () => {
    const limite = fechaLimiteA1Default(new Date("2026-07-15T00:00:00Z"));
    expect(limite.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });

  it("cruza el cambio de mes y de año sin romperse", () => {
    expect(fechaLimiteA1Default(new Date("2026-01-10T00:00:00Z")).toISOString()).toBe(
      "2025-12-11T00:00:00.000Z"
    );
    expect(fechaLimiteA1Default(new Date("2026-03-05T00:00:00Z")).toISOString()).toBe(
      "2026-02-03T00:00:00.000Z"
    );
  });

  it("no muta la fecha recibida", () => {
    const inicio = new Date("2026-07-15T00:00:00Z");
    fechaLimiteA1Default(inicio);
    expect(inicio.toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });
});

describe("debeAutoConfirmar", () => {
  it("confirma el Grupal en inscripción abierta al llegar a 5", () => {
    expect(debeAutoConfirmar("grupal", "inscripcion_abierta", 5)).toBe(true);
    expect(debeAutoConfirmar("grupal", "inscripcion_abierta", 9)).toBe(true);
  });

  it("no confirma con 4 inscriptos", () => {
    expect(debeAutoConfirmar("grupal", "inscripcion_abierta", 4)).toBe(false);
  });

  it("no confirma viajes individuales", () => {
    expect(debeAutoConfirmar("individual", "inscripcion_abierta", 5)).toBe(false);
  });

  it("no toca viajes que ya no están en inscripción abierta", () => {
    expect(debeAutoConfirmar("grupal", "confirmado", 5)).toBe(false);
    expect(debeAutoConfirmar("grupal", "en_curso", 5)).toBe(false);
  });
});
