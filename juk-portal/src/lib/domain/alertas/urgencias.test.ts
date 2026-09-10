import { describe, expect, it } from "vitest";

import type {
  AsignacionParaAlerta,
  CuotaParaAlerta,
  ViajeParaAlerta,
} from "./reglas";
import {
  alertasPasosVencidos,
  calcularAlumnosUrgentes,
  DIAS_VIAJE_INMINENTE,
  motivoDeAlerta,
  SEVERIDAD_LABELS,
  textoDiasHastaViaje,
  type EntradaAlumnosUrgentes,
  type PasoTrabadoParaAlerta,
} from "./urgencias";

// Igual que reglas.test.ts: los días se cuentan por calendario UTC y la zona
// del usuario no puede mover el resultado.
process.env.TZ = "America/Argentina/Buenos_Aires";

const HOY = new Date("2026-06-12T23:30:00Z");

const viaje = (over: Partial<ViajeParaAlerta> = {}): ViajeParaAlerta => ({
  id: "via-lejos",
  codigo: "UK-2026-OCT-LONDON",
  fechaInicio: new Date(Date.UTC(2026, 9, 10)),
  ...over,
});

const viajeCerca = viaje({
  id: "via-cerca",
  codigo: "UK-2026-JUL-YORK",
  fechaInicio: new Date(Date.UTC(2026, 6, 2)),
});

const asignacion = (over: Partial<AsignacionParaAlerta> = {}): AsignacionParaAlerta => ({
  asignacionId: "asg-1",
  viajeId: "via-lejos",
  dni: "45102338",
  nombre: "Lucía",
  apellido: "Pérez",
  vencimientoPasaporte: new Date(Date.UTC(2032, 0, 1)),
  ...over,
});

const cuotaVencida = (over: Partial<CuotaParaAlerta> = {}): CuotaParaAlerta => ({
  asignacionId: "asg-1",
  numero: 2,
  estado: "pendiente",
  fechaVencimiento: new Date(Date.UTC(2026, 5, 1)),
  ...over,
});

const paso = (over: Partial<PasoTrabadoParaAlerta> = {}): PasoTrabadoParaAlerta => ({
  asignacionId: "asg-1",
  codigo: "c3",
  estado: "bloqueado",
  notas: null,
  metadata: {},
  ...over,
});

const entrada = (over: Partial<EntradaAlumnosUrgentes> = {}): EntradaAlumnosUrgentes => ({
  viajes: [viaje(), viajeCerca],
  asignaciones: [],
  cuotasImpagas: [],
  pasosTrabados: [],
  hoy: HOY,
  ...over,
});

describe("SEVERIDAD_LABELS", () => {
  it("rotula las dos severidades con mayúscula y tilde", () => {
    expect(SEVERIDAD_LABELS.critica).toBe("Crítica");
    expect(SEVERIDAD_LABELS.alta).toBe("Alta");
  });
});

describe("textoDiasHastaViaje", () => {
  it("habla en días y distingue hoy, mañana y viaje en curso", () => {
    expect(textoDiasHastaViaje(-3)).toBe("Viaje en curso");
    expect(textoDiasHastaViaje(0)).toBe("Sale hoy");
    expect(textoDiasHastaViaje(1)).toBe("Sale mañana");
    expect(textoDiasHastaViaje(20)).toBe("Sale en 20 días");
  });
});

describe("motivoDeAlerta", () => {
  it("saca el nombre del alumno del título", () => {
    expect(
      motivoDeAlerta({ severidad: "critica", titulo: "ETA rechazado · Pérez, Lucía", detalle: "", href: "/" })
    ).toBe("ETA rechazado");
  });

  it("sin separador devuelve el título entero", () => {
    expect(motivoDeAlerta({ severidad: "alta", titulo: "Algo raro", detalle: "", href: "/" })).toBe(
      "Algo raro"
    );
  });
});

describe("alertasPasosVencidos", () => {
  const asigs = new Map([["asg-1", asignacion()]]);

  it("es alta, linkea al alumno por DNI y usa las notas como detalle", () => {
    const [alerta] = alertasPasosVencidos([paso({ codigo: "a1", estado: "vencido", notas: "Sin firma" })], asigs);
    expect(alerta?.severidad).toBe("alta");
    expect(alerta?.titulo).toMatch(/ vencido · Pérez, Lucía$/);
    expect(alerta?.href).toBe("/alumnos/45102338");
    expect(alerta?.detalle).toBe("Sin firma");
  });

  it("ignora pasos de asignaciones desconocidas", () => {
    expect(alertasPasosVencidos([paso({ asignacionId: "asg-9", estado: "vencido" })], asigs)).toEqual([]);
  });
});

