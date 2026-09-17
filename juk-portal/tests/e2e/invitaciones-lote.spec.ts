import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { db } from "../../src/lib/db";
import { META_FORM_ABIERTO } from "../../src/lib/db/queries/inscripciones-publicas";
import {
  inscripciones,
  prospectoComunicaciones,
  prospectos,
  viajes,
  type NewInscripcion,
  type NewProspectoComunicacion,
} from "../../src/lib/db/schema";
import {
  LOTE_TAMANIO,
  fechaDeVencimiento,
  lotesDe,
} from "../../src/lib/domain/inscripciones/invitacion";
import type { Variante } from "../../src/lib/domain/inscripciones/schema";
import {
  TEXTO_CONSENTIMIENTO,
  VERSION_CONSENTIMIENTO,
} from "../../src/lib/domain/privacidad/politica";
import { hashTexto } from "../../src/lib/utils/hash-texto";
import { generarTokenOpaco, hashToken } from "../../src/lib/utils/token-opaco";

import { confirmarModal, crearViaje, esperarHidratacion, ocultarOverlayDeDev } from "./helpers";
import { sufijoUnico, viajeIdPorCodigo } from "./helpers-flujos";

/*
 * Invitaciones al Application Form — EL ENVÍO MASIVO (/prospectos/invitaciones).
 *
 * Lo que se prueba acá es lo que ninguna otra capa puede probar: que el lote
 * avanza de verdad desde la pantalla. Trigger.dev no está desplegado, así que
 * quien empuja la campaña tanda tras tanda es el navegador del admin
 * (`useEnvioDeLote` llamando a `continuarLoteAction`). Las dos propiedades que
 * eso obliga —llegar a 0 restantes y retomar sin reenviarle a nadie— solo se ven
 * de punta a punta.
 *
 * Los mails no salen: el server de Playwright fija EMAIL_DRY_RUN=1, y en
 * dry-run `sendEmail` devuelve un id `dry-run-N`. Eso es justo lo que hace
 * afilada la prueba de "no reenvía": una fila que ya tenía su id de Resend lo
 * conserva, y la que sale ahora estrena uno de dry-run.
 *
 * Los prospectos se crean POR BASE (mismo criterio que inscripciones-bandeja):
 * el CRM tiene su propio spec y acá el alta no es lo que se prueba. Por pantalla
 * se hace todo lo que decide el envío. El nombre lleva el prefijo
 * "Prospecto E2E " para que el teardown global sea la red de seguridad, pero el
 * afterAll de este archivo limpia lo suyo explícitamente.
 *
 * El universo de la campaña se aísla con `?q=<sufijo>`: la pantalla deriva los
 * destinatarios EN EL SERVIDOR a partir de ese filtro, así que la corrida nunca
 * alcanza a un prospecto real.
 */

/** Todo lo que este spec puso en la base. Es la llave de la limpieza. */
const prospectosCreados: string[] = [];
const viajesCreados: string[] = [];

test.afterAll(async () => {
  // ORDEN: la ficha apunta a la comunicación, y la comunicación apunta al viaje
  // con una FK sin cascada. Borrar el viaje primero fallaría con las
  // invitaciones vivas, así que la bitácora se va antes que el viaje.
  if (prospectosCreados.length > 0) {
    const comunicaciones = (
      await db
        .select({ id: prospectoComunicaciones.id })
        .from(prospectoComunicaciones)
        .where(inArray(prospectoComunicaciones.prospectoId, prospectosCreados))
    ).map((f) => f.id);

    if (comunicaciones.length > 0) {
      // Ninguna prueba de acá envía una ficha, pero si alguna llegara a hacerlo,
      // la inscripción sobreviviría al borrado (esa FK es SET NULL) y quedaría
      // suelta en la bandeja del equipo.
      await db.delete(inscripciones).where(inArray(inscripciones.comunicacionId, comunicaciones));
      await db
        .delete(prospectoComunicaciones)
        .where(inArray(prospectoComunicaciones.id, comunicaciones));
    }

    await db.delete(prospectos).where(inArray(prospectos.id, prospectosCreados));
  }

  if (viajesCreados.length > 0) {
    await db.delete(viajes).where(inArray(viajes.id, viajesCreados));
  }
});

type ProspectoE2E = { id: string; nombre: string; email: string };

/**
 * Prospectos del CRM listos para recibir la invitación. `suscrito: false` es el
 * que se dio de baja: el que la campaña tiene que dejar afuera.
 */
