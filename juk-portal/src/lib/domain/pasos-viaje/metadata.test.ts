import { describe, expect, it } from "vitest";

import {
  excursionesMetadataSchema,
  pasajesMetadataSchema,
  tarjetaTransporteMetadataSchema,
  transfersMetadataSchema,
} from "./metadata";

describe("pasajesMetadataSchema", () => {
  it("acepta metadata vacía (todos los campos son opcionales)", () => {
    expect(pasajesMetadataSchema.safeParse({}).success).toBe(true);
  });

  it("acepta un pasaje completo", () => {
    const r = pasajesMetadataSchema.safeParse({
      subEstado: "emitido",
      aerolinea: "British Airways",
      numeroVuelo: "BA244",
      eTicketUrl: "https://example.com/eticket.pdf",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un subEstado inventado", () => {
    expect(pasajesMetadataSchema.safeParse({ subEstado: "volando" }).success).toBe(false);
  });

  it("la URL del e-ticket puede ser vacía pero no inválida", () => {
    expect(pasajesMetadataSchema.safeParse({ eTicketUrl: "" }).success).toBe(true);
    expect(pasajesMetadataSchema.safeParse({ eTicketUrl: "no-es-url" }).success).toBe(false);
  });
});

describe("excursionesMetadataSchema", () => {
  it("defaultea a lista vacía", () => {
    const r = excursionesMetadataSchema.parse({});
    expect(r.excursiones).toEqual([]);
  });

  it("exige nombre en cada excursión", () => {
    const r = excursionesMetadataSchema.safeParse({ excursiones: [{ nombre: "" }] });
    expect(r.success).toBe(false);
  });

  it("rechaza costos negativos", () => {
    const r = excursionesMetadataSchema.safeParse({
      excursiones: [{ nombre: "Tower of London", costoGbp: -5 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("transfersMetadataSchema", () => {
  it("acepta costo por alumno en GBP no negativo", () => {
    expect(transfersMetadataSchema.safeParse({ costoPorAlumnoGbp: 0 }).success).toBe(true);
    expect(transfersMetadataSchema.safeParse({ costoPorAlumnoGbp: -1 }).success).toBe(false);
  });
});

describe("tarjetaTransporteMetadataSchema", () => {
  it("la cantidad debe ser un entero no negativo", () => {
    expect(tarjetaTransporteMetadataSchema.safeParse({ cantidad: 30 }).success).toBe(true);
    expect(tarjetaTransporteMetadataSchema.safeParse({ cantidad: 2.5 }).success).toBe(false);
    expect(tarjetaTransporteMetadataSchema.safeParse({ cantidad: -1 }).success).toBe(false);
  });
});