describe("calcularAlumnosUrgentes", () => {
  it("sin alertas no hay alumnos urgentes", () => {
    expect(calcularAlumnosUrgentes(entrada({ asignaciones: [asignacion()] }))).toEqual([]);
  });

  it("reúne pasaporte, mora y pasos del mismo alumno en una sola fila", () => {
    const [fila, ...resto] = calcularAlumnosUrgentes(
      entrada({
        asignaciones: [asignacion({ vencimientoPasaporte: new Date(Date.UTC(2026, 11, 1)) })],
        cuotasImpagas: [cuotaVencida(), cuotaVencida({ numero: 3 })],
        pasosTrabados: [paso({ codigo: "c1", metadata: { subEstado: "rechazado" } })],
      })
    );

    expect(resto).toHaveLength(0);
    expect(fila?.dni).toBe("45102338");
    expect(fila?.viajeCodigo).toBe("UK-2026-OCT-LONDON");
    expect(fila?.severidad).toBe("critica");
    expect(fila?.totalAlertas).toBe(4);
    expect(fila?.motivos).toEqual([
      "Pasaporte por vencer",
      "Cuota 2 en mora",
      "Cuota 3 en mora",
      "ETA rechazado",
    ]);
  });

  it("respeta las exclusiones de las reglas del panel (C2 bloqueado por B1 no es urgente)", () => {
    const filas = calcularAlumnosUrgentes(
      entrada({
        asignaciones: [asignacion()],
        pasosTrabados: [paso({ codigo: "c2", metadata: { bloqueadoPor: "b1" } })],
      })
    );
    expect(filas).toEqual([]);
  });

  it("un paso vencido alcanza para entrar a la lista", () => {
    const filas = calcularAlumnosUrgentes(
      entrada({
        asignaciones: [asignacion()],
        pasosTrabados: [paso({ codigo: "a1", estado: "vencido" })],
      })
    );
    expect(filas).toHaveLength(1);
    expect(filas[0]?.severidad).toBe("alta");
    expect(filas[0]?.motivos[0]).toMatch(/ vencido$/);
  });

  it("cuenta los días hasta el viaje por día calendario y marca el inminente", () => {
    const [fila] = calcularAlumnosUrgentes(
      entrada({
        asignaciones: [asignacion({ viajeId: "via-cerca" })],
        pasosTrabados: [paso()],
      })
    );
    expect(fila?.diasHastaViaje).toBe(20);
    expect(fila?.diasHastaViaje).toBeLessThanOrEqual(DIAS_VIAJE_INMINENTE);
    expect(fila?.viajeInminente).toBe(true);
  });

  it("ignora asignaciones de viajes que no están activos", () => {
    const filas = calcularAlumnosUrgentes(
      entrada({
        asignaciones: [asignacion({ viajeId: "via-cancelado" })],
        pasosTrabados: [paso()],
      })
    );
    expect(filas).toEqual([]);
  });

  it("ordena: viaje en 30 días primero, después críticas, después el que sale antes", () => {
    const filas = calcularAlumnosUrgentes(
      entrada({
        viajes: [
          viaje(),
          viajeCerca,
          viaje({ id: "via-medio", codigo: "UK-2026-SEP-BATH", fechaInicio: new Date(Date.UTC(2026, 8, 1)) }),
        ],
        asignaciones: [
          asignacion({ asignacionId: "lejos-critica", dni: "1", apellido: "A", viajeId: "via-lejos" }),
          asignacion({ asignacionId: "cerca-alta", dni: "2", apellido: "B", viajeId: "via-cerca" }),
          asignacion({ asignacionId: "medio-alta", dni: "3", apellido: "C", viajeId: "via-medio" }),
          asignacion({ asignacionId: "lejos-alta", dni: "4", apellido: "D", viajeId: "via-lejos" }),
        ],
        pasosTrabados: [
          paso({ asignacionId: "lejos-critica", codigo: "c1", metadata: { subEstado: "rechazado" } }),
          paso({ asignacionId: "cerca-alta" }),
          paso({ asignacionId: "medio-alta" }),
          paso({ asignacionId: "lejos-alta" }),
        ],
      })
    );

    expect(filas.map((f) => f.dni)).toEqual(["2", "1", "3", "4"]);
  });

  it("a igual urgencia desempata por cantidad de alertas y después por apellido", () => {
    const filas = calcularAlumnosUrgentes(
      entrada({
        asignaciones: [
          asignacion({ asignacionId: "z", dni: "10", apellido: "Zapata" }),
          asignacion({ asignacionId: "a", dni: "11", apellido: "Álvarez" }),
          asignacion({ asignacionId: "m", dni: "12", apellido: "Martínez" }),
        ],
        pasosTrabados: [
          paso({ asignacionId: "z" }),
          paso({ asignacionId: "a" }),
          paso({ asignacionId: "m" }),
          paso({ asignacionId: "m", codigo: "c2", metadata: { bloqueadoPor: "documentacion" } }),
        ],
      })
    );

    expect(filas.map((f) => f.apellido)).toEqual(["Martínez", "Álvarez", "Zapata"]);
  });
});
