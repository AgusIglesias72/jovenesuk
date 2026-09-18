import { randomUUID } from "node:crypto";

import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Del barril y no de `schema/prospectos` directo: ese módulo y
// `schema/inscripciones` se importan mutuamente, y el enum de variante se
// invoca al evaluarse. El barril los carga en un orden que funciona (el mismo
// motivo que explica `inscripciones-publicas.integration.test.ts`).
import {
  inscripciones,
  prospectoComunicaciones,
  prospectos,
  type ProspectoComunicacion,
} from "@/lib/db/schema";
import { RESERVA_VENCIDA_MS } from "@/lib/domain/inscripciones/invitacion";
import { TEXTO_CONSENTIMIENTO, VERSION_CONSENTIMIENTO } from "@/lib/domain/privacidad/politica";
import { hashTexto } from "@/lib/utils/hash-texto";
import { hashToken } from "@/lib/utils/token-opaco";

import { crearFixtures, dia, integracionHabilitada } from "../../../../tests/integration/fixtures";

type InvitacionesQ = typeof import("./invitaciones");
type PublicasQ = typeof import("./inscripciones-publicas");

/*
 * El envío masivo contra Postgres. Nada de esto se puede probar con un mock:
 * lo que está bajo prueba ES el comportamiento del motor — que dos UPDATE
 * simultáneos no se lleven la misma fila (`for update skip locked`), que el
 * LIMIT/OFFSET no repita con timestamps empatados y que los conteos agreguen
 * sobre el lote entero y no sobre la página.
 *
 * Los fixtures no manejan prospectos: esas filas se crean y se borran acá,
 * siempre con el prefijo de la corrida. Las comunicaciones cascadean con su
 * prospecto; las inscripciones NO (su `viaje_id` es RESTRICT), así que se
 * borran antes de `fx.limpiar()`.
 */

const fx = crearFixtures("INVIT");
const PREFIJO = `[INT] ${fx.corrida} `;
const VENCIMIENTO = new Date("2099-01-01T00:00:00.000Z");

const emailDe = (sufijo: string) => `int+${fx.corrida.toLowerCase()}-${sufijo}@int.jovenesenuk.com`;

// El índice único de DNI es global sobre las fichas vivas: dos corridas en
// paralelo no pueden compartir documento.
const BASE_DNI = Array.from({ length: 6 }, () => 1 + Math.floor(Math.random() * 9)).join("");
let secuencia = 0;
const proximo = () => (secuencia += 1);

