import { describe, expect, it } from "vitest";

import {
  a1Vencido,
  diasHasta,
  recordatorioA1DeHoy,
  recordatorioD1DeHoy,
} from "./index";

const hoy = new Date("2026-06-12");

describe("diasHasta", () => {
  it("cuenta días de calendario, no horas", () => {
    expect(diasHasta(new Date("2026-06-26"), hoy)).toBe(14);
    expect(diasHasta(new Date("2026-06-12"), hoy)).toBe(0);
    expect(diasHasta(new Date("2026-06-10"), hoy)).toBe(-2);
  });
});

describe("recordatorioA1DeHoy (US-20: 14/7/3/1)", () => {
  it("dispara exactamente en los días configurados", () => {
    expect(recordatorioA1DeHoy(new Date("2026-06-26"), hoy, "pendiente")).toMatchObject({
      tipo: "recordatorio_a1",
      clave: "14d",
    });
    expect(recordatorioA1DeHoy(new Date("2026-06-19"), hoy, "pendiente")?.clave).toBe("7d");
    expect(recordatorioA1DeHoy(new Date("2026-06-15"), hoy, "en_progreso")?.clave).toBe("3d");
    expect(recordatorioA1DeHoy(new Date("2026-06-13"), hoy, "pendiente")?.clave).toBe("1d");
  });

  it("no dispara otros días ni para pasos completados/N-A", () => {
    expect(recordatorioA1DeHoy(new Date("2026-06-20"), hoy, "pendiente")).toBeNull();
    expect(recordatorioA1DeHoy(new Date("2026-06-26"), hoy, "completado")).toBeNull();
    expect(recordatorioA1DeHoy(new Date("2026-06-26"), hoy, "na")).toBeNull();
  });
});

describe("a1Vencido (US-20: vencido NO bloquea)", () => {
  it("vencido cuando pasó la fecha límite sin completar", () => {
    expect(a1Vencido(new Date("2026-06-11"), hoy, "pendiente")).toBe(true);
    expect(a1Vencido(new Date("2026-06-12"), hoy, "pendiente")).toBe(false); // vence HOY: aún no
    expect(a1Vencido(new Date("2026-06-01"), hoy, "completado")).toBe(false);
    expect(a1Vencido(new Date("2026-06-01"), hoy, "vencido")).toBe(false); // ya marcado
  });
});

describe("recordatorioD1DeHoy (US-33: 90/60/30 antes del viaje)", () => {
  it("dispara en los hitos del viaje", () => {
    expect(recordatorioD1DeHoy(new Date("2026-09-10"), hoy, "pendiente")?.clave).toBe("90d");
    expect(recordatorioD1DeHoy(new Date("2026-08-11"), hoy, "pendiente")?.clave).toBe("60d");
    expect(recordatorioD1DeHoy(new Date("2026-07-12"), hoy, "pendiente")?.clave).toBe("30d");
  });

  it("no dispara para N/A (mayores de edad) ni otros días", () => {
    expect(recordatorioD1DeHoy(new Date("2026-09-10"), hoy, "na")).toBeNull();
    expect(recordatorioD1DeHoy(new Date("2026-09-11"), hoy, "pendiente")).toBeNull();
  });
});
