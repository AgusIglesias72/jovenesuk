import { describe, expect, it } from "vitest";

import { EXCURSION_ESTADO_LABELS, PASAJE_SUBESTADO_LABELS } from "./labels";
import {
  EXCURSION_ESTADOS,
  PASAJE_SUBESTADOS,
  PASAJE_SUBESTADOS_GRUPAL,
  PASAJE_SUBESTADOS_INDIVIDUAL,
  esPasajeSubEstadoDe,
  excursionesMetadataSchema,
  normalizarExcursionEstado,
  normalizarPasajeSubEstado,
  pasajeSubEstadosDe,
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

  it("acepta todos los sub-estados del PRD, Grupal e Individual", () => {
    for (const subEstado of PASAJE_SUBESTADOS) {
      expect(pasajesMetadataSchema.safeParse({ subEstado }).success).toBe(true);
    }
  });

  it("traduce los sub-estados viejos al guardar (sin migración SQL)", () => {
    expect(pasajesMetadataSchema.parse({ subEstado: "sin_iniciar" }).subEstado).toBe(
      "pendiente_cotizacion"
    );
    expect(pasajesMetadataSchema.parse({ subEstado: "reservado" }).subEstado).toBe("confirmado");
    expect(pasajesMetadataSchema.parse({ subEstado: "emitido" }).subEstado).toBe("emitido");
  });
});

describe("sub-estados de Pasajes por tipo de viaje (PRD M7 P1)", () => {
  it("Grupal: Pendiente cotización → Cotizado → Confirmado → Emitido", () => {
    expect(pasajeSubEstadosDe("grupal")).toEqual([
      "pendiente_cotizacion",
      "cotizado",
      "confirmado",
      "emitido",
    ]);
  });

  it("Individual: Pendiente datos / Datos recibidos", () => {
    expect(pasajeSubEstadosDe("individual")).toEqual(["pendiente_datos", "datos_recibidos"]);
  });

  it("un sub-estado Individual no vale en un viaje Grupal, ni al revés", () => {
    for (const s of PASAJE_SUBESTADOS_INDIVIDUAL) {
      expect(esPasajeSubEstadoDe(s, "grupal")).toBe(false);
      expect(esPasajeSubEstadoDe(s, "individual")).toBe(true);
    }
    for (const s of PASAJE_SUBESTADOS_GRUPAL) {
      expect(esPasajeSubEstadoDe(s, "individual")).toBe(false);
      expect(esPasajeSubEstadoDe(s, "grupal")).toBe(true);
    }
  });
});

describe("normalizarPasajeSubEstado", () => {
  it("devuelve el vigente, traduce el legacy y tolera lo desconocido", () => {
    expect(normalizarPasajeSubEstado("cotizado")).toBe("cotizado");
    expect(normalizarPasajeSubEstado("sin_iniciar")).toBe("pendiente_cotizacion");
    expect(normalizarPasajeSubEstado("reservado")).toBe("confirmado");
    expect(normalizarPasajeSubEstado("volando")).toBeUndefined();
    expect(normalizarPasajeSubEstado("")).toBeUndefined();
    expect(normalizarPasajeSubEstado(42)).toBeUndefined();
    expect(normalizarPasajeSubEstado(undefined)).toBeUndefined();
  });

  it("no confunde claves heredadas de Object con valores legacy", () => {
    expect(normalizarPasajeSubEstado("toString")).toBeUndefined();
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

  it("acepta los estados del PRD (US-38) y rechaza uno inventado", () => {
    for (const estado of EXCURSION_ESTADOS) {
      expect(
        excursionesMetadataSchema.safeParse({ excursiones: [{ nombre: "Stonehenge", estado }] }).success
      ).toBe(true);
    }
    expect(
      excursionesMetadataSchema.safeParse({ excursiones: [{ nombre: "Stonehenge", estado: "soñada" }] })
        .success
    ).toBe(false);
  });

  it("traduce reservada y pagada a confirmada", () => {
    const r = excursionesMetadataSchema.parse({
      excursiones: [
        { nombre: "Chelsea stadium", estado: "pagada" },
        { nombre: "Tower Bridge", estado: "reservada" },
      ],
    });
    expect(r.excursiones.map((e) => e.estado)).toEqual(["confirmada", "confirmada"]);
  });
});

describe("normalizarExcursionEstado", () => {
  it("devuelve el vigente, traduce el legacy y tolera lo desconocido", () => {
    expect(normalizarExcursionEstado("aprobada_representante")).toBe("aprobada_representante");
    expect(normalizarExcursionEstado("pagada")).toBe("confirmada");
    expect(normalizarExcursionEstado("reservada")).toBe("confirmada");
    expect(normalizarExcursionEstado("otra")).toBeUndefined();
    expect(normalizarExcursionEstado(null)).toBeUndefined();
  });
});

describe("labels de sub-estados", () => {
  it("todo sub-estado de Pasajes y estado de Excursión tiene su etiqueta", () => {
    for (const s of PASAJE_SUBESTADOS) expect(PASAJE_SUBESTADO_LABELS[s]).toBeTruthy();
    for (const s of EXCURSION_ESTADOS) expect(EXCURSION_ESTADO_LABELS[s]).toBeTruthy();
    expect(EXCURSION_ESTADO_LABELS.aprobada_representante).toBe("Aprobada por representante");
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
