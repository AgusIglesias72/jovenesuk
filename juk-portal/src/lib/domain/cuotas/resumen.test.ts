import { describe, expect, it } from "vitest";

import type { CuotaLike } from "./derivaciones";
import {
  estadoEfectivoCuota,
  ordenarResumenes,
  resumenPlan,
  type ResumenPlan,
} from "./resumen";

const hoy = new Date("2026-06-12");

function cuota(over: Partial<CuotaLike> & { numero: number }): CuotaLike {
  return {
    esUltimaCuota: 0,
    monto: "500.00",
    estado: "pendiente",
    canal: "agencia",
    fechaVencimiento: new Date("2026-08-01"),
    fechaPagoEfectivo: null,
    ...over,
  };
}

describe("resumenPlan (US-24)", () => {
  it("agrega pagadas, abonado, saldo y mora máxima", () => {
    const plan = [
      cuota({ numero: 1, estado: "pagada", fechaVencimiento: new Date("2026-05-01") }),
      cuota({ numero: 2, fechaVencimiento: new Date("2026-06-02") }), // 10 días de mora
      cuota({ numero: 3, fechaVencimiento: new Date("2026-06-10") }), // 2 días de mora
    ];
    const r = resumenPlan(plan, hoy);
    expect(r.cuotasPagadas).toBe(1);
    expect(r.cuotasTotales).toBe(3);
    expect(r.abonado).toBe(500);
    expect(r.saldo).toBe(1000);
    expect(r.maxDiasMora).toBe(10);
  });

  it("plan vacío y plan al día no tienen mora", () => {
    expect(resumenPlan([], hoy).maxDiasMora).toBe(0);
    expect(resumenPlan([cuota({ numero: 1 })], hoy).maxDiasMora).toBe(0);
  });

  it("plan saldado: saldo 0 y todas pagadas", () => {
    const plan = [
      cuota({ numero: 1, estado: "pagada" }),
      cuota({ numero: 2, estado: "pagada" }),
    ];
    const r = resumenPlan(plan, hoy);
    expect(r.saldo).toBe(0);
    expect(r.cuotasPagadas).toBe(r.cuotasTotales);
  });
});

describe("ordenarResumenes (US-24)", () => {
  const base: ResumenPlan = {
    cuotasPagadas: 0,
    cuotasTotales: 2,
    abonado: 0,
    saldo: 0,
    maxDiasMora: 0,
  };
  const rows = [
    { ...base, nombre: "Ana", apellido: "Zeta", maxDiasMora: 3, saldo: 100 },
    { ...base, nombre: "Bruno", apellido: "Alfa", maxDiasMora: 10, saldo: 50 },
    { ...base, nombre: "Carla", apellido: "Mota", maxDiasMora: 0, saldo: 900 },
  ];

  it("por mora: descendente, desempata por nombre", () => {
    expect(ordenarResumenes(rows, "mora").map((r) => r.apellido)).toEqual([
      "Alfa",
      "Zeta",
      "Mota",
    ]);
  });

  it("por saldo: descendente", () => {
    expect(ordenarResumenes(rows, "saldo").map((r) => r.apellido)).toEqual([
      "Mota",
      "Zeta",
      "Alfa",
    ]);
  });

  it("por nombre: apellido alfabético", () => {
    expect(ordenarResumenes(rows, "nombre").map((r) => r.apellido)).toEqual([
      "Alfa",
      "Mota",
      "Zeta",
    ]);
  });

  it("no muta el array original", () => {
    const copia = [...rows];
    ordenarResumenes(rows, "mora");
    expect(rows).toEqual(copia);
  });
});

describe("estadoEfectivoCuota", () => {
  it("pagada gana siempre; vencida es derivada por fecha", () => {
    expect(
      estadoEfectivoCuota(
        cuota({ numero: 1, estado: "pagada", fechaVencimiento: new Date("2026-01-01") }),
        hoy
      )
    ).toBe("pagada");
    expect(
      estadoEfectivoCuota(cuota({ numero: 1, fechaVencimiento: new Date("2026-06-11") }), hoy)
    ).toBe("vencida");
    expect(
      estadoEfectivoCuota(cuota({ numero: 1, fechaVencimiento: new Date("2026-06-12") }), hoy)
    ).toBe("pendiente");
  });
});
