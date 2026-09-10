import { and, desc, eq, inArray } from "drizzle-orm";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

import { db } from "../../src/lib/db";
import { asignaciones, auditoria, documentos, pasosAlumno } from "../../src/lib/db/schema";

import { crearViaje } from "./helpers";
import {
  crearAlumnoPorWebhook,
  fijarPassword,
  ingresar,
  pasoDeAlumno,
  pdfMinimo,
  type AlumnoWebhook,
} from "./helpers-flujos";

/*
 * Portal de Familias — las acciones de ESCRITURA que la familia hace desde el
 * celular (subir un documento, avisar el avance/problema del ETA, confirmar la
 * autorización ante escribano, reportar un dato) y la descarga de lo que subió.
 *
 * No toca el seed [DEMO] (familias.spec y familias-ux dependen de su estado):
 * arma su propio escenario. Un viaje UK-2099 por UI y dos alumnos por webhook,
 * cada uno con su cuenta de familia; la password se fija desde el spec porque
 * las cuentas nacen con una aleatoria.
 *
 * Corre en el proyecto "chromium" A PROPÓSITO (el nombre no matchea el
 * testMatch de "familias"): necesita la sesión de admin para crear el viaje y
 * mirar el back-office, depende del setup que dispara el teardown de limpieza,
 * y las sesiones de familia las abre en contextos propios.
 *
 * Serial: los tests comparten el alumno y las sesiones (2 logins por corrida;
 * loguear por test agotaría el rate limit de /sign-in/email).
 */

test.describe.configure({ mode: "serial" });

const ADMIN_STATE = "tests/e2e/.auth/admin.json";
const PASSWORD = `E2e-Familia-${Date.now()}`;

let alumnoA!: AlumnoWebhook;
let alumnoB!: AlumnoWebhook;
let familiaUserIdA!: string;
let familiaA!: BrowserContext;
let familiaB!: BrowserContext;
let paginaA!: Page;
let keyDocumentoA: string | null = null;

/** Una tarjeta de trámite del portal, por etapa y código visible ("A1", "C1"…). */
function tramite(page: Page, etapa: string, codigo: string) {
  return page
    .getByRole("region", { name: etapa })
    .getByRole("listitem")
    .filter({ has: page.getByText(codigo, { exact: true }) });
}

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000);
  const baseURL = testInfo.project.use.baseURL;

  const admin = await browser.newContext({ baseURL, storageState: ADMIN_STATE });
  try {
    const codigo = await crearViaje(await admin.newPage());
    // Nacida en 2011: menor al inicio del viaje (2027), así D1 aplica; el
    // colegio base es UK, así que C1 (ETA) también.
    alumnoA = await crearAlumnoPorWebhook(admin.request, { etiqueta: "FA", codigoViaje: codigo });
    expect(alumnoA.asignacionId, "el alumno A debía quedar asignado").not.toBeNull();
    alumnoB = await crearAlumnoPorWebhook(admin.request, { etiqueta: "FB" });
  } finally {
    await admin.close();
  }

  familiaUserIdA = await fijarPassword(alumnoA.tutorEmail, PASSWORD);
  await fijarPassword(alumnoB.tutorEmail, PASSWORD);

  // Vacío a propósito: dentro de Playwright Test, browser.newContext hereda el
  // storageState del proyecto (la sesión de admin) y /login rebota a /dashboard.
  familiaA = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  paginaA = await familiaA.newPage();
  await ingresar(paginaA, alumnoA.tutorEmail, PASSWORD);
  // Con un solo alumno, la familia aterriza directo en su resumen.
  await expect(paginaA).toHaveURL(new RegExp(`/familias/${alumnoA.dni}$`), { timeout: 60_000 });

  // Vacío a propósito: dentro de Playwright Test, browser.newContext hereda el
  // storageState del proyecto (la sesión de admin) y /login rebota a /dashboard.
  familiaB = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const paginaB = await familiaB.newPage();
  await ingresar(paginaB, alumnoB.tutorEmail, PASSWORD);
  await expect(paginaB).toHaveURL(new RegExp(`/familias/${alumnoB.dni}$`), { timeout: 60_000 });
  await paginaB.close();
});

