import { describe, expect, it } from "vitest";

import {
  pasaporteEnAlertaConservadora,
  pasaporteVigenteParaViaje,
} from "./validate-passport";

const fin = new Date("2026-07-31");

describe("pasaporteVigenteParaViaje (ex CRIT-02)", () => {
  it("UK: vigente si vence el día del fin del viaje o después", () => {
    expect(pasaporteVigenteParaViaje(new Date("2026-07-31"), fin, "reino_unido")).toBe(true);
    expect(pasaporteVigenteParaViaje(new Date("2026-08-01"), fin, "reino_unido")).toBe(true);
    expect(pasaporteVigenteParaViaje(new Date("2026-07-30"), fin, "reino_unido")).toBe(false);
  });

  it("UK NO exige los 6 meses extra", () => {
    expect(pasaporteVigenteParaViaje(new Date("2026-09-01"), fin, "reino_unido")).toBe(true);
  });

  it("otros países: exigen 6 meses posteriores al fin", () => {
    expect(pasaporteVigenteParaViaje(new Date("2027-01-31"), fin, "canada")).toBe(true);
    expect(pasaporteVigenteParaViaje(new Date("2027-01-30"), fin, "canada")).toBe(false);
    expect(pasaporteVigenteParaViaje(new Date("2026-09-01"), fin, "irlanda")).toBe(false);
  });
});

describe("pasaporteEnAlertaConservadora (panel M2)", () => {
  const inicio = new Date("2026-07-01");

  it("alerta si vence dentro de los 6 meses posteriores al inicio", () => {
    expect(pasaporteEnAlertaConservadora(new Date("2026-12-31"), inicio)).toBe(true);
    expect(pasaporteEnAlertaConservadora(new Date("2026-06-01"), inicio)).toBe(true); // ya vencido
  });

  it("sin alerta si vence después de la ventana", () => {
    expect(pasaporteEnAlertaConservadora(new Date("2027-01-01"), inicio)).toBe(false);
    expect(pasaporteEnAlertaConservadora(new Date("2028-01-01"), inicio)).toBe(false);
  });
});
