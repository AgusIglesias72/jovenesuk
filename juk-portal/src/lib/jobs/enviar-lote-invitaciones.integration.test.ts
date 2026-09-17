import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { InvitacionReservada } from "@/lib/db/queries/invitaciones";
// Del barril y no de `schema/prospectos` directo: ese módulo y
// `schema/inscripciones` se importan mutuamente (mismo motivo que explica
// `queries/invitaciones.integration.test.ts`).
import { prospectoComunicaciones, prospectos, type ProspectoComunicacion } from "@/lib/db/schema";
import { PAUSA_ENTRE_ENVIOS_MS, RESERVA_VENCIDA_MS } from "@/lib/domain/inscripciones/invitacion";
import { hashToken } from "@/lib/utils/token-opaco";

import { crearFixtures, dia, integracionHabilitada } from "../../../tests/integration/fixtures";

type Job = typeof import("./enviar-lote-invitaciones");
type InvitacionesQ = typeof import("@/lib/db/queries/invitaciones");

/*
 * El motor del envío masivo contra Postgres.
 *
 * Nada de esto tiene sentido con la base mockeada: lo que está bajo prueba es
 * que el claim en dos fases sobreviva a un corte y que una tanda mande cada
 * token UNA sola vez, y las dos cosas son comportamiento del motor.
 *
 * El sender entra siempre por `opciones.enviar`: el mail en sí no es parte de
 * este job (lo prueba el test de `send-invitacion-inscripcion`), y con un doble
 * podemos hacer fallar UN envío exacto, que es el caso que importa. `dormir`
 * también se inyecta: con la pausa real, cada tanda de 10 tardaría seis
 * segundos.
 */

const fx = crearFixtures("ENVLT");
const PREFIJO = `[INT] ${fx.corrida} `;
const VENCIMIENTO = new Date("2099-01-01T00:00:00.000Z");

const emailDe = (sufijo: string) => `int+${fx.corrida.toLowerCase()}-${sufijo}@int.jovenesenuk.com`;

let secuencia = 0;
const proximo = () => (secuencia += 1);