async function crearProspectos(opts: {
  sufijo: string;
  cantidad: number;
  /** Primer número de la serie, para que dos grupos del mismo test no choquen. */
  desde?: number;
  suscrito?: boolean;
}): Promise<ProspectoE2E[]> {
  const filas = Array.from({ length: opts.cantidad }, (_, i) => {
    const n = String((opts.desde ?? 1) + i).padStart(2, "0");
    return {
      nombre: `Prospecto E2E ${opts.sufijo} ${n}`,
      emails: [`e2e+inv-${opts.sufijo.toLowerCase()}-${n}@e2e.example.com`],
      unsubscribeToken: randomUUID(),
      suscritoOutreach: opts.suscrito ?? true,
    };
  });

  const nuevos = await db
    .insert(prospectos)
    .values(filas)
    .returning({ id: prospectos.id, nombre: prospectos.nombre, emails: prospectos.emails });

  prospectosCreados.push(...nuevos.map((p) => p.id));
  return nuevos.map((p) => ({ id: p.id, nombre: p.nombre, email: p.emails[0] ?? "" }));
}

/** Un viaje propio del test (UK-2099-…), para reconocer SU campaña en la tabla. */
async function crearViajeDelTest(page: Page): Promise<{ codigo: string; id: string }> {
  const codigo = await crearViaje(page);
  const id = await viajeIdPorCodigo(codigo);
  viajesCreados.push(id);
  return { codigo, id };
}

/**
 * Una campaña ya escrita en la base, como la deja `crearLoteInvitaciones`. Es la
 * forma de pararse en el medio de un lote sin cortar un envío real a mano: las
 * `yaEnviadas` traen su id de Resend y su token, y las pendientes nacen SIN
 * token (se acuña recién al reservar la tanda).
 */
async function crearLoteAMedias(opts: {
  sufijo: string;
  viajeId: string;
  yaEnviadas: ProspectoE2E[];
  pendientes: ProspectoE2E[];
}): Promise<string> {
  const loteId = randomUUID();
  const expiraEl = fechaDeVencimiento(new Date());

  const base = (p: ProspectoE2E): NewProspectoComunicacion => ({
    prospectoId: p.id,
    tipo: "email",
    destinatario: p.email,
    invitacionViajeId: opts.viajeId,
    invitacionExpiraEl: expiraEl,
    invitacionLoteId: loteId,
  });

  await db.insert(prospectoComunicaciones).values([
    ...opts.yaEnviadas.map((p, i) => ({
      ...base(p),
      estado: "enviado" as const,
      // Un id que NO puede salir de este dry-run: si el envío reenviara,
      // `marcarEnviada` lo pisaría con un `dry-run-…` y se notaría.
      resendMessageId: `e2e-msg-${opts.sufijo}-${i}`,
      invitacionTokenHash: hashToken(generarTokenOpaco()),
    })),
    ...opts.pendientes.map((p) => ({ ...base(p), estado: "pendiente" as const })),
  ]);

  return loteId;
}

/** Las invitaciones de estos prospectos, como las dejó el envío. */
function invitacionesDe(ids: string[]) {
  return db
    .select({
      id: prospectoComunicaciones.id,
      estado: prospectoComunicaciones.estado,
      destinatario: prospectoComunicaciones.destinatario,
      resendMessageId: prospectoComunicaciones.resendMessageId,
      tokenHash: prospectoComunicaciones.invitacionTokenHash,
      loteId: prospectoComunicaciones.invitacionLoteId,
      viajeId: prospectoComunicaciones.invitacionViajeId,
      expiraEl: prospectoComunicaciones.invitacionExpiraEl,
      reservadoEl: prospectoComunicaciones.invitacionReservadoEl,
    })
    .from(prospectoComunicaciones)
    .where(inArray(prospectoComunicaciones.prospectoId, ids));
}

/** La pantalla de campañas, filtrada al universo de esta corrida. */
async function abrirInvitaciones(page: Page, sufijo: string): Promise<void> {
  await page.goto(`/prospectos/invitaciones?q=${encodeURIComponent(`Prospecto E2E ${sufijo}`)}`);
  await ocultarOverlayDeDev(page);
}

/** La fila de la campaña de un viaje en la tabla "Campañas". */
function filaDeCampania(page: Page, codigoViaje: string): Locator {
  return page.getByRole("row").filter({ hasText: codigoViaje });
}

/**
 * La celda del embudo de una campaña. Se ubica por su contenido y no por la
 * columna: el rótulo "Embudo" solo se muestra en modo card (<640px).
 */
function celdaEmbudo(fila: Locator): Locator {
  return fila.getByRole("cell").filter({ hasText: "Fichas recibidas" });
}

