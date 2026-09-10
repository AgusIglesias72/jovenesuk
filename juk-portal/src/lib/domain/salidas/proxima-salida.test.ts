import { describe, expect, it } from "vitest";

import {
  SALIDAS_GRUPALES,
  etiquetaMesSalida,
  proximaSalida,
  type SalidaGrupal,
} from "./proxima-salida";

const JUL_26: SalidaGrupal = { anio: 2026, mes: 7, destino: "Londres" };
const FEB_27: SalidaGrupal = { anio: 2027, mes: 2, destino: "Cambridge" };
const JUL_27: SalidaGrupal = { anio: 2027, mes: 7, destino: "Londres" };
const CALENDARIO = [JUL_26, FEB_27, JUL_27];

const dia = (anio: number, mes: number, d: number) => new Date(Date.UTC(anio, mes - 1, d, 12));

describe("proximaSalida", () => {
  it("el 31/01 la próxima es la de febrero de ese año", () => {
    expect(proximaSalida(CALENDARIO, dia(2027, 1, 31))).toBe(FEB_27);
  });

  it("el 01/02 la de febrero sigue vigente", () => {
    expect(proximaSalida(CALENDARIO, dia(2027, 2, 1))).toBe(FEB_27);
  });

  it("el último día del mes la salida de ese mes sigue vigente", () => {
    expect(proximaSalida(CALENDARIO, dia(2027, 2, 28))).toBe(FEB_27);
  });

  it("el 15/07 la de julio sigue vigente", () => {
    expect(proximaSalida(CALENDARIO, dia(2026, 7, 15))).toBe(JUL_26);
  });

  it("el 01/08 ya pasa a la siguiente", () => {
    expect(proximaSalida(CALENDARIO, dia(2026, 8, 1))).toBe(FEB_27);
  });

  it("el 31/12 salta al febrero del año siguiente", () => {
    expect(proximaSalida(CALENDARIO, dia(2026, 12, 31))).toBe(FEB_27);
  });

  it("no depende del orden de la lista", () => {
    expect(proximaSalida([JUL_27, FEB_27, JUL_26], dia(2026, 9, 10))).toBe(FEB_27);
  });

  it("sin salidas vigentes devuelve null (el banner no se muestra)", () => {
    expect(proximaSalida(CALENDARIO, dia(2027, 8, 1))).toBeNull();
    expect(proximaSalida([], dia(2026, 1, 1))).toBeNull();
  });

  it("el calendario publicado nunca anuncia un mes anterior al actual", () => {
    const hoy = dia(2026, 9, 10);
    const s = proximaSalida(SALIDAS_GRUPALES, hoy);
    expect(s).not.toBeNull();
    if (s) expect(s.anio * 12 + s.mes).toBeGreaterThanOrEqual(2026 * 12 + 9);
  });
});

describe("etiquetaMesSalida", () => {
  it("arma mes con mayúscula y año", () => {
    expect(etiquetaMesSalida(FEB_27)).toBe("Febrero 2027");
    expect(etiquetaMesSalida(JUL_26)).toBe("Julio 2026");
  });

  it("con un mes fuera de rango muestra solo el año", () => {
    expect(etiquetaMesSalida({ anio: 2027, mes: 13, destino: "Londres" })).toBe("2027");
  });
});
