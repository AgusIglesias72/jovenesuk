import { describe, expect, it } from "vitest";

import {
  accionesDeInscripcion,
  estaResuelta,
  permiteAccion,
  tieneVinculoPendiente,
} from "./acciones";
import { INSCRIPCION_ESTADOS, type InscripcionEstado } from "./schema";

const ALUMNO = "aaaaaaaa-0000-4000-8000-000000000009";

function ficha(estado: InscripcionEstado, alumnoId: string | null = null) {
  return { estado, alumnoId };
}

describe("accionesDeInscripcion", () => {
  it("una ficha recibida se procesa o se anula", () => {
    expect(accionesDeInscripcion(ficha("recibida"))).toEqual(["procesar", "anular"]);
  });

  it("la que quedó sin alta (sin token) todavía se procesa a mano", () => {
    expect(accionesDeInscripcion(ficha("requiere_revision"))).toEqual(["procesar", "anular"]);
  });

  it("con el alumno ya creado NO se vuelve a procesar: lo que queda es el vínculo", () => {
    // Volver a correr el alta caería en `duplicada` por el unique de DNI y le
    // borraría a la ficha el motivo real (se colgó de una cuenta que existía).
    const conAlumno = ficha("requiere_revision", ALUMNO);

    expect(accionesDeInscripcion(conAlumno)).toEqual(["confirmar_vinculo", "anular"]);
    expect(permiteAccion(conAlumno, "procesar")).toBe(false);
    expect(permiteAccion(conAlumno, "reintentar")).toBe(false);
  });

  it("la que falló se reintenta, no se procesa de cero", () => {
    expect(accionesDeInscripcion(ficha("error"))).toEqual(["reintentar", "anular"]);
  });

  it("una duplicada solo se descarta: al alumno existente no lo toca nadie", () => {
    expect(accionesDeInscripcion(ficha("duplicada", ALUMNO))).toEqual(["anular"]);
  });

  it("las cerradas no ofrecen nada, y una procesada tampoco se anula", () => {
    expect(accionesDeInscripcion(ficha("procesada", ALUMNO))).toEqual([]);
    expect(accionesDeInscripcion(ficha("anulada"))).toEqual([]);
    expect(permiteAccion(ficha("procesada", ALUMNO), "anular")).toBe(false);
  });

  it("anular está disponible en todo lo que sigue abierto", () => {
    for (const estado of ["recibida", "requiere_revision", "error", "duplicada"] as const) {
      expect(permiteAccion(ficha(estado), "anular")).toBe(true);
    }
  });

  it("cubre todos los estados del enum sin caerse", () => {
    for (const estado of INSCRIPCION_ESTADOS) {
      expect(Array.isArray(accionesDeInscripcion(ficha(estado)))).toBe(true);
    }
  });
});

describe("estaResuelta", () => {
  it("procesada y duplicada ya tienen desenlace: el reintento es no-op", () => {
    expect(estaResuelta(ficha("procesada", ALUMNO))).toBe(true);
    expect(estaResuelta(ficha("duplicada", ALUMNO))).toBe(true);
  });

  it("anulada no es 'resuelta': es una decisión del equipo, no un desenlace del alta", () => {
    expect(estaResuelta(ficha("anulada"))).toBe(false);
    expect(estaResuelta(ficha("recibida"))).toBe(false);
    expect(estaResuelta(ficha("error"))).toBe(false);
  });
});

describe("tieneVinculoPendiente", () => {
  it("solo cuando la revisión es sobre un alumno que ya existe", () => {
    expect(tieneVinculoPendiente(ficha("requiere_revision", ALUMNO))).toBe(true);
    expect(tieneVinculoPendiente(ficha("requiere_revision"))).toBe(false);
    expect(tieneVinculoPendiente(ficha("procesada", ALUMNO))).toBe(false);
  });
});