/** La celda del corte por piel (A/B/C) de una campaña. */
function celdaPorPiel(fila: Locator): Locator {
  return fila.getByRole("cell").filter({ hasText: "env." });
}

/**
 * Un escalón del embudo, tal cual se lee: el número SIEMPRE pegado al
 * porcentaje. Un "50%" suelto sobre 2 casos no dice nada, así que el test
 * verifica el par entero y no el porcentaje por su lado.
 */
async function esperarEscalon(
  celda: Locator,
  label: string,
  n: number,
  porcentaje: string
): Promise<void> {
  await expect(celda, `el escalón «${label}»`).toContainText(`${label}${n} · ${porcentaje}`);
}

/** El aviso de la pantalla cuando el webhook de Resend no está configurado. */
function avisoSinTracking(page: Page): Locator {
  return page.getByRole("alert").filter({ hasText: "Todavía no medimos qué pasa con el mail" });
}

type EstadoInvitacion = NonNullable<NewProspectoComunicacion["estado"]>;

/** Una invitación del lote con lo que le pasó después de salir el mail. */
type PasoDelEmbudo = {
  prospecto: ProspectoE2E;
  estado: EstadoInvitacion;
  /** La familia abrió el link y el formulario llegó a mostrarse. */
  abrioElFormulario?: boolean;
  /** La ficha que mandó, con la piel que vio. */
  ficha?: { variante: Variante; estado: "recibida" | "procesada"; borrada?: boolean };
};

