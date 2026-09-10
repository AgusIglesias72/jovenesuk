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
import { VIAJE_ORIGENES } from "./schema";

// Las reglas del schema por tipo de viaje (GLs, capacidad) viven en schema.test.ts.

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
});
