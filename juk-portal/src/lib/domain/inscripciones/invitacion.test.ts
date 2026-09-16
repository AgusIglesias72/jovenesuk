import { describe, expect, it } from "vitest";

import {
  LOTE_TAMANIO,
  MAX_DESTINATARIOS_LOTE,
  PAUSA_ENTRE_ENVIOS_MS,
  RESERVA_VENCIDA_MS,
  VIGENCIA_DIAS,
  duracionEstimadaMs,
  estadoInvitacion,
  excedeMaximoDestinatarios,
  fechaDeVencimiento,
  lotesDe,
  puedeCargar,
  puedeReservar,
  reservaVencida,
  reservaVigente,
} from "./invitacion";

const EXPIRA_EL = new Date("2026-12-15T10:20:30.000Z");

/** Invitación sana: ni revocada ni respondida. */
function vigenteEn(ahora: Date) {
  return estadoInvitacion({
    expiraEl: EXPIRA_EL,
    revocadaEl: null,
    respondidaEl: null,
    ahora,
  });
}

describe("estadoInvitacion", () => {
  it("vigente un milisegundo ANTES de expiraEl", () => {
    expect(vigenteEn(new Date(EXPIRA_EL.getTime() - 1))).toBe("vigente");
  });

  it("vencida en el instante exacto de expiraEl: el borde es exclusivo", () => {
    expect(vigenteEn(new Date(EXPIRA_EL.getTime()))).toBe("vencida");
  });

  it("vencida un milisegundo DESPUÉS de expiraEl", () => {
    expect(vigenteEn(new Date(EXPIRA_EL.getTime() + 1))).toBe("vencida");
  });

  it("revocada le gana a vencida: dice por qué no abre, no solo que caducó", () => {
    expect(
      estadoInvitacion({
        expiraEl: EXPIRA_EL,
        revocadaEl: new Date("2026-10-01T00:00:00.000Z"),
        respondidaEl: null,
        ahora: new Date(EXPIRA_EL.getTime() + 86_400_000),
      })
    ).toBe("revocada");
  });

  it("revocada le gana a vigente", () => {
    expect(
      estadoInvitacion({
        expiraEl: EXPIRA_EL,
        revocadaEl: new Date("2026-10-01T00:00:00.000Z"),
        respondidaEl: null,
        ahora: new Date("2026-10-02T00:00:00.000Z"),
      })
    ).toBe("revocada");
  });

  it("respondida le gana a todo: revocada y vencida al mismo tiempo", () => {
    expect(
      estadoInvitacion({
        expiraEl: EXPIRA_EL,
        revocadaEl: new Date("2026-11-01T00:00:00.000Z"),
        respondidaEl: new Date("2026-10-05T00:00:00.000Z"),
        ahora: new Date("2027-03-01T00:00:00.000Z"),
      })
    ).toBe("respondida");
  });
});

describe("puedeCargar", () => {
  it("solo una invitación vigente abre el formulario", () => {
    expect(puedeCargar("vigente")).toBe(true);
    expect(puedeCargar("vencida")).toBe(false);
    expect(puedeCargar("revocada")).toBe(false);
    expect(puedeCargar("respondida")).toBe(false);
  });
});

describe("fechaDeVencimiento", () => {
  it("son 90 días exactos desde la emisión, con hora y todo", () => {
    const emitida = new Date("2026-09-16T15:30:00.000Z");
    expect(fechaDeVencimiento(emitida).toISOString()).toBe("2026-12-15T15:30:00.000Z");
  });

  it("la invitación sigue vigente el día anterior a vencer y no el día después", () => {
    const emitida = new Date("2026-09-16T15:30:00.000Z");
    const expiraEl = fechaDeVencimiento(emitida);
    const marcas = { expiraEl, revocadaEl: null, respondidaEl: null };

    expect(VIGENCIA_DIAS).toBe(90);
    expect(
      estadoInvitacion({ ...marcas, ahora: new Date(expiraEl.getTime() - 86_400_000) })
    ).toBe("vigente");
    expect(
      estadoInvitacion({ ...marcas, ahora: new Date(expiraEl.getTime() + 86_400_000) })
    ).toBe("vencida");
  });
});

describe("reserva del claim en dos fases", () => {
  const reservadaEl = new Date("2026-10-01T12:00:00.000Z");

  it("sin reserva previa no hay nada vigente ni vencido", () => {
    const ahora = new Date("2026-10-01T12:00:00.000Z");
    expect(reservaVigente(null, ahora)).toBe(false);
    expect(reservaVencida(null, ahora)).toBe(false);
  });

  it("un milisegundo antes de los 5 minutos la reserva sigue viva", () => {
    const ahora = new Date(reservadaEl.getTime() + RESERVA_VENCIDA_MS - 1);
    expect(reservaVigente(reservadaEl, ahora)).toBe(true);
    expect(reservaVencida(reservadaEl, ahora)).toBe(false);
  });

  it("a los 5 minutos exactos ya venció: el borde es inclusivo", () => {
    const ahora = new Date(reservadaEl.getTime() + RESERVA_VENCIDA_MS);
    expect(reservaVigente(reservadaEl, ahora)).toBe(false);
    expect(reservaVencida(reservadaEl, ahora)).toBe(true);
  });

  it("una reserva viva bloquea a un segundo tutor; una abandonada no", () => {
    const viva = new Date(reservadaEl.getTime() + RESERVA_VENCIDA_MS - 1);
    const abandonada = new Date(reservadaEl.getTime() + RESERVA_VENCIDA_MS);

    expect(puedeReservar({ estado: "vigente", reservadaEl, ahora: viva })).toBe(false);
    expect(puedeReservar({ estado: "vigente", reservadaEl, ahora: abandonada })).toBe(true);
    expect(puedeReservar({ estado: "vigente", reservadaEl: null, ahora: viva })).toBe(true);
  });

  it("una invitación que no abre tampoco se reserva, aunque la reserva esté libre", () => {
    const ahora = new Date("2026-10-01T12:00:00.000Z");
    expect(puedeReservar({ estado: "vencida", reservadaEl: null, ahora })).toBe(false);
    expect(puedeReservar({ estado: "respondida", reservadaEl: null, ahora })).toBe(false);
  });
});

describe("tope y armado del lote", () => {
  it("200 destinatarios entran; 201 no", () => {
    expect(MAX_DESTINATARIOS_LOTE).toBe(200);
    expect(excedeMaximoDestinatarios(MAX_DESTINATARIOS_LOTE)).toBe(false);
    expect(excedeMaximoDestinatarios(MAX_DESTINATARIOS_LOTE + 1)).toBe(true);
    expect(excedeMaximoDestinatarios(0)).toBe(false);
  });

  it("parte en tandas de LOTE_TAMANIO y deja el resto en la última", () => {
    const destinatarios = Array.from({ length: 23 }, (_, i) => i);
    const lotes = lotesDe(destinatarios);

    expect(lotes).toHaveLength(3);
    expect(lotes[0]).toHaveLength(LOTE_TAMANIO);
    expect(lotes[2]).toEqual([20, 21, 22]);
    expect(lotes.flat()).toEqual(destinatarios);
  });

  it("una lista vacía no genera tandas", () => {
    expect(lotesDe([])).toEqual([]);
  });

  it("la pausa va ENTRE envíos: el primero no espera", () => {
    expect(duracionEstimadaMs(0)).toBe(0);
    expect(duracionEstimadaMs(1)).toBe(0);
    expect(duracionEstimadaMs(3)).toBe(2 * PAUSA_ENTRE_ENVIOS_MS);
  });
});
