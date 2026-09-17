import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { expect, test, type Page } from "@playwright/test";

import { db } from "../../src/lib/db";
import {
  alumnos,
  asignaciones,
  inscripciones,
  prospectoComunicaciones,
  prospectos,
  users,
} from "../../src/lib/db/schema";
import { fechaDeVencimiento } from "../../src/lib/domain/inscripciones/invitacion";
import { TEXTO_CONSENTIMIENTO } from "../../src/lib/domain/privacidad/politica";
import { generarTokenOpaco, hashToken } from "../../src/lib/utils/token-opaco";

import { confirmarModal, crearViaje, esperarHidratacion, ocultarOverlayDeDev } from "./helpers";
import { asignacionesDeAlumno, sufijoUnico, viajeIdPorCodigo } from "./helpers-flujos";

/*
 * Application Form propio — EL ALTA, de punta a punta.
 *
 * Lo que se prueba acá no es "el formulario guarda": eso lo cubre la bandeja.
 * Es LA COMPUERTA (`src/lib/actions/alta-inscripcion.ts`): el alta automática
 * corre solo si la carga llegó con un token de invitación válido, que es la
 * capacidad que entregó el equipo —el equivalente del secreto del webhook—.
 * Sin token la ficha espera a una persona, y con token el alta nunca puede
 * cambiarle la cuenta de familia a un alumno que ya existía.
 *
 * Las fichas se cargan COMPLETANDO EL FORMULARIO DE VERDAD, no insertándolas en
 * la base: el camino que importa es el que recorre la familia (link tokenizado →
 * ficha → alumno → cuenta → viaje), y un INSERT se saltearía justo la parte que
 * decide. Lo único que se arma por base es el contexto que el equipo ya tendría
 * armado: el viaje (por UI) y la invitación de campaña.
 *
 * La familia entra SIN SESIÓN: los contextos del formulario se crean con
 * `storageState` vacío porque `browser.newContext()` hereda la sesión de admin
 * del proyecto, y el `page` del test es justamente esa sesión (crea el viaje y
 * mira la bandeja).
 *
 * El teardown global no conoce `inscripciones`, así que el afterAll borra lo que
 * genera este spec (ficha, asignación y alumno) por los DNIs que creó.
 */

/** Los DNIs que este spec puso en la base. Es la llave de toda la limpieza. */
const dnisCreados: string[] = [];

test.afterAll(async () => {
  if (dnisCreados.length === 0) return;

  // Las fichas PRIMERO: `inscripciones.alumno_id` apunta a `alumnos` sin
  // cascada, así que mientras exista la ficha el alumno no se puede borrar (ni
  // acá ni en el teardown global, que lo busca por el email del tutor).
  await db.delete(inscripciones).where(inArray(inscripciones.dni, dnisCreados));

  const ids = (
    await db.select({ id: alumnos.id }).from(alumnos).where(inArray(alumnos.dni, dnisCreados))
  ).map((fila) => fila.id);

  if (ids.length > 0) {
    // Mismo orden que cleanup.ts: asignaciones (RESTRICT hacia alumnos) antes
    // que el alumno; cuotas y pasos_alumno cascadean con la asignación.
    await db.delete(asignaciones).where(inArray(asignaciones.alumnoId, ids));
    await db.delete(alumnos).where(inArray(alumnos.id, ids));
  }

  // Las cuentas de familia que nacieron con estas fichas usan el patrón
  // `tutor….@e2e.jovenesenuk.com`, que borra el teardown global.
});