/** DNI de test: 8 dígitos que arrancan en 99 (rango que no usan los DNIs reales). */
function dniDeTest(): string {
  return `99${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
}

/**
 * La ficha como la deja el formulario público… o como la deja el borrado a
 * pedido, que vacía los datos personales y conserva el talón (número, estado,
 * variante y lote). Esa segunda forma es la que prueba lo que promete el
 * borrado: una campaña vieja no se achica porque una familia haya ejercido su
 * derecho. El borrado desde la pantalla lo cubre `inscripciones-bandeja.spec.ts`.
 */
function fichaDelLote(
  sufijo: string,
  comunicacionId: string,
  ficha: NonNullable<PasoDelEmbudo["ficha"]>
): NewInscripcion {
  const id = randomUUID();
  const vacia = ficha.borrada === true;

  return {
    id,
    comunicacionId,
    variante: ficha.variante,
    estado: ficha.estado,
    nombre: vacia ? "" : "Ficha",
    apellido: vacia ? "" : `Embudo E2E ${sufijo}`,
    fechaNacimiento: vacia ? "1900-01-01" : "2011-04-04",
    dni: vacia ? `borrado-${id}` : dniDeTest(),
    numeroPasaporte: vacia ? "" : `FX${sufijo}${ficha.variante.toUpperCase()}`,
    fechaVencimientoPasaporte: vacia ? "1900-01-01" : "2034-01-01",
    tutor1Nombre: vacia ? "" : "Tutora E2E",
    tutor1Celular: vacia ? "" : "+54 9 11 5555-0000",
    tutor1Email: vacia ? "" : `e2e+emb-${sufijo.toLowerCase()}-${ficha.variante}@e2e.example.com`,
    consentimientoVersion: VERSION_CONSENTIMIENTO,
    consentimientoTextoHash: hashTexto(TEXTO_CONSENTIMIENTO),
    consentimientoEl: new Date(),
    ...(vacia
      ? {
          borradoEl: new Date(),
          motivoBorrado: `Borrado a pedido de la familia (E2E ${sufijo})`,
          datosPurgadosEl: new Date(),
        }
      : {}),
  };
}

/**
 * Una campaña ya vivida: los mails salieron, algunas familias abrieron el link
 * y algunas mandaron la ficha. Se escribe por base porque lo que se prueba acá
 * es la LECTURA —el embudo agregado en SQL sobre el lote entero—, no el envío,
 * que tiene sus propios tests más arriba.
 */
async function crearLoteConEmbudo(opts: {
  sufijo: string;
  viajeId: string;
  pasos: PasoDelEmbudo[];
}): Promise<string> {
  const loteId = randomUUID();
  const expiraEl = fechaDeVencimiento(new Date());

  const filas = await db
    .insert(prospectoComunicaciones)
    .values(
      opts.pasos.map((paso, i) => ({
        prospectoId: paso.prospecto.id,
        tipo: "email" as const,
        estado: paso.estado,
        destinatario: paso.prospecto.email,
        ...(paso.estado === "pendiente"
          ? {}
          : {
              resendMessageId: `e2e-msg-${opts.sufijo}-${i}`,
              invitacionTokenHash: hashToken(generarTokenOpaco()),
            }),
        invitacionViajeId: opts.viajeId,
        invitacionExpiraEl: expiraEl,
        invitacionLoteId: loteId,
        // El mismo sello que deja `registrarAperturaFormulario`: vive en `meta`
        // porque es bitácora, y el embudo lo cuenta desde ahí.
        ...(paso.abrioElFormulario
          ? { meta: { [META_FORM_ABIERTO]: new Date().toISOString() } }
          : {}),
      }))
    )
    .returning({
      id: prospectoComunicaciones.id,
      destinatario: prospectoComunicaciones.destinatario,
    });

  // Las filas se reencuentran con su paso por el destinatario (uno por
  // prospecto) y no por la posición: el orden del RETURNING no es un contrato.
  const porDestinatario = new Map(filas.map((f) => [f.destinatario, f.id]));

  const fichas = opts.pasos.flatMap((paso) => {
    const comunicacionId = porDestinatario.get(paso.prospecto.email);
    if (!paso.ficha) return [];
    if (!comunicacionId) throw new Error(`no se creó la invitación de ${paso.prospecto.email}`);
    return [fichaDelLote(opts.sufijo, comunicacionId, paso.ficha)];
  });
  if (fichas.length > 0) await db.insert(inscripciones).values(fichas);

  return loteId;
}

test("la campaña llega a 0 restantes avanzando por tandas desde la pantalla", async ({ page }) => {
  // 25 mails con la pausa real del rate limit de Resend (600 ms entre envíos) y
  // tres tandas de por medio.
  test.setTimeout(300_000);
  const sufijo = sufijoUnico();

  const viaje = await crearViajeDelTest(page);
  const destinatarios = await crearProspectos({ sufijo, cantidad: 25 });
  const ids = destinatarios.map((p) => p.id);

  // Cada tanda es UNA llamada a la server action: contarlas es la única forma de
  // ver desde afuera que el lote se empujó de a poco y no de un saque. Una
  // server action viaja como POST a la URL de la pantalla (la navegación es GET),
  // así que no hace falta mirar el header interno de Next.
  const llamadas: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/prospectos/invitaciones")) {
      llamadas.push(req.url());
    }
  });

  await abrirInvitaciones(page, sufijo);

  // El universo lo calcula el servidor con el filtro de la URL: lo que la
  // pantalla promete es exactamente lo que se va a mandar.
  await expect(page.getByRole("checkbox", { name: `Prospecto E2E ${sufijo}` })).toHaveCount(25);
  await expect(page.getByText("Se van a enviar 25 mails")).toBeVisible();

  const enviar = page.getByRole("button", { name: "Enviar invitaciones" });
  await esperarHidratacion(enviar);
  await page.getByLabel("Viaje", { exact: true }).selectOption(viaje.id);
  await enviar.click();
  await confirmarModal(page, "Mandar ahora");

  // El bucle del cliente vuelve a llamar mientras queden pendientes: el final es
  // "no queda nada mandable", no "se mandó una tanda".
  await expect(page.getByText("Listo: 25 enviadas de 25")).toBeVisible({ timeout: 240_000 });
  await expect(page.getByText("0 sin mandar")).toBeVisible();

  const tandas = lotesDe(destinatarios).length;
  expect(tandas).toBe(Math.ceil(25 / LOTE_TAMANIO));
  expect(
    llamadas.length,
    `el lote tiene que avanzar en tandas de ${LOTE_TAMANIO}, no en una sola llamada`
  ).toBeGreaterThanOrEqual(tandas);

  // Y en la base: una invitación por prospecto, todas selladas, cada una con SU
  // token (hasheado) y sin lease colgado.
  const filas = await invitacionesDe(ids);
  expect(filas).toHaveLength(25);
  expect(filas.every((f) => f.estado === "enviado")).toBe(true);
  expect(filas.every((f) => f.viajeId === viaje.id)).toBe(true);
  expect(filas.every((f) => f.expiraEl !== null)).toBe(true);
  expect(filas.every((f) => f.reservadoEl === null)).toBe(true);
  expect(new Set(filas.map((f) => f.loteId)).size, "es una sola campaña").toBe(1);
  expect(new Set(filas.map((f) => f.tokenHash)).size, "cada uno recibe su propio link").toBe(25);

  // Terminada la campaña, la tabla la muestra completa (el bucle hace refresh).
  const fila = filaDeCampania(page, viaje.codigo);
  await expect(fila).toContainText("25 de 25");
  await expect(fila).toContainText("Completa");
});

test("retomar una campaña a medias no le reenvía a quien ya recibió el mail", async ({ page }) => {
  test.setTimeout(180_000);
  const sufijo = sufijoUnico();

  const viaje = await crearViajeDelTest(page);
  const todos = await crearProspectos({ sufijo, cantidad: 12 });
  const yaEnviadas = todos.slice(0, 5);
  const pendientes = todos.slice(5);
  await crearLoteAMedias({ sufijo, viajeId: viaje.id, yaEnviadas, pendientes });

  const antes = new Map((await invitacionesDe(yaEnviadas.map((p) => p.id))).map((f) => [f.id, f]));
  expect(antes.size).toBe(5);

  await abrirInvitaciones(page, sufijo);

  // La campaña se ve como quedó: 5 salieron, 7 esperan.
  const fila = filaDeCampania(page, viaje.codigo);
  await expect(fila).toContainText("5 de 12");
  await expect(fila).toContainText("7 sin mandar");

  const retomar = fila.getByRole("button", { name: "Retomar (7)" });
  await esperarHidratacion(retomar);
  await retomar.click();

  // Retoma exactamente las 7 que faltaban: ni una más.
  await expect(fila.getByText("Listo: 7 enviadas.")).toBeVisible({ timeout: 120_000 });

  const despues = await invitacionesDe(todos.map((p) => p.id));
  expect(despues).toHaveLength(12);
  expect(despues.every((f) => f.estado === "enviado")).toBe(true);

  // EL PUNTO DEL TEST: las 5 que ya habían salido siguen intactas. Si retomar las
  // hubiera reenviado, `marcarEnviada` habría pisado su id de Resend con uno de
  // dry-run y `reservarTanda` les habría acuñado un token nuevo — o sea, el link
  // que la familia tiene en el mail habría dejado de abrir.
  for (const previa of antes.values()) {
    const ahora = despues.find((f) => f.id === previa.id);
    expect(ahora?.resendMessageId, "el id de Resend de una enviada no se toca").toBe(
      previa.resendMessageId
    );
    expect(ahora?.tokenHash, "el link que ya se mandó sigue siendo el mismo").toBe(previa.tokenHash);
  }

  // Y las 7 que faltaban salieron ahora: estrenan id (de dry-run) y token.
  const nuevas = despues.filter((f) => !antes.has(f.id));
  expect(nuevas).toHaveLength(7);
  expect(nuevas.every((f) => f.resendMessageId?.startsWith("dry-run-"))).toBe(true);
  expect(nuevas.every((f) => f.tokenHash !== null)).toBe(true);
  expect(new Set(despues.map((f) => f.tokenHash)).size, "12 links distintos").toBe(12);
});

test("un prospecto dado de baja queda afuera de la campaña, y la pantalla lo explica", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const sufijo = sufijoUnico();

  const suscritos = await crearProspectos({ sufijo, cantidad: 3 });
  const dadosDeBaja = await crearProspectos({ sufijo, cantidad: 2, desde: 4, suscrito: false });

  await abrirInvitaciones(page, sufijo);

  // Los dados de baja no tienen ni casilla para tildar: no hay forma de forzar
  // el envío desde la pantalla.
  await expect(page.getByRole("checkbox", { name: `Prospecto E2E ${sufijo}` })).toHaveCount(3);
  for (const baja of dadosDeBaja) {
    await expect(page.getByRole("checkbox", { name: baja.nombre })).toHaveCount(0);
  }
  await expect(page.getByText("Se van a enviar 3 mails")).toBeVisible();

  // Y la pantalla dice POR QUÉ quedaron afuera: es la respuesta que el equipo
  // tiene que poder dar sin abrir la base.
  const afuera = page.getByRole("button", { name: "2 quedan afuera" });
  await esperarHidratacion(afuera);
  await afuera.click();

  for (const baja of dadosDeBaja) {
    const item = page.getByRole("listitem").filter({ hasText: baja.nombre });
    await expect(item).toContainText("Se dio de baja de los correos");
  }

  const enviar = page.getByRole("button", { name: "Enviar invitaciones" });
  await enviar.click();
  await confirmarModal(page, "Mandar ahora");
  await expect(page.getByText("Listo: 3 enviadas de 3")).toBeVisible({ timeout: 90_000 });

  // La baja no es "un mail que falla": es un mail que nunca se escribe. Al dado
  // de baja no le queda ni una fila en la bitácora del envío.
  const invitadas = await invitacionesDe(suscritos.map((p) => p.id));
  expect(invitadas).toHaveLength(3);
  expect(invitadas.every((f) => f.estado === "enviado")).toBe(true);

  const alDadoDeBaja = await invitacionesDe(dadosDeBaja.map((p) => p.id));
  expect(alDadoDeBaja, "al que se dio de baja no se le arma ninguna invitación").toHaveLength(0);
});

test("una invitación revocada deja de abrir el formulario", async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const sufijo = sufijoUnico();

  const [prospecto] = await crearProspectos({ sufijo, cantidad: 1 });
  if (!prospecto) throw new Error("no se creó el prospecto de la invitación");

  // La invitación se arma como la deja el envío: en la base vive SOLO el hash y
  // el token en claro existe una vez (en el mail; acá, en esta variable).
  const token = generarTokenOpaco();
  const [invitacion] = await db
    .insert(prospectoComunicaciones)
    .values({
      prospectoId: prospecto.id,
      tipo: "email",
      estado: "enviado",
      destinatario: prospecto.email,
      invitacionTokenHash: hashToken(token),
      invitacionExpiraEl: fechaDeVencimiento(new Date()),
      invitacionLoteId: randomUUID(),
    })
    .returning({ id: prospectoComunicaciones.id });
  if (!invitacion) throw new Error("no se creó la invitación del test");

  const contexto = await browser.newContext({
    baseURL,
    // Vacío a propósito: browser.newContext hereda el storageState del proyecto
    // (la sesión de admin) y la familia entra sin sesión.
    storageState: { cookies: [], origins: [] },
  });
  try {
    const familia = await contexto.newPage();

    // Antes de revocar, el link abre. Así lo que cierra la puerta abajo es la
    // revocación, y no un token mal armado.
    await familia.goto(`/inscripcion?t=${token}`);
    await expect(familia.getByRole("heading", { level: 1 })).toHaveText("Inscripción al viaje");

    // El botón de pánico: el mismo sello que escribe `revocarInvitacionAction`
    // (todavía no tiene botón en pantalla).
    await db
      .update(prospectoComunicaciones)
      .set({ invitacionRevocadaEl: new Date() })
      .where(inArray(prospectoComunicaciones.id, [invitacion.id]));

    await familia.goto(`/inscripcion?t=${token}`);
    await expect(
      familia.getByRole("heading", { name: "Este link no está disponible" })
    ).toBeVisible();
    await expect(familia.getByRole("button", { name: "Enviar la inscripción" })).toHaveCount(0);

    // El aviso es genérico a propósito: no distingue revocado de vencido ni de
    // inventado, y no dice de quién era la invitación.
    await expect(familia.getByText(prospecto.nombre)).toHaveCount(0);
    await expect(familia.getByText(prospecto.email)).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});

test("el resumen de la campaña muestra el embudo con el n al lado del porcentaje y el corte por piel", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const sufijo = sufijoUnico();

  const viaje = await crearViajeDelTest(page);
  const gente = await crearProspectos({ sufijo, cantidad: 6 });
  const [uno, dos, tres, cuatro, cinco, seis] = gente;
  if (!uno || !dos || !tres || !cuatro || !cinco || !seis) {
    throw new Error("no se crearon los seis prospectos de la campaña");
  }

  // Una campaña con TODOS los desenlaces, para que cada escalón tenga un número
  // distinto y un escalón mal calculado no pueda pasar por otro.
  await crearLoteConEmbudo({
    sufijo,
    viajeId: viaje.id,
    pasos: [
      // Abrió, mandó la ficha, el equipo la procesó… y después pidió que le
      // borráramos los datos. Sigue contando: eso es lo que sostiene el talón.
      {
        prospecto: uno,
        estado: "enviado",
        abrioElFormulario: true,
        ficha: { variante: "a", estado: "procesada", borrada: true },
      },
      {
        prospecto: dos,
        estado: "enviado",
        abrioElFormulario: true,
        ficha: { variante: "b", estado: "recibida" },
      },
      {
        prospecto: tres,
        estado: "enviado",
        abrioElFormulario: true,
        ficha: { variante: "b", estado: "recibida" },
      },
      // Abrió el formulario y no lo completó: el escalón que distingue "nadie
      // abrió" de "abrieron y se cayeron en el camino".
      { prospecto: cuatro, estado: "enviado", abrioElFormulario: true },
      { prospecto: cinco, estado: "enviado" },
      { prospecto: seis, estado: "pendiente" },
    ],
  });

  await abrirInvitaciones(page, sufijo);
  const fila = filaDeCampania(page, viaje.codigo);
  await expect(fila).toContainText("5 de 6");
  await expect(fila).toContainText("1 sin mandar");

  const embudo = celdaEmbudo(fila);

  // Los escalones, en el orden en que ocurren. Los porcentajes de "Enviadas" se
  // miden sobre el total del lote (5 de 6) y los de abajo sobre las ENVIADAS:
  // lo que se compara es qué hizo la gente que recibió el mail.
  await esperarEscalon(embudo, "Enviadas", 5, "83%");
  await esperarEscalon(embudo, "Abrieron el formulario", 4, "80%");
  await esperarEscalon(embudo, "Fichas recibidas", 3, "60%");
  await esperarEscalon(embudo, "Fichas procesadas", 1, "20%");

  // Y la regla, verificada sobre TODO lo que la celda dibuja y no solo sobre los
  // escalones que el test nombra: acá no hay un porcentaje sin su número.
  const textoEmbudo = ((await embudo.textContent()) ?? "").replace(/\s+/g, " ");
  const porcentajes = textoEmbudo.match(/%/g)?.length ?? 0;
  const conSuNumero = textoEmbudo.match(/\d+ · \d+%/g)?.length ?? 0;
  expect(porcentajes, "el embudo tiene que mostrar porcentajes").toBeGreaterThan(0);
  expect(conSuNumero, `un porcentaje viaja solo en «${textoEmbudo}»`).toBe(porcentajes);

  // Entrega, apertura y clic los mueve el webhook de Resend. Sin
  // RESEND_WEBHOOK_SECRET nadie los cuenta NUNCA, y un 0 se leería como "nadie
  // lo abrió": van como "no disponible" o no van.
  const sinTracking = (await avisoSinTracking(page).count()) > 0;
  const delWebhook = ["Entregadas", "Abrieron el mail", "Clic en el link"];
  if (sinTracking) {
    await expect(embudo.getByText("Entrega, apertura y clic")).toBeVisible();
    await expect(embudo.getByText("No disponible")).toBeVisible();
    for (const escalon of delWebhook) {
      await expect(
        embudo.getByText(escalon, { exact: true }),
        `«${escalon}» no se puede mostrar sin webhook`
      ).toHaveCount(0);
    }
  } else {
    // Con el webhook configurado sí se miden, y valen las mismas reglas.
    for (const escalon of delWebhook) {
      await expect(embudo.getByText(escalon, { exact: true })).toBeVisible();
    }
  }

  // El corte por piel: es lo único que contesta "¿la B convierte mejor que la
  // A?". La piel que se le atribuye a cada invitación es la que quedó anotada en
  // su ficha, así que las dos invitaciones sin ficha no entran en ningún corte
  // (1 + 2 < 5 enviadas) y la C, que nadie vio, no ocupa una línea vacía.
  const porPiel = celdaPorPiel(fila);
  const textoPiel = ((await porPiel.textContent()) ?? "").replace(/\s+/g, " ");
  expect(textoPiel, "el corte de la piel A").toMatch(/A\s*1 env\. · 1 abrieron · 1 fichas/);
  expect(textoPiel, "el corte de la piel B").toMatch(/B\s*2 env\. · 2 abrieron · 2 fichas/);
  expect(textoPiel, "la piel que nadie vio no ocupa lugar").not.toContain("C");

  // La nota que evita la lectura apurada del porcentaje.
  await expect(page.getByText("Con pocos casos el porcentaje no dice nada")).toBeVisible();
});

test("abrir el formulario con el link cuenta la apertura una sola vez", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(150_000);
  const sufijo = sufijoUnico();

  const viaje = await crearViajeDelTest(page);
  const [prospecto] = await crearProspectos({ sufijo, cantidad: 1 });
  if (!prospecto) throw new Error("no se creó el prospecto de la invitación");

  // La invitación, como la deja el envío: en la base vive SOLO el hash y el
  // token en claro existe una vez (en el mail; acá, en esta variable).
  const token = generarTokenOpaco();
  const [invitacion] = await db
    .insert(prospectoComunicaciones)
    .values({
      prospectoId: prospecto.id,
      tipo: "email",
      estado: "enviado",
      destinatario: prospecto.email,
      invitacionTokenHash: hashToken(token),
      invitacionViajeId: viaje.id,
      invitacionExpiraEl: fechaDeVencimiento(new Date()),
      invitacionLoteId: randomUUID(),
    })
    .returning({ id: prospectoComunicaciones.id });
  if (!invitacion) throw new Error("no se creó la invitación del test");
  const invitacionId = invitacion.id;

  /** El sello de apertura que vive en `meta`, o null si todavía no se abrió. */
  async function selloDeApertura(): Promise<string | null> {
    const [fila] = await db
      .select({ meta: prospectoComunicaciones.meta })
      .from(prospectoComunicaciones)
      .where(eq(prospectoComunicaciones.id, invitacionId))
      .limit(1);
    const valor = fila?.meta?.[META_FORM_ABIERTO];
    return typeof valor === "string" ? valor : null;
  }

  // Antes de que nadie lo abra el escalón está en cero, y ese cero SÍ es
  // verdad: la apertura del formulario la registra la app, no el webhook.
  await abrirInvitaciones(page, sufijo);
  const fila = filaDeCampania(page, viaje.codigo);
  await esperarEscalon(celdaEmbudo(fila), "Abrieron el formulario", 0, "0%");
  expect(await selloDeApertura()).toBeNull();

  const contexto = await browser.newContext({
    baseURL,
    // Vacío a propósito: browser.newContext hereda el storageState del proyecto
    // (la sesión de admin) y la familia entra sin sesión.
    storageState: { cookies: [], origins: [] },
  });
  try {
    const familia = await contexto.newPage();

    // Cada apertura es UNA llamada a la server action, y una server action viaja
    // como POST a la URL de la pantalla (la navegación es GET). Contarlas es lo
    // que hace afilado el test: la segunda visita tiene que avisar igual, y el
    // sello tiene que quedar donde estaba.
    const avisos: string[] = [];
    familia.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/inscripcion")) avisos.push(req.url());
    });

    await familia.goto(`/inscripcion?t=${token}`);
    // La apertura la avisa el cliente YA HIDRATADO: en el render del GET la
    // dispararía sola el prefetch del cliente de correo, y eso no es nadie
    // abriendo nada.
    await esperarHidratacion(familia.getByLabel("DNI*"));

    await expect
      .poll(selloDeApertura, { message: "la primera apertura no se registró" })
      .not.toBeNull();
    const primera = await selloDeApertura();

    // La familia vuelve a mirar el formulario (o lo abre el otro tutor).
    await familia.reload();
    await esperarHidratacion(familia.getByLabel("DNI*"));
    await expect
      .poll(() => avisos.length, { message: "la segunda visita no volvió a avisar" })
      .toBeGreaterThanOrEqual(2);

    // Lo que interesa es "se abrió", no cuántas veces: el sello es el de la
    // PRIMERA vez y el segundo aviso no lo pisa.
    expect(await selloDeApertura(), "el sello de la primera apertura se pisó").toBe(primera);
  } finally {
    await contexto.close();
  }

  // Y el embudo cuenta una, no dos: el escalón mide familias que abrieron, no
  // visitas.
  await abrirInvitaciones(page, sufijo);
  await esperarEscalon(
    celdaEmbudo(filaDeCampania(page, viaje.codigo)),
    "Abrieron el formulario",
    1,
    "100%"
  );
});

test("@mobile la tabla de campañas se lee como tarjetas y 'Retomar' es tapeable", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const sufijo = sufijoUnico();

  const viaje = await crearViajeDelTest(page);
  const todos = await crearProspectos({ sufijo, cantidad: 2 });
  await crearLoteAMedias({
    sufijo,
    viajeId: viaje.id,
    yaEnviadas: todos.slice(0, 1),
    pendientes: todos.slice(1),
  });

  await abrirInvitaciones(page, sufijo);

  const tarjeta = filaDeCampania(page, viaje.codigo);
  await expect(tarjeta).toBeVisible();

  // Modo card: cada celda anuncia su rótulo dentro de la propia fila.
  for (const rotulo of ["Campaña", "Envío", "Embudo", "Por piel"]) {
    await expect(tarjeta.getByText(rotulo, { exact: true })).toBeVisible();
  }
  await expect(tarjeta).toContainText("1 de 2");
  await expect(tarjeta).toContainText("1 sin mandar");

  // El embudo, con el número siempre pegado al porcentaje.
  await expect(tarjeta.getByText("Fichas recibidas", { exact: true })).toBeVisible();
  await expect(tarjeta).toContainText("0 · 0%");

  // Y la regla que no se negocia: los escalones que dependen del webhook de
  // Resend, o se miden, o dicen "no disponible". Nunca un 0 mudo, que se leería
  // como "nadie lo abrió".
  await expect(tarjeta.getByText(/Entregadas|No disponible/).first()).toBeVisible();

  const retomar = tarjeta.getByRole("button", { name: "Retomar (1)" });
  const caja = await retomar.boundingBox();
  if (!caja) throw new Error("el botón Retomar no tiene caja: no está renderizado");
  const ancho = page.viewportSize()?.width ?? 0;
  expect(caja.x).toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width).toBeLessThanOrEqual(ancho);
  expect(caja.height, "objetivo táctil de 44px").toBeGreaterThanOrEqual(44);

  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(desborda, "la pantalla de campañas no debe scrollear horizontalmente").toBe(false);
});