describe.skipIf(!integracionHabilitada)("Envío masivo de invitaciones contra Postgres", () => {
  let q: InvitacionesQ;
  let pub: PublicasQ;
  let viajeId: string;
  let colegioId: string;
  let baseId: string;
  const prospectoIds: string[] = [];

  async function crearProspecto(
    sufijo: string,
    opts: { emails?: string[]; suscrito?: boolean; ciudad?: string } = {}
  ): Promise<{ id: string; nombre: string }> {
    const nombre = `${PREFIJO}${sufijo}`;
    const [row] = await fx
      .db()
      .insert(prospectos)
      .values({
        nombre,
        ciudad: opts.ciudad ?? "[INT] Ciudad",
        emails: opts.emails ?? [emailDe(sufijo.toLowerCase())],
        suscritoOutreach: opts.suscrito ?? true,
        unsubscribeToken: randomUUID(),
      })
      .returning();
    if (!row) throw new Error("el INSERT de prospecto no devolvió fila.");
    prospectoIds.push(row.id);
    return { id: row.id, nombre: row.nombre };
  }

  /** Un lote de N invitaciones sobre el prospecto base, con destinatarios distintos. */
  async function crearLote(cantidad: number, viajeDelLote: string) {
    return q.crearLoteInvitaciones({
      destinatarios: Array.from({ length: cantidad }, () => ({
        prospectoId: baseId,
        destinatario: emailDe(`lote${proximo()}`),
      })),
      viajeId: viajeDelLote,
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

  /** Una ficha viva colgada de una invitación del lote. */
  async function crearFicha(opts: {
    comunicacionId: string;
    token: string;
    viajeId: string;
    variante: "a" | "b" | "c";
    estado: "recibida" | "procesada";
  }): Promise<string> {
    const [fila] = await fx
      .db()
      .insert(inscripciones)
      .values({
        comunicacionId: opts.comunicacionId,
        tokenHash: hashToken(opts.token),
        viajeId: opts.viajeId,
        variante: opts.variante,
        estado: opts.estado,
        nombre: `${PREFIJO}Ficha`,
        apellido: `${PREFIJO}Apellido`,
        fechaNacimiento: "2010-05-04",
        dni: `${BASE_DNI}${900 + proximo()}`,
        numeroPasaporte: "INTP9002",
        fechaVencimientoPasaporte: "2035-01-01",
        tutor1Nombre: `${PREFIJO}Tutor`,
        tutor1Celular: "+540000000000",
        tutor1Email: emailDe("ficha"),
        consentimientoVersion: VERSION_CONSENTIMIENTO,
        consentimientoTextoHash: hashTexto(TEXTO_CONSENTIMIENTO),
        consentimientoEl: new Date("2026-09-16T12:00:00.000Z"),
      })
      .returning({ id: inscripciones.id });
    if (!fila) throw new Error("el INSERT de inscripción no devolvió fila.");
    return fila.id;
  }

  async function nuevoViaje(): Promise<string> {
    return (await fx.viaje({ colegioDestinoId: colegioId, fechaInicio: dia("2031-07-01") })).id;
  }

  beforeAll(async () => {
    await fx.iniciar();
    q = await import("./invitaciones");
    // La apertura del formulario la escribe la superficie pública, y el embudo
    // de campañas la lee: el escalón solo se puede probar con las dos juntas.
    pub = await import("./inscripciones-publicas");

    colegioId = (await fx.colegio()).id;
    viajeId = await nuevoViaje();
    baseId = (await crearProspecto("Base")).id;
  });

  afterAll(async () => {
    await fx.db().delete(inscripciones).where(like(inscripciones.nombre, `${PREFIJO}%`));
    if (prospectoIds.length) {
      // Las comunicaciones cascadean con el prospecto.
      await fx.db().delete(prospectos).where(inArray(prospectos.id, prospectoIds));
    }
    await fx.limpiar();
  });

  it("el lote nace pendiente y SIN token: el link no existe hasta que se reserva la tanda", async () => {
    const lote = await crearLote(2, viajeId);

    expect(lote.loteId).toMatch(/^[0-9a-f-]{36}$/);
    expect(lote.invitaciones).toHaveLength(2);

    for (const inv of lote.invitaciones) {
      const fila = await filaDe(inv.comunicacionId);
      expect(fila).toMatchObject({
        tipo: "email",
        estado: "pendiente",
        prospectoId: baseId,
        destinatario: inv.destinatario,
        invitacionLoteId: lote.loteId,
        invitacionViajeId: viajeId,
        invitacionVariante: "b",
        // Sin esto, un lote retomado mañana tendría filas con un hash cuyo
        // texto plano se fue con la pestaña: links imposibles de armar.
        invitacionTokenHash: null,
        invitacionReservadoEl: null,
        invitacionRevocadaEl: null,
      });
      expect(fila.invitacionExpiraEl?.toISOString()).toBe(VENCIMIENTO.toISOString());
    }
  });

  it("dos reservas simultáneas NO se llevan la misma invitación", async () => {
    const lote = await crearLote(6, viajeId);

    const [a, b] = await Promise.all([
      q.reservarTanda(lote.loteId, 3),
      q.reservarTanda(lote.loteId, 3),
    ]);

    const reservadas = [...a, ...b];
    const ids = reservadas.map((r) => r.comunicacionId);
    // Lo que se prueba: ninguna invitación aparece dos veces. Cuántas se lleva
    // cada llamada depende de quién llegó primero (`skip locked` saltea, no
    // espera), y eso está bien: lo intolerable es el mail duplicado.
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(6);

    const tokens = reservadas.map((r) => r.token);
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens.every((t) => t.length >= 40)).toBe(true);

    // El token que se entrega es EXACTAMENTE el que abre la fila reservada.
    for (const r of reservadas) {
      const fila = await filaDe(r.comunicacionId);
      expect(fila.estado).toBe("enviando");
      expect(fila.invitacionReservadoEl).toBeInstanceOf(Date);
      expect(fila.invitacionTokenHash).toBe(hashToken(r.token));
      expect(r.prospectoNombre).toBe(`${PREFIJO}Base`);
      expect(r.viajeId).toBe(viajeId);
      expect(r.variante).toBe("b");
    }

    const resumen = await q.resumenLote(lote.loteId);
    expect(resumen).toMatchObject({ total: 6, enviando: ids.length, pendientes: 6 - ids.length });
  });

  it("una reserva vencida vuelve a pendiente y una fresca no se toca", async () => {
    const lote = await crearLote(2, viajeId);
    const ahora = new Date();
    // Borde exacto de `reservaVigente`: a los 5 minutos justos ya venció.
    const vieja = new Date(ahora.getTime() - RESERVA_VENCIDA_MS);

    const [abandonada] = await q.reservarTanda(lote.loteId, 1, vieja);
    const [fresca] = await q.reservarTanda(lote.loteId, 1, ahora);
    if (!abandonada || !fresca) throw new Error("no se reservaron las dos invitaciones.");

    expect(await q.reclamarReservasVencidas(lote.loteId, ahora)).toBe(1);

    expect(await filaDe(abandonada.comunicacionId)).toMatchObject({
      estado: "pendiente",
      invitacionReservadoEl: null,
    });
    const sigueEnVuelo = await filaDe(fresca.comunicacionId);
    expect(sigueEnVuelo.estado).toBe("enviando");
    expect(sigueEnVuelo.invitacionReservadoEl?.toISOString()).toBe(ahora.toISOString());

    // Reclamada = otra vez mandable, y con un token nuevo: el anterior nunca
    // llegó a salir en un mail.
    const retomada = await q.reservarTanda(lote.loteId, 5, ahora);
    expect(retomada.map((r) => r.comunicacionId)).toEqual([abandonada.comunicacionId]);
    expect(retomada[0]!.token).not.toBe(abandonada.token);

    // Y una segunda pasada no reclama nada: la reserva fresca sigue viva.
    expect(await q.reclamarReservasVencidas(lote.loteId, ahora)).toBe(0);
  });

  it("el lote excluye a los dados de baja y a los que no tienen email, y dice por qué", async () => {
    const a = await crearProspecto("DestA");
    const b = await crearProspecto("DestB", { suscrito: false });
    const c = await crearProspecto("DestC", { emails: [] });
    const d = await crearProspecto("DestD", { emails: [emailDe("desta")] });
    const e = await crearProspecto("DestE", { emails: ["   "] });
    const f = await crearProspecto("DestF", { emails: [], suscrito: false });
    const ids = [a, b, c, d, e, f].map((p) => p.id);

    const { incluidos, excluidos } = await q.destinatariosDesdeProspectos({ ids });

    expect(incluidos).toEqual([
      { prospectoId: a.id, prospectoNombre: a.nombre, email: emailDe("desta") },
    ]);
    expect(excluidos).toEqual([
      { prospectoId: b.id, prospectoNombre: b.nombre, motivo: "dado_de_baja" },
      { prospectoId: c.id, prospectoNombre: c.nombre, motivo: "sin_email" },
      // Misma casilla que DestA: un solo link por buzón.
      { prospectoId: d.id, prospectoNombre: d.nombre, motivo: "email_repetido" },
      { prospectoId: e.id, prospectoNombre: e.nombre, motivo: "sin_email" },
      // Sin email Y dado de baja: manda la baja, que es la respuesta que el
      // equipo tiene que darle al colegio.
      { prospectoId: f.id, prospectoNombre: f.nombre, motivo: "dado_de_baja" },
    ]);

    // Y lo que se escribe es exactamente lo incluido.
    const lote = await q.crearLoteInvitaciones({
      destinatarios: incluidos.map((i) => ({ prospectoId: i.prospectoId, destinatario: i.email })),
      viajeId,
      expiraEl: VENCIMIENTO,
    });
    expect(lote.invitaciones).toHaveLength(1);
    expect((await q.resumenLote(lote.loteId))?.total).toBe(1);

    // Una selección vacía no es "mandale a toda la base".
    expect(await q.destinatariosDesdeProspectos({ ids: [] })).toEqual({
      incluidos: [],
      excluidos: [],
    });
  });

  it("el buscador del armado encuentra por ciudad y por casilla, no solo por nombre", async () => {
    // `q` no filtra por ids: el universo es la tabla entera, así que el texto
    // buscado lleva la corrida adentro para no cruzarse con otra en paralelo.
    const marca = `Bristol${fx.corrida}`;
    const porCiudad = await crearProspecto("FiltroCiudad", { ciudad: `Sur de ${marca}` });
    const porMail = await crearProspecto("FiltroMail", {
      emails: [emailDe("filtromail"), `dire+${marca.toLowerCase()}@int.jovenesenuk.com`],
    });
    // Mismo prefijo de corrida en el nombre, pero sin la marca: es el control de
    // que el filtro filtra.
    await crearProspecto("FiltroAjeno");

    const porCiudadBuscada = await q.destinatariosDesdeProspectos({ q: marca });
    expect(porCiudadBuscada.incluidos.map((i) => i.prospectoId).sort()).toEqual(
      [porCiudad.id, porMail.id].sort()
    );

    // La casilla se busca en TODO el array, pero el mail que se manda sigue
    // siendo el primero no vacío: encontrarlo por la segunda no cambia a dónde
    // le llega.
    const encontradoPorMail = porCiudadBuscada.incluidos.find(
      (i) => i.prospectoId === porMail.id
    );
    expect(encontradoPorMail?.email).toBe(emailDe("filtromail"));

    // En minúsculas también: el ilike es el mismo que usa el listado del CRM.
    const enMinusculas = await q.destinatariosDesdeProspectos({ q: marca.toLowerCase() });
    expect(enMinusculas.incluidos.map((i) => i.prospectoId).sort()).toEqual(
      [porCiudad.id, porMail.id].sort()
    );

    // Y el nombre sigue funcionando como antes.
    const porNombre = await q.destinatariosDesdeProspectos({ q: `${PREFIJO}FiltroAjeno` });
    expect(porNombre.incluidos).toHaveLength(1);
    expect(porNombre.incluidos[0]!.prospectoNombre).toBe(`${PREFIJO}FiltroAjeno`);
  });

  it("la paginación con el mismo timestamp no repite ni saltea", async () => {
    const viajePaginado = await nuevoViaje();
    const lotes = [
      await crearLote(1, viajePaginado),
      await crearLote(1, viajePaginado),
      await crearLote(2, viajePaginado),
    ];
    const loteIds = lotes.map((l) => l.loteId);

    // El empate a mano: tres campañas creadas en el mismo instante. Sin el
    // desempate por lote_id, LIMIT/OFFSET devolvería la misma fila dos veces.
    const instante = new Date("2026-03-01T12:00:00.000Z");
    await fx
      .db()
      .update(prospectoComunicaciones)
      .set({ createdAt: instante })
      .where(inArray(prospectoComunicaciones.invitacionLoteId, loteIds));

    const vistos: string[] = [];
    for (const page of [1, 2, 3]) {
      const pagina = await q.listLotes({ viajeId: viajePaginado }, { page, size: 1 });
      expect(pagina.total).toBe(3);
      expect(pagina.pages).toBe(3);
      expect(pagina.items).toHaveLength(1);
      expect(pagina.items[0]!.creadoEl.toISOString()).toBe(instante.toISOString());
      vistos.push(pagina.items[0]!.loteId);
    }

    expect(new Set(vistos).size).toBe(3);
    expect([...vistos].sort()).toEqual([...loteIds].sort());

    // Y con otra ventana, el mismo universo sin huecos ni repetidos.
    const [primera, segunda] = await Promise.all([
      q.listLotes({ viajeId: viajePaginado }, { page: 1, size: 2 }),
      q.listLotes({ viajeId: viajePaginado }, { page: 2, size: 2 }),
    ]);
    expect(primera.items).toHaveLength(2);
    expect(segunda.items).toHaveLength(1);
    expect([...primera.items, ...segunda.items].map((l) => l.loteId).sort()).toEqual(
      [...loteIds].sort()
    );
  });

  it("el resumen agrega sobre el lote entero, no sobre la página", async () => {
    const viajeResumen = await nuevoViaje();
    const lote = await crearLote(5, viajeResumen);
    const otro = await crearLote(2, viajeResumen);

    const tanda = await q.reservarTanda(lote.loteId, 3);
    expect(tanda).toHaveLength(3);
    const [enviada1, enviada2, fallida] = tanda;
    if (!enviada1 || !enviada2 || !fallida) throw new Error("la tanda no trajo tres filas.");

    expect(await q.marcarEnviada(enviada1.comunicacionId, "re_int_0001")).toBe(true);
    expect(await q.marcarEnviada(enviada2.comunicacionId, "re_int_0002")).toBe(true);
    expect(await q.marcarFallida(fallida.comunicacionId, "422 dominio inexistente")).toBe(true);

    const sellada = await filaDe(enviada1.comunicacionId);
    expect(sellada).toMatchObject({ estado: "enviado", resendMessageId: "re_int_0001" });
    // El lease se limpia: esa columna es también la reserva del formulario
    // público cuando la familia abre el link.
    expect(sellada.invitacionReservadoEl).toBeNull();
    expect(await filaDe(fallida.comunicacionId)).toMatchObject({
      estado: "fallido",
      meta: { invitacionErrorEnvio: "422 dominio inexistente" },
    });

    const pendientes = lote.invitaciones.filter(
      (i) => !tanda.some((t) => t.comunicacionId === i.comunicacionId)
    );
    expect(pendientes).toHaveLength(2);
    expect(await q.revocarInvitacion(pendientes[0]!.comunicacionId)).toBe(true);

    // Una ficha viva colgada de la invitación enviada: eso es "respondida".
    await fx
      .db()
      .insert(inscripciones)
      .values({
        comunicacionId: enviada1.comunicacionId,
        tokenHash: hashToken(enviada1.token),
        viajeId: viajeResumen,
        variante: "b",
        estado: "recibida",
        nombre: `${PREFIJO}Ficha`,
        apellido: `${PREFIJO}Apellido`,
        fechaNacimiento: "2010-05-04",
        dni: `${BASE_DNI}${900 + proximo()}`,
        numeroPasaporte: "INTP9001",
        fechaVencimientoPasaporte: "2035-01-01",
        tutor1Nombre: `${PREFIJO}Tutor`,
        tutor1Celular: "+540000000000",
        tutor1Email: emailDe("ficha"),
        consentimientoVersion: VERSION_CONSENTIMIENTO,
        consentimientoTextoHash: hashTexto(TEXTO_CONSENTIMIENTO),
        consentimientoEl: new Date("2026-09-16T12:00:00.000Z"),
      });

    const esperado = {
      loteId: lote.loteId,
      viajeId: viajeResumen,
      total: 5,
      pendientes: 1,
      enviando: 0,
      enviadas: 2,
      fallidas: 1,
      revocadas: 1,
      respondidas: 1,
    };
    expect(await q.resumenLote(lote.loteId)).toMatchObject(esperado);

    // La misma verdad desde el listado, con una página que muestra UN lote: los
    // conteos siguen siendo los del lote entero (5), no los de la página (1).
    const paginas = await Promise.all([
      q.listLotes({ viajeId: viajeResumen }, { page: 1, size: 1 }),
      q.listLotes({ viajeId: viajeResumen }, { page: 2, size: 1 }),
    ]);
    expect(paginas[0].total).toBe(2);
    const enElListado = paginas.flatMap((p) => p.items).find((l) => l.loteId === lote.loteId);
    expect(enElListado).toMatchObject(esperado);
    expect(enElListado?.viajeCodigo).toBeTruthy();
    expect(enElListado?.expiraEl?.toISOString()).toBe(VENCIMIENTO.toISOString());
    // El otro lote del mismo viaje no se mezcla en los conteos.
    expect(paginas.flatMap((p) => p.items).find((l) => l.loteId === otro.loteId)).toMatchObject({
      total: 2,
      pendientes: 2,
      enviadas: 0,
    });

    // Una invitación revocada antes de salir no se manda nunca más.
    const ultima = await q.reservarTanda(lote.loteId, 10);
    expect(ultima.map((r) => r.comunicacionId)).toEqual([pendientes[1]!.comunicacionId]);
    expect(await q.resumenLote(lote.loteId)).toMatchObject({ pendientes: 0, enviando: 1 });
  });

  it("el embudo cuenta el lote entero, reparte por piel y no pierde una ficha borrada", async () => {
    const viajeEmbudo = await nuevoViaje();
    const lote = await crearLote(4, viajeEmbudo); // el lote fuerza la piel B
    await crearLote(2, viajeEmbudo); // vecino: no se puede mezclar en los conteos

    const tanda = await q.reservarTanda(lote.loteId, 4);
    const [sinAbrir, entregada, abierta, conClic] = tanda;
    if (!sinAbrir || !entregada || !abierta || !conClic) {
      throw new Error("la tanda no trajo las cuatro filas.");
    }
    for (const inv of tanda) {
      expect(await q.marcarEnviada(inv.comunicacionId, `re_emb_${inv.comunicacionId}`)).toBe(true);
    }

    // El webhook de Resend a mano: es lo único que mueve estos estados, y sin
    // RESEND_WEBHOOK_SECRET no se mueven nunca (por eso la pantalla los marca
    // "no disponible" en vez de 0). Cada escalón incluye a los de abajo.
    const estadoDe = async (id: string, estado: "entregado" | "abierto" | "click") => {
      await fx
        .db()
        .update(prospectoComunicaciones)
        .set({ estado })
        .where(eq(prospectoComunicaciones.id, id));
    };
    await estadoDe(entregada.comunicacionId, "entregado");
    await estadoDe(abierta.comunicacionId, "abierto");
    await estadoDe(conClic.comunicacionId, "click");

    // Dos links abiertos, uno de ellos dos veces: la marca es por invitación.
    const primeraVez = new Date("2026-03-02T10:00:00.000Z");
    expect(await pub.registrarAperturaFormulario(hashToken(abierta.token), primeraVez)).toBe(true);
    expect(await pub.registrarAperturaFormulario(hashToken(conClic.token), primeraVez)).toBe(true);
    expect(
      await pub.registrarAperturaFormulario(
        hashToken(conClic.token),
        new Date("2026-03-02T11:30:00.000Z")
      )
    ).toBe(true);
    expect(await pub.registrarAperturaFormulario(hashToken("token-que-no-existe"))).toBe(false);

    // Idempotente: vale el instante de la PRIMERA apertura.
    expect((await filaDe(conClic.comunicacionId)).meta).toMatchObject({
      invitacionFormAbiertoEl: primeraVez.toISOString(),
    });

    // Dos fichas, con pieles distintas: la que la familia vio (la de la ficha)
    // le gana a la que forzó la campaña.
    await crearFicha({
      comunicacionId: abierta.comunicacionId,
      token: abierta.token,
      viajeId: viajeEmbudo,
      variante: "c",
      estado: "recibida",
    });
    const procesada = await crearFicha({
      comunicacionId: conClic.comunicacionId,
      token: conClic.token,
      viajeId: viajeEmbudo,
      variante: "b",
      estado: "procesada",
    });

    const embudo = {
      total: 4,
      enviadas: 4,
      entregadas: 3,
      abiertas: 2,
      clics: 1,
      formularioAbierto: 2,
      respondidas: 2,
      procesadas: 1,
    };
    expect(await q.resumenLote(lote.loteId)).toMatchObject(embudo);

    // El corte por piel: B se queda con las dos invitaciones sin ficha más la
    // ficha que se cargó en B; C existe solo por la ficha que registró esa piel.
    expect((await q.resumenLote(lote.loteId))?.porVariante).toEqual([
      { variante: "a", enviadas: 0, formularioAbierto: 0, fichas: 0 },
      { variante: "b", enviadas: 3, formularioAbierto: 1, fichas: 1 },
      { variante: "c", enviadas: 1, formularioAbierto: 1, fichas: 1 },
    ]);

    // Borrar una ficha por privacidad NO achica la campaña: queda el talón.
    // (El nombre se conserva a propósito, para que la limpieza del test —que
    // borra por prefijo— siga alcanzando a la fila; lo que importa acá es que
    // el embudo no filtra por `borrado_el`.)
    await fx
      .db()
      .update(inscripciones)
      .set({ borradoEl: new Date(), datosPurgadosEl: new Date(), motivoBorrado: "[INT] pedido" })
      .where(eq(inscripciones.id, procesada));

    expect(await q.resumenLote(lote.loteId)).toMatchObject(embudo);

    // Y la misma verdad desde el listado, con una página que muestra un lote:
    // los conteos siguen siendo los del lote entero, no los de la página.
    const paginas = await Promise.all([
      q.listLotes({ viajeId: viajeEmbudo }, { page: 1, size: 1 }),
      q.listLotes({ viajeId: viajeEmbudo }, { page: 2, size: 1 }),
    ]);
    const enElListado = paginas.flatMap((p) => p.items).find((l) => l.loteId === lote.loteId);
    expect(enElListado).toMatchObject(embudo);
    expect(enElListado?.porVariante).toHaveLength(3);
  });

  it("revocar dos veces conserva el primer instante y no inventa invitaciones", async () => {
    const lote = await crearLote(1, viajeId);
    const id = lote.invitaciones[0]!.comunicacionId;
    const primera = new Date("2026-09-16T10:00:00.000Z");

    expect(await q.revocarInvitacion(id, primera)).toBe(true);
    expect(await q.revocarInvitacion(id, new Date("2026-09-16T11:00:00.000Z"))).toBe(true);
    expect((await filaDe(id)).invitacionRevocadaEl?.toISOString()).toBe(primera.toISOString());

    expect(await q.revocarInvitacion(randomUUID())).toBe(false);
    expect(await q.resumenLote(randomUUID())).toBeNull();
    expect(await q.reservarTanda(randomUUID(), 5)).toEqual([]);
    expect(await q.reclamarReservasVencidas(randomUUID())).toBe(0);
    expect(await q.marcarEnviada(randomUUID(), "re_int_9999")).toBe(false);
  });
});
