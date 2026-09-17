import { randomUUID } from "node:crypto";

import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Del barril y no de `schema/inscripciones` directo: ese módulo y
// `schema/prospectos` se importan mutuamente, y `prospectos` llama a
// `varianteFormulario()` al evaluarse. Entrar por `inscripciones` deja el enum
// sin definir ("varianteFormulario is not a function"); el barril los carga en
// un orden que funciona. Las queries no lo sufren porque importan `@/lib/db`
// —que evalúa el barril— antes que cualquier tabla.
import {
  inscripciones,
  prospectoComunicaciones,
  prospectos,
  type ProspectoComunicacion,
} from "@/lib/db/schema";
import { estadoInvitacion } from "@/lib/domain/inscripciones/invitacion";
import type { InscripcionData, Variante } from "@/lib/domain/inscripciones/schema";
import {
  TEXTO_CONSENTIMIENTO,
  VERSION_CONSENTIMIENTO,
} from "@/lib/domain/privacidad/politica";
import { hashTexto } from "@/lib/utils/hash-texto";
import { generarTokenOpaco, hashToken } from "@/lib/utils/token-opaco";

import { crearFixtures, dia, integracionHabilitada } from "../../../../tests/integration/fixtures";

type PublicasQ = typeof import("./inscripciones-publicas");

/*
 * El formulario público contra Postgres. Lo que se prueba acá no se puede
 * probar con un mock: que la lectura del link NO escriba, y que los dos índices
 * únicos parciales de `inscripciones` frenen el doble envío de verdad.
 *
 * Los fixtures no manejan prospectos ni inscripciones, así que esas filas se
 * crean y se borran acá, siempre con el prefijo de la corrida y antes de
 * `fx.limpiar()`: `inscripciones.viaje_id` no cascadea, y una ficha viva
 * impediría borrar el viaje de la corrida.
 */

const fx = crearFixtures("INSPUB");
const PREFIJO = `[INT] ${fx.corrida} `;
const EMAIL = `int+${fx.corrida.toLowerCase()}-form@int.jovenesenuk.com`;

// Base aleatoria: el índice único de DNI es global sobre las fichas vivas, así
// que dos corridas simultáneas no pueden compartir documento.
const BASE_DNI = Array.from({ length: 6 }, () => 1 + Math.floor(Math.random() * 9)).join("");
let secuenciaDni = 110;
const proximoDni = () => `${BASE_DNI}${(secuenciaDni += 1)}`;

const CONSENTIMIENTO = {
  version: VERSION_CONSENTIMIENTO,
  textoHash: hashTexto(TEXTO_CONSENTIMIENTO),
  el: new Date("2026-09-16T12:00:00.000Z"),
};

