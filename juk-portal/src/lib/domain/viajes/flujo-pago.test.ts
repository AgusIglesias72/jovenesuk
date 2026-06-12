import { describe, expect, it } from "vitest";

import {
  aplicaComisionAgencia,
  aplicaFeeRepresentante,
  aplicaPoliceChecks,
  aplicaPsicofisico,
  aplicaUltimoPagoPresencial,
  estadoInicialViaje,
  flujoPago,
  generaCredencialesRepresentante,
} from "./flujo-pago";
import { VIAJE_ORIGENES, capacidadMaxima, viajeCreateSchema } from "./schema";

describe("flujoPago (ex CRIT-01)", () => {
  it("vía agencia para independiente, instituto y colegio cliente", () => {
    expect(flujoPago("representante_independiente")).toBe("via_agencia");
    expect(flujoPago("instituto")).toBe("via_agencia");
    expect(flujoPago("colegio_cliente")).toBe("via_agencia");
  });

  it("directo JUK solo para juk_directo", () => {
    expect(flujoPago("juk_directo")).toBe("directo_juk");
  });
});

describe("aplicaUltimoPagoPresencial (B2)", () => {
  it("activo para independiente e instituto", () => {
    expect(aplicaUltimoPagoPresencial("representante_independiente")).toBe(true);
    expect(aplicaUltimoPagoPresencial("instituto")).toBe(true);
  });

  it("N/A para colegio cliente (todo vía agencia) y JUK directo", () => {
    expect(aplicaUltimoPagoPresencial("colegio_cliente")).toBe(false);
    expect(aplicaUltimoPagoPresencial("juk_directo")).toBe(false);
  });
});

describe("comisiones y credenciales", () => {
  it("la comisión de agencia es N/A solo para JUK directo", () => {
    for (const origen of VIAJE_ORIGENES) {
      expect(aplicaComisionAgencia(origen)).toBe(origen !== "juk_directo");
    }
  });

  it("el fee del representante aplica solo a independiente e instituto", () => {
    expect(aplicaFeeRepresentante("representante_independiente")).toBe(true);
    expect(aplicaFeeRepresentante("instituto")).toBe(true);
    expect(aplicaFeeRepresentante("colegio_cliente")).toBe(false);
    expect(aplicaFeeRepresentante("juk_directo")).toBe(false);
  });

  it("JUK directo no genera credenciales de representante", () => {
    expect(generaCredencialesRepresentante("juk_directo")).toBe(false);
    expect(generaCredencialesRepresentante("instituto")).toBe(true);
  });
});

describe("tipo de viaje", () => {
  it("el Grupal nace en inscripción abierta; el Individual nace confirmado", () => {
    expect(estadoInicialViaje("grupal")).toBe("inscripcion_abierta");
    expect(estadoInicialViaje("individual")).toBe("confirmado");
  });

  it("psicofísico (D2) y police checks solo aplican a Grupales", () => {
    expect(aplicaPsicofisico("grupal")).toBe(true);
    expect(aplicaPsicofisico("individual")).toBe(false);
    expect(aplicaPoliceChecks("grupal")).toBe(true);
    expect(aplicaPoliceChecks("individual")).toBe(false);
  });

  it("capacidad: Grupal = GL × 12; Individual = 1 fija", () => {
    expect(capacidadMaxima(3, "grupal")).toBe(36);
    expect(capacidadMaxima(0, "individual")).toBe(1);
    expect(capacidadMaxima(5, "individual")).toBe(1);
  });
});

describe("viajeCreateSchema — reglas por tipo", () => {
  const base = {
    codigo: "UK-2026-JUL-LONDON",
    nombre: "Londres en Julio",
    fechaInicio: "2026-07-01",
    fechaFin: "2026-07-15",
    origen: "representante_independiente",
    colegioDestinoId: "8c9f2a31-44a4-4f1e-9e5a-1d2b3c4d5e6f",
    paisDestino: "reino_unido",
    curso: "General English",
    tipoAlojamientoSolicitado: "familia_anfitriona",
    capacidadMinima: 5,
  };

  it("Grupal exige al menos 1 GL", () => {
    const r = viajeCreateSchema.safeParse({ ...base, tipo: "grupal", cantidadGroupLeaders: 0 });
    expect(r.success).toBe(false);
  });

  it("Individual exige exactamente 0 GLs", () => {
    expect(
      viajeCreateSchema.safeParse({ ...base, tipo: "individual", cantidadGroupLeaders: 0 }).success
    ).toBe(true);
    expect(
      viajeCreateSchema.safeParse({ ...base, tipo: "individual", cantidadGroupLeaders: 1 }).success
    ).toBe(false);
  });

  it("acepta juk_directo como origen", () => {
    const r = viajeCreateSchema.safeParse({
      ...base,
      origen: "juk_directo",
      tipo: "individual",
      cantidadGroupLeaders: 0,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza comisión de agencia fuera de 0-100", () => {
    const r = viajeCreateSchema.safeParse({
      ...base,
      tipo: "grupal",
      cantidadGroupLeaders: 1,
      comisionAgenciaPct: 150,
    });
    expect(r.success).toBe(false);
  });
});