test.afterAll(async () => {
  await familiaA?.close();
  await familiaB?.close();
  if (!alumnoA) return;

  // documentos no tiene FK (entidad polimórfica): el teardown no lo alcanza.
  // Se borran solo los de los pasos de ESTE alumno de test.
  const pasos = await db
    .select({ id: pasosAlumno.id })
    .from(pasosAlumno)
    .innerJoin(asignaciones, eq(pasosAlumno.asignacionId, asignaciones.id))
    .where(eq(asignaciones.alumnoId, alumnoA.alumnoId));
  if (pasos.length > 0) {
    await db.delete(documentos).where(
      and(
        eq(documentos.entidadTipo, "paso_alumno"),
        inArray(
          documentos.entidadId,
          pasos.map((p) => p.id)
        )
      )
    );
  }
});

test("A1: la familia sube el formulario del colegio, queda en revisión y lo puede descargar", async () => {
  await paginaA.goto(`/familias/${alumnoA.dni}/documentacion`);
  const a1 = tramite(paginaA, "Inscripción en el colegio", "A1");
  await expect(a1.getByText("Pendiente", { exact: true })).toBeVisible({ timeout: 60_000 });

  await a1
    .getByLabel("Adjuntar archivo para Formulario del colegio")
    .setInputFiles(pdfMinimo("formulario-colegio-firmado.pdf"));
  await expect(a1.getByText("Elegiste: formulario-colegio-firmado.pdf")).toBeVisible();
  await a1.getByRole("button", { name: "Subir archivo" }).click();

  await expect(a1.getByText("Enviado ✓ — lo revisamos pronto")).toBeVisible();
  await expect(a1.getByText("En curso", { exact: true })).toBeVisible();

  // Pendiente → en progreso, y el documento queda a nombre de la familia.
  const paso = await pasoDeAlumno(alumnoA.alumnoId, "a1");
  expect(paso.estado).toBe("en_progreso");
  const docs = await db
    .select()
    .from(documentos)
    .where(and(eq(documentos.entidadTipo, "paso_alumno"), eq(documentos.entidadId, paso.id)));
  expect(docs).toHaveLength(1);
  const doc = docs[0]!;
  expect(doc.categoria).toBe("application_form");
  expect(doc.uploadedBy).toBe(familiaUserIdA);
  keyDocumentoA = doc.r2Key;

  // La familia dueña lo descarga por el proxy autenticado.
  const descarga = await familiaA.request.get(`/api/uploads/${doc.r2Key}`);
  expect(descarga.status()).toBe(200);
  expect(descarga.headers()["content-type"]).toContain("application/pdf");
  expect((await descarga.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("otra familia no ve ni descarga el documento del alumno ajeno, aunque el equipo sí", async ({
  browser,
  baseURL,
}) => {
  expect(keyDocumentoA, "depende del documento subido en el test anterior").toBeTruthy();
  const url = `/api/uploads/${keyDocumentoA}`;

  const ajena = await familiaB.request.get(url, { maxRedirects: 0 });
  expect(ajena.status()).toBe(404);

  const paginaB = await familiaB.newPage();
  try {
    const ficha = await paginaB.goto(`/familias/${alumnoA.dni}/documentacion`);
    expect(ficha?.status()).toBe(404);
  } finally {
    await paginaB.close();
  }

  // El 404 de arriba es por ownership, no porque la key no exista.
  const admin = await browser.newContext({ baseURL, storageState: ADMIN_STATE });
  try {
    expect((await admin.request.get(url)).status()).toBe(200);
  } finally {
    await admin.close();
  }
});

test("C1 · ETA: la familia avisa que está en trámite y después reporta un problema; el equipo lo ve bloqueado", async ({
  browser,
  baseURL,
}) => {
  await paginaA.goto(`/familias/${alumnoA.dni}/documentacion`);
  const c1 = tramite(paginaA, "Documentación para viajar", "C1");

  await c1.getByLabel("Estado del ETA").selectOption("en_tramite");
  await c1.getByRole("button", { name: "Guardar" }).click();
  await expect(c1.getByText("En trámite", { exact: true })).toBeVisible();

  let paso = await pasoDeAlumno(alumnoA.alumnoId, "c1");
  expect(paso.estado).toBe("en_progreso");
  expect(paso.metadata).toMatchObject({ subEstado: "en_tramite" });

  const comentario = `E2E: me equivoqué en la fecha de nacimiento (${Date.now()}).`;
  await c1.getByRole("button", { name: "Tuve un problema con el ETA" }).click();
  await c1.getByLabel("¿Qué pasó?").selectOption("error_datos");
  await c1.getByLabel("Contanos un poco más (opcional)").fill(comentario);
  await c1.getByRole("button", { name: "Enviar aviso" }).click();

  await expect(c1.getByText("Con un problema", { exact: true })).toBeVisible();
  await expect(c1.getByRole("status")).toContainText("Me equivoqué en algún dato");

  paso = await pasoDeAlumno(alumnoA.alumnoId, "c1");
  expect(paso.estado).toBe("bloqueado");
  expect(paso.metadata).toMatchObject({
    subEstado: "rechazado",
    tipoProblema: "error_datos",
    comentarioProblema: comentario,
  });

  const [ultima] = await db
    .select()
    .from(auditoria)
    .where(and(eq(auditoria.entidadId, paso.id), eq(auditoria.accion, "cambio_estado_paso")))
    .orderBy(desc(auditoria.createdAt))
    .limit(1);
  expect(ultima?.usuarioId).toBe(familiaUserIdA);
  expect(ultima?.metadata).toMatchObject({ origen: "familia", subEstado: "rechazado" });

  // El back-office ve el mismo trámite: sub-estado Rechazado y paso Bloqueado.
  const admin = await browser.newContext({ baseURL, storageState: ADMIN_STATE });
  try {
    const pagina = await admin.newPage();
    await pagina.goto(`/alumnos/${alumnoA.dni}`);
    const tarjeta = pagina.locator('[data-paso="c1"]');
    await expect(tarjeta.getByLabel("Estado del trámite · ETA", { exact: true })).toHaveValue(
      "rechazado"
    );
    await expect(tarjeta.getByText("Bloqueado", { exact: true })).toBeVisible();
  } finally {
    await admin.close();
  }
});

test("D1: la familia confirma que obtuvo la autorización ante escribano y queda registrado", async () => {
  await paginaA.goto(`/familias/${alumnoA.dni}/documentacion`);
  const d1 = tramite(paginaA, "Trámites en Argentina", "D1");
  await expect(d1.getByText("Pendiente", { exact: true })).toBeVisible();

  await d1.getByRole("button", { name: "Confirmo que la obtuve" }).click();
  await expect(d1.getByText("Confirmaste que la obtuviste ✓")).toBeVisible();
  await expect(d1.getByText("En curso", { exact: true })).toBeVisible();

  await paginaA.reload();
  const recargada = tramite(paginaA, "Trámites en Argentina", "D1");
  await expect(recargada.getByText("Confirmaste que la obtuviste ✓")).toBeVisible();
  await expect(recargada.getByRole("button", { name: "Confirmo que la obtuve" })).toHaveCount(0);

  const paso = await pasoDeAlumno(alumnoA.alumnoId, "d1");
  expect(paso.estado).toBe("en_progreso");
  expect(paso.metadata).toMatchObject({ confirmadoFamilia: true });
});

test("reportar un dato incorrecto le deja el aviso al equipo en la auditoría del alumno", async () => {
  const comentario = `E2E familias-acciones: la fecha correcta es otra (${Date.now()}).`;

  await paginaA.goto(`/familias/${alumnoA.dni}/datos`);
  await paginaA.getByRole("button", { name: "Reportar un dato incorrecto" }).click();
  await paginaA.getByLabel("¿Qué dato está mal?").selectOption("Fecha de nacimiento");
  await paginaA.getByLabel("Comentario (opcional)").fill(comentario);
  await paginaA.getByRole("button", { name: "Enviar aviso" }).click();
  await expect(paginaA.getByText("Recibimos tu aviso sobre «Fecha de nacimiento»")).toBeVisible();

  const filas = await db
    .select()
    .from(auditoria)
    .where(
      and(
        eq(auditoria.entidadTipo, "alumno"),
        eq(auditoria.entidadId, alumnoA.alumnoId),
        eq(auditoria.accion, "update")
      )
    );
  const reporte = filas.find((f) => f.metadata.comentario === comentario);
  expect(reporte, "no quedó el reporte en auditoría").toBeDefined();
  expect(reporte?.usuarioId).toBe(familiaUserIdA);
  expect(reporte?.metadata).toMatchObject({ origen: "familia", reporteDato: "Fecha de nacimiento" });
});
