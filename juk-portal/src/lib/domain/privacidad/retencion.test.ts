import { describe, expect, it } from "vitest";

import { RETENCION, claseDe, debePurgar, fechaDeCorte } from "./retencion";

/** Hora deliberadamente "sucia": el plazo se cuenta por día calendario UTC. */
const AHORA = new Date("2026-09-16T15:30:00.000Z");
const HOY_UTC = Date.UTC(2026, 8, 16);

function haceDias(n: number, horaUTC = 0): Date {
  return new Date(HOY_UTC - n * 86_400_000 + horaUTC * 3_600_000);
}

describe("inscripción ya procesada (90 días)", () => {
  it("el día 89 todavía se conserva", () => {
    expect(
      debePurgar({ tipo: "inscripcion", estado: "procesada", fecha: haceDias(89), ahora: AHORA })
    ).toBe(false);
  });

  it("el día 90 se conserva: el plazo se cumple entero", () => {
    expect(
      debePurgar({ tipo: "inscripcion", estado: "procesada", fecha: haceDias(90), ahora: AHORA })
    ).toBe(false);
  });

  it("el día 91 se purga", () => {
    expect(
      debePurgar({ tipo: "inscripcion", estado: "procesada", fecha: haceDias(91), ahora: AHORA })
    ).toBe(true);
  });

  it("la hora no mueve el borde: el día 91 se purga aunque sea a las 23:00", () => {
    expect(
      debePurgar({
        tipo: "inscripcion",
        estado: "procesada",
        fecha: haceDias(91, 23),
        ahora: AHORA,
      })
    ).toBe(true);
  });

  it("una fecha futura (reloj corrido) no se purga", () => {
    expect(
      debePurgar({ tipo: "inscripcion", estado: "procesada", fecha: haceDias(-3), ahora: AHORA })
    ).toBe(false);
  });
});

describe("inscripción sin procesar (2 años)", () => {
  it("usa el plazo largo: a los 91 días no se purga", () => {
    expect(
      debePurgar({ tipo: "inscripcion", estado: "sin_procesar", fecha: haceDias(91), ahora: AHORA })
    ).toBe(false);
  });

  it("el día 729 todavía se conserva", () => {
    expect(
      debePurgar({
        tipo: "inscripcion",
        estado: "sin_procesar",
        fecha: haceDias(729),
        ahora: AHORA,
      })
    ).toBe(false);
  });

  it("el día 730 se conserva", () => {
    expect(
      debePurgar({
        tipo: "inscripcion",
        estado: "sin_procesar",
        fecha: haceDias(730),
        ahora: AHORA,
      })
    ).toBe(false);
  });

  it("el día 731 se purga", () => {
    expect(
      debePurgar({
        tipo: "inscripcion",
        estado: "sin_procesar",
        fecha: haceDias(731),
        ahora: AHORA,
      })
    ).toBe(true);
  });
});

describe("invitación", () => {
  it("sin usar y todavía vigente (vence en 10 días) no se purga", () => {
    expect(
      debePurgar({ tipo: "invitacion", estado: "sin_usar", fecha: haceDias(-10), ahora: AHORA })
    ).toBe(false);
  });

  it("sin usar, a los 89 días del vencimiento se conserva", () => {
    expect(
      debePurgar({ tipo: "invitacion", estado: "sin_usar", fecha: haceDias(89), ahora: AHORA })
    ).toBe(false);
  });

  it("sin usar, a los 91 días del vencimiento se purga", () => {
    expect(
      debePurgar({ tipo: "invitacion", estado: "sin_usar", fecha: haceDias(91), ahora: AHORA })
    ).toBe(true);
  });

  it("usada no se purga nunca, ni diez años después: su rastro vive en la inscripción que generó", () => {
    expect(
      debePurgar({ tipo: "invitacion", estado: "usada", fecha: haceDias(3650), ahora: AHORA })
    ).toBe(false);
    expect(claseDe({ tipo: "invitacion", estado: "usada", fecha: haceDias(3650) })).toBeNull();
  });
});

describe("filas ya purgadas", () => {
  it("una inscripción purgada no se vuelve a tocar", () => {
    expect(
      debePurgar({ tipo: "inscripcion", estado: "purgada", fecha: haceDias(5000), ahora: AHORA })
    ).toBe(false);
    expect(claseDe({ tipo: "inscripcion", estado: "purgada", fecha: haceDias(5000) })).toBeNull();
  });

  it("una invitación purgada tampoco", () => {
    expect(
      debePurgar({ tipo: "invitacion", estado: "purgada", fecha: haceDias(5000), ahora: AHORA })
    ).toBe(false);
  });
});

describe("fecha de corte", () => {
  it("cae en la medianoche UTC del día que cierra el plazo", () => {
    expect(fechaDeCorte("inscripcion_procesada", AHORA).toISOString()).toBe(
      new Date(HOY_UTC - 90 * 86_400_000).toISOString()
    );
    expect(fechaDeCorte("inscripcion_sin_procesar", AHORA).toISOString()).toBe(
      new Date(HOY_UTC - 730 * 86_400_000).toISOString()
    );
  });

  it("es coherente con debePurgar: purga exactamente lo anterior al corte", () => {
    const corte = fechaDeCorte("inscripcion_procesada", AHORA);
    for (const dias of [88, 89, 90, 91, 92]) {
      const fecha = haceDias(dias);
      expect(debePurgar({ tipo: "inscripcion", estado: "procesada", fecha, ahora: AHORA })).toBe(
        fecha.getTime() < corte.getTime()
      );
    }
  });
});

describe("catálogo de plazos", () => {
  it("todos los plazos son positivos y están documentados", () => {
    for (const plazo of Object.values(RETENCION)) {
      expect(plazo.dias).toBeGreaterThan(0);
      expect(plazo.desde.trim()).not.toBe("");
      expect(plazo.motivo.trim()).not.toBe("");
    }
  });

  it("los plazos son los acordados", () => {
    expect(RETENCION.inscripcion_procesada.dias).toBe(90);
    expect(RETENCION.inscripcion_sin_procesar.dias).toBe(730);
    expect(RETENCION.invitacion_sin_usar.dias).toBe(90);
  });
});
