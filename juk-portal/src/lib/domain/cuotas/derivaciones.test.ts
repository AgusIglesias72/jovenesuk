import { describe, expect, it } from "vitest";

import {
  b2Completado,
  canalCuota,
  diasDeMora,
  estaVencida,
  estadoPasoB1,
  proximaCuotaPendiente,
  saldoPendiente,
  totalPagado,
  totalPlan,
  type CuotaLike,
} from "./derivaciones";
import { generarVencimientos } from "./schema";

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

describe("canalCuota (B2, ex CRIT-01)", () => {
  it("última cuota presencial solo para independiente e instituto", () => {
    expect(canalCuota("representante_independiente", true)).toBe("presencial");
    expect(canalCuota("instituto", true)).toBe("presencial");
    expect(canalCuota("colegio_cliente", true)).toBe("agencia");
    expect(canalCuota("juk_directo", true)).toBe("agencia");
  });

  it("las cuotas no-últimas siempre van por agencia", () => {
    expect(canalCuota("representante_independiente", false)).toBe("agencia");
  });
});

describe("mora", () => {
  it("vencida = no pagada con vencimiento pasado", () => {
    const c = cuota({ numero: 1, fechaVencimiento: new Date("2026-06-01") });
    expect(estaVencida(c, hoy)).toBe(true);
    expect(diasDeMora(c, hoy)).toBe(11);
  });

  it("una cuota pagada nunca está en mora", () => {
    const c = cuota({ numero: 1, estado: "pagada", fechaVencimiento: new Date("2026-01-01") });
    expect(estaVencida(c, hoy)).toBe(false);
    expect(diasDeMora(c, hoy)).toBe(0);
  });
});

describe("totales y saldo", () => {
  const plan = [
    cuota({ numero: 1, estado: "pagada", monto: "500.00" }),
    cuota({ numero: 2, estado: "pagada", monto: "500.00" }),
    cuota({ numero: 3, monto: "500.00" }),
  ];

  it("total, pagado y saldo", () => {
    expect(totalPlan(plan)).toBe(1500);
    expect(totalPagado(plan)).toBe(1000);
    expect(saldoPendiente(plan)).toBe(500);
  });

  it("próxima pendiente por vencimiento", () => {
    const conFechas = [
      cuota({ numero: 2, fechaVencimiento: new Date("2026-09-01") }),
      cuota({ numero: 1, fechaVencimiento: new Date("2026-08-01") }),
      cuota({ numero: 3, estado: "pagada", fechaVencimiento: new Date("2026-07-01") }),
    ];
    expect(proximaCuotaPendiente(conFechas)?.numero).toBe(1);
    expect(proximaCuotaPendiente([cuota({ numero: 1, estado: "pagada" })])).toBeNull();
  });
});

describe("estadoPasoB1 (US-22)", () => {
  it("pendiente sin plan o sin pagos; en progreso con pagos parciales; completado con todo pagado", () => {
    expect(estadoPasoB1([])).toBe("pendiente");
    expect(estadoPasoB1([cuota({ numero: 1 })])).toBe("pendiente");
    expect(estadoPasoB1([cuota({ numero: 1, estado: "pagada" }), cuota({ numero: 2 })])).toBe("en_progreso");
    expect(estadoPasoB1([cuota({ numero: 1, estado: "pagada" })])).toBe("completado");
  });
});

describe("b2Completado (US-35)", () => {
  it("solo cuando la última cuota está pagada con canal presencial", () => {
    expect(
      b2Completado([cuota({ numero: 1, esUltimaCuota: 1, estado: "pagada", canal: "presencial" })])
    ).toBe(true);
    expect(
      b2Completado([cuota({ numero: 1, esUltimaCuota: 1, estado: "pagada", canal: "agencia" })])
    ).toBe(false);
    expect(
      b2Completado([cuota({ numero: 1, esUltimaCuota: 1, canal: "presencial" })])
    ).toBe(false);
  });
});

describe("generarVencimientos", () => {
  it("mismo día de cada mes a partir del primero", () => {
    const v = generarVencimientos(new Date("2026-07-10"), 3);
    expect(v.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-07-10",
      "2026-08-10",
      "2026-09-10",
    ]);
  });

  it("día 31 a fin de mes no desborda al mes siguiente", () => {
    const v = generarVencimientos(new Date("2027-01-31"), 4);
    expect(v.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
      "2027-04-30",
    ]);
  });
});