describe.skipIf(!integracionHabilitada)(
  "Application Form público (getInvitacionByTokenHash / crearInscripcion / marcarInvitacionRespondida) contra Postgres",
  () => {
    let q: PublicasQ;
    let prospectoId: string;
    let viajeId: string;
    const prospectoIds: string[] = [];

    function ficha(overrides: Partial<InscripcionData> = {}): InscripcionData {
      return {
        nombre: `${PREFIJO}Nombre`,
        apellido: `${PREFIJO}Apellido`,
        fechaNacimiento: "2010-05-04",
        dni: proximoDni(),
        numeroPasaporte: "INTP0001",
        fechaVencimientoPasaporte: "2035-01-01",
        tutor1Nombre: `${PREFIJO}Tutor`,
        tutor1Celular: "+540000000000",
        tutor1Email: EMAIL,
        acepta: true,
        ...overrides,
      };
    }

    type InvitacionOpts = {
      expiraEl?: Date;
      revocadaEl?: Date | null;
      variante?: Variante;
      viajeId?: string | null;
      meta?: Record<string, unknown> | null;
    };

    /** Una invitación real en la bitácora, con su token en claro para el test. */
    async function invitacion(
      opts: InvitacionOpts = {}
    ): Promise<{ token: string; fila: ProspectoComunicacion }> {
      const token = generarTokenOpaco();
      const [fila] = await fx
        .db()
        .insert(prospectoComunicaciones)
        .values({
          prospectoId,
          tipo: "email",
          asunto: `${PREFIJO}Invitación`,
          destinatario: EMAIL,
          estado: "enviado",
          meta: opts.meta ?? null,
          invitacionTokenHash: hashToken(token),
          invitacionViajeId: opts.viajeId === undefined ? viajeId : opts.viajeId,
          invitacionVariante: opts.variante ?? "b",
          invitacionExpiraEl: opts.expiraEl ?? new Date("2099-01-01T00:00:00.000Z"),
          invitacionRevocadaEl: opts.revocadaEl ?? null,
          invitacionLoteId: randomUUID(),
        })
        .returning();
      if (!fila) throw new Error("el INSERT de la invitación no devolvió fila.");
      return { token, fila };
    }

    async function comunicacionPorId(id: string): Promise<ProspectoComunicacion | undefined> {
      const filas = await fx
        .db()
        .select()
        .from(prospectoComunicaciones)
        .where(eq(prospectoComunicaciones.id, id));
      return filas[0];
    }

    async function fichasDe(comunicacionId: string) {
      return fx
        .db()
        .select({ id: inscripciones.id, estado: inscripciones.estado, dni: inscripciones.dni })
        .from(inscripciones)
        .where(eq(inscripciones.comunicacionId, comunicacionId));
    }

    const vivas = (filas: { estado: string }[]) => filas.filter((f) => f.estado !== "anulada");

    beforeAll(async () => {
      await fx.iniciar();
      q = await import("./inscripciones-publicas");

      const colegio = await fx.colegio();
      viajeId = (await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: dia("2031-07-01") }))
        .id;

      const [prospecto] = await fx
        .db()
        .insert(prospectos)
        .values({
          nombre: `${PREFIJO}Prospecto`,
          ciudad: "[INT] Ciudad",
          emails: [EMAIL],
          unsubscribeToken: randomUUID(),
        })
        .returning();
      if (!prospecto) throw new Error("el INSERT de prospecto no devolvió fila.");
      prospectoId = prospecto.id;
      prospectoIds.push(prospecto.id);
    });

    afterAll(async () => {
      await fx.db().delete(inscripciones).where(like(inscripciones.nombre, `${PREFIJO}%`));
      if (prospectoIds.length) {
        // Las comunicaciones cascadean con el prospecto.
        await fx.db().delete(prospectos).where(inArray(prospectos.id, prospectoIds));
      }
      await fx.limpiar();
    });

    it("leer el link es un SELECT puro: tres lecturas dejan la fila exactamente igual y no crean ninguna ficha", async () => {
      const { token, fila } = await invitacion();
      const tokenHash = hashToken(token);
      const antes = await comunicacionPorId(fila.id);

      for (let i = 0; i < 3; i++) {
        const invitacionLeida = await q.getInvitacionByTokenHash(tokenHash);
        expect(invitacionLeida).toMatchObject({
          comunicacionId: fila.id,
          variante: "b",
          viajeId,
          prospectoId,
          destinatario: EMAIL,
          revocadaEl: null,
          respondidaEl: null,
          reservadoEl: null,
        });
      }

      // La fila ENTERA, columna por columna: cualquier UPDATE al pasar (una
      // reserva, un contador de aperturas, un sello) rompe acá.
      expect(await comunicacionPorId(fila.id)).toEqual(antes);
      expect(await fichasDe(fila.id)).toEqual([]);
    });

    it("el token que no existe no devuelve nada, y el que existe se evalúa con el dominio", async () => {
      expect(await q.getInvitacionByTokenHash(hashToken("token-que-nunca-se-emitio"))).toBeNull();
      expect(await q.getInvitacionByTokenHash("")).toBeNull();

      const ahora = new Date("2026-09-16T12:00:00.000Z");
      const casos: [string, InvitacionOpts, string][] = [
        ["vigente", { expiraEl: new Date("2026-12-01T00:00:00.000Z") }, "vigente"],
        ["vencida", { expiraEl: new Date("2026-09-01T00:00:00.000Z") }, "vencida"],
        [
          "revocada",
          {
            expiraEl: new Date("2026-12-01T00:00:00.000Z"),
            revocadaEl: new Date("2026-09-10T00:00:00.000Z"),
          },
          "revocada",
        ],
        // Revocada Y vencida: manda la revocación, que explica por qué no abre.
        [
          "revocada y vencida",
          {
            expiraEl: new Date("2026-09-01T00:00:00.000Z"),
            revocadaEl: new Date("2026-09-10T00:00:00.000Z"),
          },
          "revocada",
        ],
      ];

      for (const [nombre, opts, esperado] of casos) {
        const { token } = await invitacion(opts);
        const inv = await q.getInvitacionByTokenHash(hashToken(token));
        expect(inv, nombre).not.toBeNull();
        expect(estadoInvitacion({ ...inv!, ahora }), nombre).toBe(esperado);
      }
    });

    it("la ficha viva cierra el link, y anularla lo vuelve a abrir", async () => {
      const { token, fila } = await invitacion();
      const tokenHash = hashToken(token);
      const ahora = new Date("2026-09-16T12:00:00.000Z");

      const creada = await q.crearInscripcion({
        ficha: ficha(),
        estado: "recibida",
        variante: "b",
        origen: { comunicacionId: fila.id, tokenHash, viajeId },
        consentimiento: CONSENTIMIENTO,
      });
      expect(creada.ok).toBe(true);

      const conFicha = await q.getInvitacionByTokenHash(tokenHash);
      expect(conFicha?.respondidaEl).toBeInstanceOf(Date);
      expect(estadoInvitacion({ ...conFicha!, ahora })).toBe("respondida");

      if (!creada.ok) throw new Error("la ficha no se creó");
      await fx
        .db()
        .update(inscripciones)
        .set({ estado: "anulada" })
        .where(eq(inscripciones.id, creada.inscripcion.id));

      const anulada = await q.getInvitacionByTokenHash(tokenHash);
      expect(anulada?.respondidaEl).toBeNull();
      expect(estadoInvitacion({ ...anulada!, ahora })).toBe("vigente");
    });

    it("dos envíos con la misma invitación dejan UNA sola ficha viva, aunque los datos sean distintos", async () => {
      const { token, fila } = await invitacion();
      const tokenHash = hashToken(token);
      const origen = { comunicacionId: fila.id, tokenHash, viajeId };

      const primero = await q.crearInscripcion({
        ficha: ficha(),
        estado: "recibida",
        variante: "b",
        origen,
        consentimiento: CONSENTIMIENTO,
      });
      expect(primero.ok).toBe(true);

      // DNI distinto a propósito: lo que frena el segundo envío tiene que ser
      // el índice de la invitación, no el de documento.
      const segundo = await q.crearInscripcion({
        ficha: ficha({ dni: proximoDni() }),
        estado: "recibida",
        variante: "b",
        origen,
        consentimiento: CONSENTIMIENTO,
      });
      expect(segundo).toEqual({ ok: false, motivo: "invitacion_ya_respondida" });

      expect(vivas(await fichasDe(fila.id))).toHaveLength(1);

      if (!primero.ok) throw new Error("la primera ficha no se creó");
      await fx
        .db()
        .update(inscripciones)
        .set({ estado: "anulada" })
        .where(eq(inscripciones.id, primero.inscripcion.id));

      const tercero = await q.crearInscripcion({
        ficha: ficha(),
        estado: "recibida",
        variante: "b",
        origen,
        consentimiento: CONSENTIMIENTO,
      });
      expect(tercero.ok).toBe(true);

      // Dos filas colgadas de la invitación (la anulada y la nueva), una viva.
      const todas = await fichasDe(fila.id);
      expect(todas).toHaveLength(2);
      expect(vivas(todas)).toHaveLength(1);
    });

    it("sin token, el mismo DNI dos veces entra una sola vez y responde con un motivo, no con una excepción", async () => {
      const dni = proximoDni();

      const primera = await q.crearInscripcion({
        ficha: ficha({ dni }),
        estado: "requiere_revision",
        variante: "a",
        origen: null,
        consentimiento: CONSENTIMIENTO,
      });
      expect(primera.ok).toBe(true);
      if (!primera.ok) throw new Error("la primera ficha no se creó");
      expect(primera.inscripcion).toMatchObject({
        estado: "requiere_revision",
        comunicacionId: null,
        tokenHash: null,
        viajeId: null,
        variante: "a",
        dni,
      });
      expect(primera.inscripcion.numero).toBeGreaterThan(0);

      const segunda = await q.crearInscripcion({
        ficha: ficha({ dni, nombre: `${PREFIJO}Otro` }),
        estado: "requiere_revision",
        variante: "a",
        origen: null,
        consentimiento: CONSENTIMIENTO,
      });
      expect(segunda).toEqual({ ok: false, motivo: "dni_ya_cargado" });
    });

    it("marcarInvitacionRespondida sella el primer instante, conserva el resto de meta y no toca otra comunicación", async () => {
      const { token, fila } = await invitacion({ meta: { lote: "[INT] previo" } });
      const otra = await invitacion();
      const antesDeLaOtra = await comunicacionPorId(otra.fila.id);

      const primera = new Date("2026-09-16T10:00:00.000Z");
      const segunda = new Date("2026-09-16T11:00:00.000Z");
      expect(await q.marcarInvitacionRespondida(fila.id, primera)).toBe(true);
      expect(await q.marcarInvitacionRespondida(fila.id, segunda)).toBe(true);

      const leida = await q.getInvitacionByTokenHash(hashToken(token));
      expect(leida?.respondidaEl?.toISOString()).toBe(primera.toISOString());
      expect(estadoInvitacion({ ...leida!, ahora: new Date("2026-09-16T12:00:00.000Z") })).toBe(
        "respondida"
      );

      const actualizada = await comunicacionPorId(fila.id);
      expect(actualizada?.meta).toMatchObject({ lote: "[INT] previo" });
      // No hay ficha: el sello de meta es lo único que cerró el link.
      expect(await fichasDe(fila.id)).toEqual([]);

      expect(await comunicacionPorId(otra.fila.id)).toEqual(antesDeLaOtra);
      expect(await q.marcarInvitacionRespondida(randomUUID())).toBe(false);
    });
  }
);