/** DNI de test: 8 dígitos que arrancan en 99 (rango que no usan los DNIs reales). */
function dniDeTest(): string {
  const dni = `99${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
  dnisCreados.push(dni);
  return dni;
}

type Ficha = {
  nombre: string;
  apellido: string;
  dni: string;
  pasaporte: string;
  tutorEmail: string;
};

function fichaDeTest(sufijo: string, opts: { dni?: string; tutor?: string } = {}): Ficha {
  const dni = opts.dni ?? dniDeTest();
  return {
    nombre: "Ficha",
    apellido: `Alta E2E ${sufijo}`,
    dni,
    pasaporte: `FX${sufijo}`,
    // El patrón que limpia el teardown, también para la cuenta de familia que
    // el alta crea con ese email.
    tutorEmail: `${opts.tutor ?? "tutora"}.${dni}@e2e.jovenesenuk.com`,
  };
}

/**
 * Una invitación viva, como la que deja el envío de campaña: la comunicación
 * guarda SOLO el hash del token (el token en claro existe una vez, en el mail)
 * y el viaje, que es de dónde sale el contexto server-side. El prospecto lleva
 * el prefijo "Prospecto E2E " para que el teardown lo limpie con su bitácora.
 *
 * Devuelve el token en claro, que es lo que va en el link.
 */
async function crearInvitacion(opts: { sufijo: string; viajeId?: string }): Promise<string> {
  const token = generarTokenOpaco();

  const [prospecto] = await db
    .insert(prospectos)
    .values({ nombre: `Prospecto E2E ${opts.sufijo}`, unsubscribeToken: randomUUID() })
    .returning({ id: prospectos.id });
  if (!prospecto) throw new Error("no se creó el prospecto de la campaña");

  await db.insert(prospectoComunicaciones).values({
    prospectoId: prospecto.id,
    tipo: "email",
    estado: "enviado",
    destinatario: `e2e+campania-${opts.sufijo.toLowerCase()}@e2e.example.com`,
    invitacionTokenHash: hashToken(token),
    invitacionViajeId: opts.viajeId ?? null,
    invitacionExpiraEl: fechaDeVencimiento(new Date()),
  });

  return token;
}

function alumnoPorDni(dni: string) {
  return db
    .select({
      id: alumnos.id,
      nombre: alumnos.nombre,
      apellido: alumnos.apellido,
      estado: alumnos.estado,
      canalAlta: alumnos.canalAlta,
      familiaUserId: alumnos.familiaUserId,
      tutor1Email: alumnos.tutor1Email,
    })
    .from(alumnos)
    .where(eq(alumnos.dni, dni))
    .limit(1)
    .then((filas) => filas[0]);
}

function inscripcionPorDni(dni: string) {
  return db
    .select({ estado: inscripciones.estado, motivo: inscripciones.motivo })
    .from(inscripciones)
    .where(eq(inscripciones.dni, dni))
    .then((filas) => filas[0]);
}

/**
 * Completa la ficha como la completa una familia. Espera la hidratación antes
 * de tocar nada: los campos existen renderizados en el server y un fill previo
 * a que React los conecte deja el valor en el DOM sin que corra ningún onChange.
 */
async function completarFicha(page: Page, ficha: Ficha): Promise<void> {
  const nombre = page.getByLabel("Nombre*", { exact: true });
  await esperarHidratacion(nombre);

  await nombre.fill(ficha.nombre);
  await page.getByLabel("Apellido*", { exact: true }).fill(ficha.apellido);
  await page.getByLabel("Fecha de nacimiento*").fill("2011-04-04");
  await page.getByLabel("DNI*").fill(ficha.dni);
  await page.getByLabel("Número de pasaporte*", { exact: true }).fill(ficha.pasaporte);
  await page.getByLabel("Vencimiento del pasaporte*").fill("2034-01-01");

  await page.getByLabel("Nombre y apellido*", { exact: true }).fill("Tutora E2E");
  await page.getByLabel("Celular*", { exact: true }).fill("+54 9 11 5555-0000");
  await page.getByLabel("Email*", { exact: true }).fill(ficha.tutorEmail);

  await page.getByRole("checkbox", { name: TEXTO_CONSENTIMIENTO }).check();
}

/** Envía y devuelve el código público que el acuse le muestra a la familia. */
async function enviarFicha(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Enviar la inscripción" }).click();

  // El acuse es inline y no un toast: la ficha se completa una sola vez y el
  // código tiene que quedar en pantalla.
  const acuse = page.getByRole("status").filter({ hasText: "Recibimos la inscripción" });
  await expect(acuse).toBeVisible({ timeout: 60_000 });

  const codigo = /INS-\d{6,}/.exec((await acuse.textContent()) ?? "")?.[0];
  if (!codigo) throw new Error("el acuse no mostró el código de la inscripción");
  return codigo;
}

/** Panel "Estado" del detalle de la ficha en el back-office. */
function panelEstado(page: Page) {
  return page.getByRole("region", { name: "Estado" });
}

test("con invitación válida la ficha crea al alumno, le arma la cuenta de familia y lo asigna al viaje", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const sufijo = sufijoUnico();
  const ficha = fichaDeTest(sufijo);
  expect(await alumnoPorDni(ficha.dni), `el DNI ${ficha.dni} ya existía`).toBeUndefined();

  const codigoViaje = await crearViaje(page);
  const viajeId = await viajeIdPorCodigo(codigoViaje);
  const token = await crearInvitacion({ sufijo, viajeId });

  const contexto = await browser.newContext({
    baseURL,
    // Vacío a propósito: browser.newContext hereda el storageState del proyecto
    // (la sesión de admin) y la familia entra sin sesión.
    storageState: { cookies: [], origins: [] },
  });
  let codigo: string;
  try {
    const familia = await contexto.newPage();
    await familia.goto(`/inscripcion?t=${token}`);

    // El viaje de la campaña se deriva del token, no del formulario: si se ve
    // en el encabezado es que el link resolvió a su invitación.
    await expect(familia.getByRole("heading", { level: 1 })).toHaveText("Inscripción al viaje");
    await expect(familia.getByText(`Viaje ${codigoViaje}`)).toBeVisible();
    await expect(familia.getByText("sin el link que te mandamos por mail")).toHaveCount(0);

    await completarFicha(familia, ficha);
    codigo = await enviarFicha(familia);
  } finally {
    await contexto.close();
  }

  // El alta corrió dentro del mismo envío: cuando la familia ve el acuse, el
  // alumno ya está.
  const alumno = await alumnoPorDni(ficha.dni);
  if (!alumno) throw new Error(`el alta con invitación no creó al alumno ${ficha.dni}`);
  // Nace pre-inscripto y la asignación al viaje de la campaña lo pasa a
  // inscripto dentro del mismo batch (PRD §5.5): con invitación, el alta deja
  // las dos cosas hechas de una.
  expect(alumno.estado).toBe("inscripto");
  expect(alumno.canalAlta).toBe("formulario_web");
  expect(alumno.familiaUserId, "la cuenta del Portal de Familias es parte del alta").not.toBeNull();

  const asignados = await asignacionesDeAlumno(alumno.id);
  expect(asignados).toHaveLength(1);
  expect(asignados[0]?.viajeId).toBe(viajeId);

  // Y la ficha queda cerrada: cuenta nueva + alumno asignado es el único
  // desenlace que no deja trabajo para el equipo.
  await page.goto(`/inscripciones?q=${ficha.dni}`);
  const fila = page.getByRole("row").filter({ hasText: codigo });
  await expect(fila).toContainText("Procesada");
  await expect(fila).toContainText(codigoViaje);
});

test("un segundo envío con el mismo DNI y otro email de tutor no le cambia la cuenta de familia al alumno", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(240_000);
  const sufijo = sufijoUnico();
  const ficha = fichaDeTest(sufijo);
  expect(await alumnoPorDni(ficha.dni), `el DNI ${ficha.dni} ya existía`).toBeUndefined();

  const codigoViaje = await crearViaje(page);
  const viajeId = await viajeIdPorCodigo(codigoViaje);

  // Dos invitaciones: cada link admite UNA ficha viva, así que el "ataque" llega
  // con la suya. Las dos son válidas — el blindaje no es el token, es el DNI.
  const tokenLegitimo = await crearInvitacion({ sufijo: `${sufijo}L`, viajeId });
  const tokenDelAtaque = await crearInvitacion({ sufijo: `${sufijo}A`, viajeId });

  const contexto = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  let codigoDelAtaque: string;
  try {
    const familia = await contexto.newPage();

    await familia.goto(`/inscripcion?t=${tokenLegitimo}`);
    await completarFicha(familia, ficha);
    await enviarFicha(familia);

    // El ataque: los mismos datos de siempre salvo el DNI (que es el mismo) y el
    // email del tutor (que es otro). Si el alta no fuera idempotente por DNI,
    // este envío le colgaría el alumno a la cuenta del impostor.
    const impostor = {
      ...ficha,
      nombre: "Impostora",
      tutorEmail: `tutorx.${ficha.dni}@e2e.jovenesenuk.com`,
    };

    await familia.goto(`/inscripcion?t=${tokenDelAtaque}`);
    await completarFicha(familia, impostor);
    codigoDelAtaque = await enviarFicha(familia);

    const alumno = await alumnoPorDni(ficha.dni);
    if (!alumno) throw new Error(`no se creó el alumno ${ficha.dni}`);
    // Nada del alumno se movió: ni su cuenta, ni su tutor, ni su nombre.
    expect(alumno.familiaUserId).not.toBeNull();
    expect(alumno.tutor1Email.toLowerCase()).toBe(ficha.tutorEmail.toLowerCase());
    expect(alumno.nombre).toBe(ficha.nombre);

    // Y el email del impostor no estrenó ninguna cuenta del Portal de Familias.
    const cuentas = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, impostor.tutorEmail));
    expect(cuentas, "el segundo envío no puede crear ni tocar cuentas").toHaveLength(0);
  } finally {
    await contexto.close();
  }

  // La ficha del segundo envío se guarda igual (no se pierde nada) pero queda
  // marcada, con el motivo que le dice al equipo qué pasó.
  await page.goto(`/inscripciones/${codigoDelAtaque}`);
  const estado = panelEstado(page);
  await expect(estado).toContainText("DNI ya cargado");
  await expect(estado).toContainText("no se tocó al alumno existente ni su cuenta de familia");
});

test("sin invitación la ficha espera a una persona y el alumno nace recién cuando la bandeja la procesa", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const sufijo = sufijoUnico();
  const ficha = fichaDeTest(sufijo);
  expect(await alumnoPorDni(ficha.dni), `el DNI ${ficha.dni} ya existía`).toBeUndefined();

  const contexto = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  let codigo: string;
  try {
    const familia = await contexto.newPage();
    await familia.goto("/inscripcion");

    // La pantalla lo avisa antes de que la familia cargue nada.
    await expect(familia.getByText("sin el link que te mandamos por mail")).toBeVisible();

    await completarFicha(familia, ficha);
    codigo = await enviarFicha(familia);
  } finally {
    await contexto.close();
  }

  // LA COMPUERTA: la ficha entró, el alumno NO. Un formulario público no crea
  // alumnos —ni cuentas de familia— por su cuenta.
  expect(await alumnoPorDni(ficha.dni), "sin token no puede haber alumno").toBeUndefined();
  expect((await inscripcionPorDni(ficha.dni))?.estado).toBe("requiere_revision");

  await page.goto(`/inscripciones/${codigo}`);
  await ocultarOverlayDeDev(page);

  const estado = panelEstado(page);
  await expect(estado).toContainText("Necesita revisión");
  await expect(estado).toContainText("La ficha llegó sin una invitación válida");
  await expect(estado.getByText("Todavía no se creó")).toBeVisible();

  // Un clic del equipo: es la otra capacidad que habilita el alta (la sesión de
  // admin, `via: "equipo"`).
  const darDeAlta = estado.getByRole("button", { name: "Dar de alta al alumno" });
  await esperarHidratacion(darDeAlta);
  await darDeAlta.click();
  await confirmarModal(page, "Sí, dar de alta");

  // Con el alumno creado, lo único que queda por decidir es humano: confirmar la
  // cuenta de familia. Que aparezca ese botón es la señal de que el alta corrió.
  await expect(
    estado.getByRole("button", { name: "Confirmar la cuenta de familia" })
  ).toBeVisible({ timeout: 60_000 });
  await expect(estado.getByRole("link", { name: "Ver la ficha del alumno" })).toBeVisible();
  // Sin invitación no hay viaje de campaña: el alumno queda pre-inscripto y sin
  // asignar, y la ficha lo dice en vez de fallar en silencio.
  await expect(estado).toContainText("La ficha no traía viaje");

  const alumno = await alumnoPorDni(ficha.dni);
  if (!alumno) throw new Error(`procesar la ficha no creó al alumno ${ficha.dni}`);
  expect(alumno.estado).toBe("pre_inscripto");
  expect(alumno.canalAlta).toBe("formulario_web");
  expect(alumno.familiaUserId).not.toBeNull();
  expect(await asignacionesDeAlumno(alumno.id)).toHaveLength(0);
});

test.describe("el formulario desde el teléfono", () => {
  // La familia entra sin sesión; el viewport de teléfono lo pone el proyecto
  // "mobile" (la app nativa va a ser esta misma web dentro de Capacitor).
  test.use({ storageState: { cookies: [], origins: [] } });

  test("@mobile la ficha se completa y se envía desde un teléfono, sin scroll horizontal", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const sufijo = sufijoUnico();
    const ficha = fichaDeTest(sufijo);
    expect(await alumnoPorDni(ficha.dni), `el DNI ${ficha.dni} ya existía`).toBeUndefined();

    await page.goto("/inscripcion");
    await ocultarOverlayDeDev(page);

    await completarFicha(page, ficha);

    // Con el formulario entero cargado (los textarea crecen, el resumen de
    // errores no está): nada se sale de pantalla.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(desborda, "el formulario no debe scrollear horizontalmente").toBe(false);

    // Y el botón de enviar se tapea con el pulgar (--tap = 44px).
    const enviar = page.getByRole("button", { name: "Enviar la inscripción" });
    const caja = await enviar.boundingBox();
    if (!caja) throw new Error("el botón de enviar no tiene caja: no está renderizado");
    expect(caja.height).toBeGreaterThanOrEqual(44);
    expect(caja.x).toBeGreaterThanOrEqual(0);
    expect(caja.x + caja.width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);

    const codigo = await enviarFicha(page);
    expect(codigo).toMatch(/^INS-\d{6,}$/);

    // La compuerta vale igual desde el teléfono: sin token, la ficha espera.
    expect(await alumnoPorDni(ficha.dni)).toBeUndefined();
    expect((await inscripcionPorDni(ficha.dni))?.estado).toBe("requiere_revision");
  });
});
