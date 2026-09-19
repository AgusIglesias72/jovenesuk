import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InvitacionReservada } from "@/lib/db/queries/invitaciones";
import type { Viaje } from "@/lib/db/schema/viajes";

/*
 * Lo que el job le pasa al mail. El claim, el reciclado y el sellado se prueban
 * contra Postgres en `enviar-lote-invitaciones.integration.test.ts`, que
 * inyecta su propio sender: por eso el sender REAL —el que lleva el vencimiento,
 * el viaje y la baja al mail— se prueba acá, con la base y el envío mockeados.
 */

const q = vi.hoisted(() => ({
  reclamarReservasVencidas: vi.fn(async () => 0),
  reservarTanda: vi.fn(async (): Promise<InvitacionReservada[]> => []),
  marcarEnviada: vi.fn(async () => true),
  marcarFallida: vi.fn(async () => true),
  resumenLote: vi.fn(async () => ({ pendientes: 0 })),
  getProspectoById: vi.fn(),
  getViajeById: vi.fn(),
  sendInvitacionInscripcionEmail: vi.fn(async () => ({ id: "re_123" })),
}));

vi.mock("@/lib/db/queries/invitaciones", () => ({
  reclamarReservasVencidas: q.reclamarReservasVencidas,
  reservarTanda: q.reservarTanda,
  marcarEnviada: q.marcarEnviada,
  marcarFallida: q.marcarFallida,
  resumenLote: q.resumenLote,
}));
vi.mock("@/lib/db/queries/prospectos", () => ({ getProspectoById: q.getProspectoById }));
vi.mock("@/lib/db/queries/viajes", () => ({ getViajeById: q.getViajeById }));
vi.mock("@/lib/email/send-invitacion-inscripcion", () => ({
  sendInvitacionInscripcionEmail: q.sendInvitacionInscripcionEmail,
}));

import { enviarTandaDelLote, invitacionParaEnviar } from "./enviar-lote-invitaciones";

const APP_URL = "https://portal.jovenesenuk.com";
const VENCE = new Date("2026-12-18T01:30:00.000Z");
const VIAJE_ID = "11111111-1111-4111-8111-111111111111";

const VIAJE = {
  id: VIAJE_ID,
  nombre: "Londres en Julio",
  codigo: "UK-2026-JUL-LONDON",
  fechaInicio: new Date("2026-07-04"),
  fechaFin: new Date("2026-07-18"),
  paisDestino: "reino_unido",
} as Viaje;

function reservada(overrides: Partial<InvitacionReservada> = {}): InvitacionReservada {
  return {
    comunicacionId: "com-1",
    prospectoId: "pro-1",
    prospectoNombre: "Colegio Ejemplo",
    contactoNombre: "Prof. Laura",
    destinatario: "contacto@colegio-ejemplo.edu.ar",
    viajeId: VIAJE_ID,
    variante: "b",
    expiraEl: VENCE,
    token: "tok-en-claro",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP_URL);
  q.getProspectoById.mockResolvedValue({ suscritoOutreach: true, unsubscribeToken: "baja-tok" });
  q.getViajeById.mockResolvedValue(VIAJE);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("invitacionParaEnviar", () => {
  it("lleva al mail el vencimiento real de la fila, el viaje completo y la baja con token", () => {
    expect(invitacionParaEnviar(reservada(), VIAJE, { unsubscribeToken: "baja-tok" }, "Asunto")).toEqual({
      to: "contacto@colegio-ejemplo.edu.ar",
      token: "tok-en-claro",
      variante: "b",
      contactoNombre: "Prof. Laura",
      prospectoNombre: "Colegio Ejemplo",
      viajeNombre: "Londres en Julio",
      viajeCodigo: "UK-2026-JUL-LONDON",
      viajeDesde: VIAJE.fechaInicio,
      viajeHasta: VIAJE.fechaFin,
      viajePais: "reino_unido",
      expiraEl: VENCE,
      asunto: "Asunto",
      unsubscribeUrl: `${APP_URL}/baja?token=baja-tok`,
    });
  });

  it("sin viaje en la campaña no inventa uno: todo lo del viaje va en null", () => {
    const datos = invitacionParaEnviar(reservada({ viajeId: null }), null, { unsubscribeToken: "t" }, null);
    expect(datos).toMatchObject({
      viajeNombre: null,
      viajeCodigo: null,
      viajeDesde: null,
      viajeHasta: null,
      viajePais: null,
      asunto: null,
      expiraEl: VENCE,
    });
  });

  it("sin la variable de entorno, la baja apunta a producción y no a localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
    const datos = invitacionParaEnviar(reservada(), VIAJE, { unsubscribeToken: "t" }, null);
    expect(datos.unsubscribeUrl).toBe("https://portal.jovenesenuk.com/baja?token=t");
  });
});

describe("enviarTandaDelLote con el sender real", () => {
  it("le pasa al mail el expiraEl y el viaje de la campaña, y sella con el id de Resend", async () => {
    q.reservarTanda.mockResolvedValue([reservada()]);

    const resultado = await enviarTandaDelLote("lote-1", { pausaMs: 0, asunto: "Asunto" });

    expect(q.sendInvitacionInscripcionEmail).toHaveBeenCalledTimes(1);
    expect(q.sendInvitacionInscripcionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        expiraEl: VENCE,
        viajeCodigo: "UK-2026-JUL-LONDON",
        viajeDesde: VIAJE.fechaInicio,
        viajeHasta: VIAJE.fechaFin,
        viajePais: "reino_unido",
        asunto: "Asunto",
      })
    );
    expect(q.marcarEnviada).toHaveBeenCalledWith("com-1", "re_123");
    expect(resultado).toEqual({ enviados: 1, fallidos: 0, restantes: 0 });
  });

  it("pide el viaje UNA vez por tanda aunque lo compartan todas las invitaciones", async () => {
    q.reservarTanda.mockResolvedValue([
      reservada({ comunicacionId: "a" }),
      reservada({ comunicacionId: "b" }),
      reservada({ comunicacionId: "c" }),
    ]);

    await enviarTandaDelLote("lote-1", { pausaMs: 0 });

    expect(q.getViajeById).toHaveBeenCalledTimes(1);
    expect(q.sendInvitacionInscripcionEmail).toHaveBeenCalledTimes(3);
  });

  it("el que se dio de baja entre la campaña y el envío no recibe nada: la fila queda fallida", async () => {
    q.reservarTanda.mockResolvedValue([reservada()]);
    q.getProspectoById.mockResolvedValue({ suscritoOutreach: false, unsubscribeToken: "t" });

    const resultado = await enviarTandaDelLote("lote-1", { pausaMs: 0 });

    expect(q.sendInvitacionInscripcionEmail).not.toHaveBeenCalled();
    expect(q.marcarFallida).toHaveBeenCalledWith("com-1", "El prospecto se dio de baja de los correos.");
    expect(resultado.fallidos).toBe(1);
  });
});