describe.skipIf(!integracionHabilitada)("enviarTandaDelLote contra Postgres", () => {
  let job: Job;
  let q: InvitacionesQ;
  let viajeId: string;
  let baseId: string;
  const prospectoIds: string[] = [];

  /** Sender que siempre acepta y anota lo que "se mandó", más las pausas. */
  function senderDoble() {
    const vistos: InvitacionReservada[] = [];
    const pausas: number[] = [];
    return {
      vistos,
      pausas,
      opciones: {
        dormir: async (ms: number) => {
          pausas.push(ms);
        },
        enviar: async (invitacion: InvitacionReservada) => {
          vistos.push(invitacion);
          return { id: `re_int_${vistos.length}` };
        },
      },
    };
  }

  async function crearLote(cantidad: number) {
    return q.crearLoteInvitaciones({
      destinatarios: Array.from({ length: cantidad }, () => ({
        prospectoId: baseId,
        destinatario: emailDe(`lote${proximo()}`),
      })),
      viajeId,
      variante: "b",
      expiraEl: VENCIMIENTO,
    });
  }

  async function filaDe(id: string): Promise<ProspectoComunicacion> {
    const [fila] = await fx
      .db()
      .select()
      .from(prospectoComunicaciones)
      .where(eq(prospectoComunicaciones.id, id));
    if (!fila) throw new Error(`no existe la comunicación ${id}.`);
    return fila;
  }

  beforeAll(async () => {
    await fx.iniciar();
    job = await import("./enviar-lote-invitaciones");
    q = await import("@/lib/db/queries/invitaciones");

    const colegio = await fx.colegio();
    viajeId = (await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: dia("2031-07-01") })).id;

    const [row] = await fx
      .db()
      .insert(prospectos)
      .values({
        nombre: `${PREFIJO}Base`,
        ciudad: "[INT] Ciudad",
        emails: [emailDe("base")],
        suscritoOutreach: true,
        unsubscribeToken: randomUUID(),
      })
      .returning();
    if (!row) throw new Error("el INSERT de prospecto no devolvió fila.");
    prospectoIds.push(row.id);
    baseId = row.id;
  });

  afterAll(async () => {
    if (prospectoIds.length) {
      // Las comunicaciones cascadean con su prospecto.
      await fx.db().delete(prospectos).where(inArray(prospectos.id, prospectoIds));
    }
    await fx.limpiar();
  });

  it("manda una tanda, deja el resto pendiente y `restantes` dice cuántos faltan", async () => {
    const lote = await crearLote(5);
    const doble = senderDoble();

    const r = await job.enviarTandaDelLote(lote.loteId, { tamanio: 2, ...doble.opciones });

    expect(r).toEqual({ enviados: 2, fallidos: 0, restantes: 3 });
    // La pausa va ENTRE dos envíos: el primero no espera.
    expect(doble.pausas).toEqual([PAUSA_ENTRE_ENVIOS_MS]);

    for (const [i, invitacion] of doble.vistos.entries()) {
      const fila = await filaDe(invitacion.comunicacionId);
      expect(fila).toMatchObject({
        estado: "enviado",
        resendMessageId: `re_int_${i + 1}`,
        // El lease se limpia: esa columna es también la reserva del formulario
        // público cuando la familia abre el link.
        invitacionReservadoEl: null,
      });
      // El token que viajó en el mail es el que abre exactamente esa fila.
      expect(fila.invitacionTokenHash).toBe(hashToken(invitacion.token));
      expect(invitacion.destinatario).toBeTruthy();
    }

    const resto = lote.invitaciones.filter(
      (i) => !doble.vistos.some((v) => v.comunicacionId === i.comunicacionId)
    );
    expect(resto).toHaveLength(3);
    for (const pendiente of resto) {
      expect(await filaDe(pendiente.comunicacionId)).toMatchObject({
        estado: "pendiente",
        // Sin token: el link de una invitación que todavía no salió no existe.
        invitacionTokenHash: null,
        invitacionReservadoEl: null,
      });
    }
  });

  it("un envío que falla marca SOLO esa fila y no corta la tanda", async () => {
    const lote = await crearLote(3);
    // El sender va a mano: el que falla es el SEGUNDO del recorrido, para que
    // el tercero tenga que salir igual.
    const vistos: InvitacionReservada[] = [];
    const r = await job.enviarTandaDelLote(lote.loteId, {
      tamanio: 3,
      dormir: async () => {},
      enviar: async (invitacion) => {
        vistos.push(invitacion);
        if (vistos.length === 2) throw new Error("[INT] 422 dominio inexistente");
        return { id: `re_int_falla_${vistos.length}` };
      },
    });

    expect(r).toEqual({ enviados: 2, fallidos: 1, restantes: 0 });
    // Lo que importa: el tercero se intentó igual.
    expect(vistos).toHaveLength(3);

    const fallida = await filaDe(vistos[1]!.comunicacionId);
    expect(fallida).toMatchObject({
      estado: "fallido",
      resendMessageId: null,
      invitacionReservadoEl: null,
      meta: { invitacionErrorEnvio: "[INT] 422 dominio inexistente" },
    });

    for (const ok of [vistos[0]!, vistos[2]!]) {
      expect(await filaDe(ok.comunicacionId)).toMatchObject({ estado: "enviado" });
    }

    // Y la fallida NO vuelve sola a la cola: reintentar es una decisión del equipo.
    const segunda = await job.enviarTandaDelLote(lote.loteId, {
      dormir: async () => {},
      enviar: async () => {
        throw new Error("[INT] no debería intentar ningún envío.");
      },
    });
    expect(segunda).toEqual({ enviados: 0, fallidos: 0, restantes: 0 });
    expect((await filaDe(vistos[1]!.comunicacionId)).estado).toBe("fallido");
  });

  it("dos ejecuciones seguidas nunca mandan dos veces el mismo token", async () => {
    const lote = await crearLote(4);
    const doble = senderDoble();

    const primera = await job.enviarTandaDelLote(lote.loteId, { tamanio: 2, ...doble.opciones });
    const segunda = await job.enviarTandaDelLote(lote.loteId, { tamanio: 2, ...doble.opciones });

    expect(primera).toEqual({ enviados: 2, fallidos: 0, restantes: 2 });
    expect(segunda).toEqual({ enviados: 2, fallidos: 0, restantes: 0 });

    const ids = doble.vistos.map((v) => v.comunicacionId);
    const tokens = doble.vistos.map((v) => v.token);
    expect(ids).toHaveLength(4);
    // El corazón del claim en dos fases: ninguna invitación salió dos veces.
    expect(new Set(ids).size).toBe(4);
    expect(new Set(tokens).size).toBe(4);
    expect([...ids].sort()).toEqual(lote.invitaciones.map((i) => i.comunicacionId).sort());

    // Una tercera llamada sobre el lote agotado no manda nada.
    const tercera = await job.enviarTandaDelLote(lote.loteId, { ...doble.opciones });
    expect(tercera).toEqual({ enviados: 0, fallidos: 0, restantes: 0 });
    expect(doble.vistos).toHaveLength(4);

    // Lo mismo con las dos llamadas encimadas (dos pestañas abiertas a la vez):
    // `skip locked` reparte y nadie repite.
    const otro = await crearLote(4);
    const encimadas = senderDoble();
    const [a, b] = await Promise.all([
      job.enviarTandaDelLote(otro.loteId, { tamanio: 2, ...encimadas.opciones }),
      job.enviarTandaDelLote(otro.loteId, { tamanio: 2, ...encimadas.opciones }),
    ]);
    expect(a.fallidos + b.fallidos).toBe(0);
    expect(a.enviados + b.enviados).toBe(4);
    expect(new Set(encimadas.vistos.map((v) => v.comunicacionId)).size).toBe(4);
    expect(new Set(encimadas.vistos.map((v) => v.token)).size).toBe(4);
  });

  it("una fila que quedó en `enviando` por un corte se recicla y se reintenta", async () => {
    const lote = await crearLote(1);
    // La pestaña se cerró entre la reserva y el mail: la fila quedó `enviando`
    // y su token en claro se fue con la pestaña.
    const ahora = new Date();
    const vieja = new Date(ahora.getTime() - RESERVA_VENCIDA_MS);
    const [abandonada] = await q.reservarTanda(lote.loteId, 1, vieja);
    if (!abandonada) throw new Error("no se pudo reservar la invitación abandonada.");
    expect((await filaDe(abandonada.comunicacionId)).estado).toBe("enviando");

    const doble = senderDoble();
    const r = await job.enviarTandaDelLote(lote.loteId, { ahora, ...doble.opciones });

    expect(r).toEqual({ enviados: 1, fallidos: 0, restantes: 0 });
    expect(doble.vistos.map((v) => v.comunicacionId)).toEqual([abandonada.comunicacionId]);
    // Token NUEVO: el de la reserva abandonada nunca llegó a salir en un mail.
    expect(doble.vistos[0]!.token).not.toBe(abandonada.token);

    const fila = await filaDe(abandonada.comunicacionId);
    expect(fila).toMatchObject({ estado: "enviado", resendMessageId: "re_int_1" });
    expect(fila.invitacionTokenHash).toBe(hashToken(doble.vistos[0]!.token));

    // En cambio, una reserva FRESCA (la otra pestaña está mandando ahora mismo)
    // no se toca, y tampoco cuenta como restante: si contara, esta pestaña
    // volvería a llamar en loop sin nada que hacer.
    const enVuelo = await crearLote(1);
    const [fresca] = await q.reservarTanda(enVuelo.loteId, 1, ahora);
    if (!fresca) throw new Error("no se pudo reservar la invitación en vuelo.");

    const intacta = senderDoble();
    const sinNada = await job.enviarTandaDelLote(enVuelo.loteId, { ahora, ...intacta.opciones });
    expect(sinNada).toEqual({ enviados: 0, fallidos: 0, restantes: 0 });
    expect(intacta.vistos).toEqual([]);
    expect(await filaDe(fresca.comunicacionId)).toMatchObject({ estado: "enviando" });
  });

  it("el lote termina con 0 restantes después de N llamadas", async () => {
    const lote = await crearLote(7);
    const doble = senderDoble();

    let llamadas = 0;
    let restantes = Number.POSITIVE_INFINITY;
    let enviados = 0;
    // El tope es la guarda del test: si el lote no avanzara, esto sería un
    // while infinito en vez de un fallo legible.
    while (restantes !== 0 && llamadas < 10) {
      const r = await job.enviarTandaDelLote(lote.loteId, { tamanio: 3, ...doble.opciones });
      llamadas += 1;
      restantes = r.restantes;
      enviados += r.enviados;
    }

    expect(llamadas).toBe(3);
    expect(enviados).toBe(7);
    expect(restantes).toBe(0);
    expect(new Set(doble.vistos.map((v) => v.comunicacionId)).size).toBe(7);

    expect(await q.resumenLote(lote.loteId)).toMatchObject({
      total: 7,
      pendientes: 0,
      enviando: 0,
      enviadas: 7,
      fallidas: 0,
    });
    for (const inv of lote.invitaciones) {
      expect((await filaDe(inv.comunicacionId)).estado).toBe("enviado");
    }
  });
});
