import { describe, expect, it } from "vitest";

import { CONFIG_DOCUMENTAL_DEFAULT } from "@/lib/domain/colegios";

import {
  edadAlInicioDelViaje,
  pasosIniciales,
  versionParentalConsent,
  type ContextoInicializacion,
} from "./inicializacion";
import { PASO_CODIGOS } from "./codigos";

const base: ContextoInicializacion = {
  configDocumental: { ...CONFIG_DOCUMENTAL_DEFAULT },
  tipoEntrada: "eta",
  origenViaje: "representante_independiente",
  tipoViaje: "grupal",
  edadAlInicio: 16,
  canalAlta: "webhook",
};

function pasoDe(ctx: ContextoInicializacion, codigo: string) {
  const p = pasosIniciales(ctx).find((x) => x.codigo === codigo);
  if (!p) throw new Error(`paso ${codigo} no encontrado`);
  return p;
}

describe("pasosIniciales — estructura", () => {
  it("crea los 11 pasos, uno por código", () => {
    const pasos = pasosIniciales(base);
    expect(pasos.map((p) => p.codigo)).toEqual([...PASO_CODIGOS]);
  });

  it("Paso 0 nace completado con el canal de alta", () => {
    expect(pasoDe(base, "paso_0")).toMatchObject({
      estado: "completado",
      metadata: { canal: "webhook" },
    });
    expect(pasoDe({ ...base, canalAlta: "alta_manual" }, "paso_0").metadata.canal).toBe(
      "alta_manual"
    );
  });

  it("C2 nace bloqueado por la dependencia con B1", () => {
    expect(pasoDe(base, "c2")).toMatchObject({
      estado: "bloqueado",
      metadata: { bloqueadoPor: "b1" },
    });
  });

  it("B1 y C3 nacen pendientes siempre", () => {
    expect(pasoDe(base, "b1").estado).toBe("pendiente");
    expect(pasoDe(base, "c3").estado).toBe("pendiente");
  });
});

describe("pasosIniciales — config documental (US-05b)", () => {
  it("con los defaults del Modelo: A1 activo, A2 y A3 en N/A", () => {
    expect(pasoDe(base, "a1").estado).toBe("pendiente");
    expect(pasoDe(base, "a2")).toMatchObject({ estado: "na", metadata: { motivo: "config_colegio" } });
    expect(pasoDe(base, "a3").estado).toBe("na");
  });

  it("colegio tipo Wimbledon (test y PC requeridos) activa A2 y A3", () => {
    const ctx = {
      ...base,
      configDocumental: {
        ...base.configDocumental,
        test_nivel: "requerido" as const,
        parental_consent: "requerido" as const,
      },
    };
    expect(pasoDe(ctx, "a2").estado).toBe("pendiente");
    const a3 = pasoDe(ctx, "a3");
    expect(a3.estado).toBe("pendiente");
    expect(a3.metadata.version).toBe("16_17");
  });

  it("'opcional' deja el paso activo pero marcado fuera de completitud (MIN-13)", () => {
    const ctx = {
      ...base,
      configDocumental: { ...base.configDocumental, application_form: "opcional" as const },
    };
    const a1 = pasoDe(ctx, "a1");
    expect(a1.estado).toBe("pendiente");
    expect(a1.esOpcional).toBe(true);
    expect(a1.metadata.opcional).toBe(true);
  });
});

describe("pasosIniciales — reglas por edad (A3/D1)", () => {
  it("≥18 al inicio → A3 y D1 en N/A aunque el colegio los requiera", () => {
    const ctx = {
      ...base,
      edadAlInicio: 18,
      configDocumental: { ...base.configDocumental, parental_consent: "requerido" as const },
    };
    expect(pasoDe(ctx, "a3")).toMatchObject({ estado: "na", metadata: { motivo: "mayor_de_edad" } });
    expect(pasoDe(ctx, "d1")).toMatchObject({ estado: "na", metadata: { motivo: "mayor_de_edad" } });
  });

  it("<18 → D1 pendiente", () => {
    expect(pasoDe(base, "d1").estado).toBe("pendiente");
  });
});

describe("pasosIniciales — B2 por tipo de representante (ex CRIT-01)", () => {
  it("independiente e instituto → B2 activo", () => {
    expect(pasoDe(base, "b2").estado).toBe("pendiente");
    expect(pasoDe({ ...base, origenViaje: "instituto" }, "b2").estado).toBe("pendiente");
  });

  it("colegio cliente y JUK directo → B2 = N/A", () => {
    expect(pasoDe({ ...base, origenViaje: "colegio_cliente" }, "b2").estado).toBe("na");
    expect(pasoDe({ ...base, origenViaje: "juk_directo" }, "b2").estado).toBe("na");
  });
});

describe("pasosIniciales — C1 por documentación de entrada (MIN-14)", () => {
  it("ETA → activo; VISA o ninguna → N/A", () => {
    expect(pasoDe(base, "c1").estado).toBe("pendiente");
    expect(pasoDe({ ...base, tipoEntrada: "visa" }, "c1")).toMatchObject({
      estado: "na",
      metadata: { motivo: "entrada_visa" },
    });
    expect(pasoDe({ ...base, tipoEntrada: "ninguna" }, "c1").estado).toBe("na");
  });
});

describe("pasosIniciales — D2 por tipo de viaje (ex CRIT-03)", () => {
  it("grupal → pendiente; individual → N/A", () => {
    expect(pasoDe(base, "d2").estado).toBe("pendiente");
    expect(pasoDe({ ...base, tipoViaje: "individual" }, "d2")).toMatchObject({
      estado: "na",
      metadata: { motivo: "viaje_individual" },
    });
  });
});

describe("edadAlInicioDelViaje", () => {
  it("calcula la edad exacta a la fecha de inicio", () => {
    const nac = new Date("2010-07-15");
    expect(edadAlInicioDelViaje(nac, new Date("2026-07-14"))).toBe(15);
    expect(edadAlInicioDelViaje(nac, new Date("2026-07-15"))).toBe(16);
    expect(edadAlInicioDelViaje(nac, new Date("2026-12-01"))).toBe(16);
  });
});

describe("versionParentalConsent (US-28)", () => {
  it("<16 → menor_16; 16-17 → 16_17; ≥18 → null", () => {
    expect(versionParentalConsent(15)).toBe("menor_16");
    expect(versionParentalConsent(16)).toBe("16_17");
    expect(versionParentalConsent(17)).toBe("16_17");
    expect(versionParentalConsent(18)).toBeNull();
  });
});
