import { eq } from "drizzle-orm";
import { test, expect, type Page } from "@playwright/test";

import { db } from "../../src/lib/db";
import { consultas, suscriptores } from "../../src/lib/db/schema/leads";

/*
 * Captación de leads (form de /contacto) + newsletter (Hero del home).
 * El frontend valida y muestra estados; el backend PERSISTE y avisa al equipo.
 * Estos tests verifican la persistencia contra la DB de dev cubriendo las
 * distintas opciones del form. Corren sin sesión (sitio público); los emails
 * usan @e2e.example.com para que el teardown los limpie.
 *
 * Los controles se seleccionan por su label (el <Field> asocia label↔control y
 * el <Select> del design system mantiene un <select> nativo como fuente de
 * verdad), no por id: es lo robusto frente a cambios de markup.
 */

test.use({ storageState: { cookies: [], origins: [] } });

// La primera visita a una ruta pública compila la página + la server action en
// dev (cold start), lo que puede superar el timeout default de 30s. Damos aire.
test.beforeEach(() => {
  test.setTimeout(60_000);
});

let seq = 0;
function emailE2E(prefijo: string): string {
  seq += 1;
  return `${prefijo}-${Date.now()}-${seq}@e2e.example.com`;
}

function consultaPorEmail(email: string) {
  return db.select().from(consultas).where(eq(consultas.email, email));
}

/** Completa los campos de texto comunes del lead y deja la página en /contacto. */
async function abrirYCompletarBase(page: Page, email: string) {
  await page.goto("/contacto");
  await page.getByLabel("Nombre").fill("Lead");
  await page.getByLabel("Apellido").fill("E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Teléfono").fill("1133334444");
}

async function aceptarConsentimiento(page: Page) {
  // El input está cubierto por el box decorativo; un usuario real tilda haciendo
  // click en el label (que togglea el checkbox por asociación).
  await page.getByText("Acepto que Jóvenes en UK").click();
}

async function enviarLead(page: Page) {
  await aceptarConsentimiento(page);
  await page.getByRole("button", { name: "Quiero que me contacten" }).click();
  await expect(page.getByText("¡Gracias por tu consulta!")).toBeVisible();
}

test("lead 'para mí': se guarda con su modalidad y momento", async ({ page }) => {
  const email = emailE2E("lead-parami");
  await abrirYCompletarBase(page, email);
  await page.getByLabel("¿Qué te interesa?").selectOption("asesoramiento");
  await page.getByLabel("¿Cuándo te gustaría viajar?").selectOption("este_ano");
  await enviarLead(page);

  await expect.poll(async () => (await consultaPorEmail(email)).length).toBe(1);
  const [fila] = await consultaPorEmail(email);
  expect(fila?.nombre).toBe("Lead");
  expect(fila?.paraQuien).toBe("para_mi");
  expect(fila?.modalidad).toBe("asesoramiento");
  expect(fila?.cuando).toBe("este_ano");
  expect(fila?.estado).toBe("nueva");
  expect(fila?.institucion).toBeNull();
});

test("lead 'para un colegio': muestra y exige la institución, y la guarda", async ({ page }) => {
  const email = emailE2E("lead-colegio");
  await abrirYCompletarBase(page, email);

  // Al elegir "colegio" aparece el campo de institución.
  await page.getByLabel("¿Para quién es la consulta?").selectOption("colegio");
  await expect(page.getByLabel("Colegio / institución")).toBeVisible();
  await page.getByLabel("Colegio / institución").fill("Instituto E2E");
  await page.getByLabel("¿Qué te interesa?").selectOption("grupal");
  await page.getByLabel("¿Cuándo te gustaría viajar?").selectOption("proximos_3_meses");
  await enviarLead(page);

  await expect.poll(async () => (await consultaPorEmail(email)).length).toBe(1);
  const [fila] = await consultaPorEmail(email);
  expect(fila?.paraQuien).toBe("colegio");
  expect(fila?.institucion).toBe("Instituto E2E");
  expect(fila?.modalidad).toBe("grupal");
});

test("lead 'para mi hijo/a': guarda Study & Work con destino", async ({ page }) => {
  const email = emailE2E("lead-hijo");
  await abrirYCompletarBase(page, email);
  await page.getByLabel("¿Para quién es la consulta?").selectOption("para_mi_hijo");
  await page.getByLabel("¿Qué te interesa?").selectOption("study_work");
  await page.getByLabel("Destino de interés").selectOption("reino_unido");
  await page.getByLabel("¿Cuándo te gustaría viajar?").selectOption("proximo_ano");
  await enviarLead(page);

  await expect.poll(async () => (await consultaPorEmail(email)).length).toBe(1);
  const [fila] = await consultaPorEmail(email);
  expect(fila?.paraQuien).toBe("para_mi_hijo");
  expect(fila?.modalidad).toBe("study_work");
  expect(fila?.destino).toBe("reino_unido");
  expect(fila?.cuando).toBe("proximo_ano");
});

test("lead inválido: sin elegir modalidad muestra el error y no persiste", async ({ page }) => {
  const email = emailE2E("lead-invalido");
  await abrirYCompletarBase(page, email);
  // Dejamos "modalidad" en el placeholder a propósito.
  await page.getByLabel("¿Cuándo te gustaría viajar?").selectOption("este_ano");
  await aceptarConsentimiento(page);
  await page.getByRole("button", { name: "Quiero que me contacten" }).click();

  await expect(page.getByText("Elegí una opción.")).toBeVisible();
  await expect(page.getByText("¡Gracias por tu consulta!")).toHaveCount(0);
  expect((await consultaPorEmail(email)).length).toBe(0);
});

test("newsletter: se suscribe y es idempotente", async ({ page }) => {
  const email = emailE2E("nl");

  await page.goto("/");
  await page.locator("#nl-email").fill(email);
  await page.getByRole("button", { name: "Suscribirme" }).click();
  await expect(page.getByText(/Te suscribiste/)).toBeVisible();

  await expect
    .poll(async () => (await db.select().from(suscriptores).where(eq(suscriptores.email, email))).length)
    .toBe(1);

  // Re-suscribir el mismo email no duplica (onConflictDoNothing).
  await page.goto("/");
  await page.locator("#nl-email").fill(email);
  await page.getByRole("button", { name: "Suscribirme" }).click();
  await expect(page.getByText(/Te suscribiste/)).toBeVisible();

  const rows = await db.select().from(suscriptores).where(eq(suscriptores.email, email));
  expect(rows.length).toBe(1);
});
