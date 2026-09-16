import { inArray } from "drizzle-orm";
import { test, expect, type Locator, type Page } from "@playwright/test";

import { db } from "../../src/lib/db";
import { consultas, suscriptores } from "../../src/lib/db/schema";

import { esperarHidratacion } from "./helpers";

/*
 * Smoke tests del SITIO PÚBLICO (marketing). Corren sin sesión: el proyecto
 * "public" de playwright.config no depende del setup de auth. Cubren que las
 * páginas carguen, el SEO técnico responda, los redirects y 404 anden, y que
 * los formularios envíen (eso último SÍ toca la DB y persiste el lead).
 *
 * Como el proyecto "public" no dispara el teardown global, los leads que crea
 * se borran acá mismo en el afterAll (emails @e2e.example.com).
 */
test.use({ storageState: { cookies: [], origins: [] } });

const emailsCreados: string[] = [];

function emailE2E(prefijo: string): string {
  const email = `${prefijo}-${Date.now()}-${emailsCreados.length}@e2e.example.com`;
  emailsCreados.push(email);
  return email;
}

test.afterAll(async () => {
  if (emailsCreados.length === 0) return;
  await db.delete(consultas).where(inArray(consultas.email, emailsCreados));
  await db.delete(suscriptores).where(inArray(suscriptores.email, emailsCreados));
});

const PAGINAS: Array<[string, RegExp]> = [
  ["/", /Aprendé inglés/],
  ["/quienes-somos", /Referentes de educación/],
  ["/salidas", /Tres maneras de viajar/],
  ["/programas", /Un programa para cada etapa/],
  ["/contacto", /Hablemos de tu próximo viaje/],
  ["/consulta", /Armemos juntos tu viaje/],
  ["/notas", /Guías y consejos para estudiar inglés/],
  ["/notas/study-work-irlanda-guia-argentinos", /Study & Work en Irlanda/],
  ["/privacidad", /Política de Privacidad/],
];

for (const [path, heading] of PAGINAS) {
  test(`carga ${path} con su h1`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
}

test("robots, sitemap y la OG image responden", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  expect(xml).toContain("<urlset");
  expect(xml).toContain("/notas/");

  const og = await request.get("/notas/study-work-irlanda-guia-argentinos/og");
  expect(og.ok()).toBeTruthy();
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("redirige las URLs viejas del Wix (301)", async ({ page }) => {
  await page.goto("/quienessomos");
  await expect(page).toHaveURL(/\/quienes-somos$/);
});

test("una nota inexistente muestra el 404", async ({ page }) => {
  // El proxy permite /notas/*; un slug que no existe llama notFound().
  await page.goto("/notas/esta-nota-no-existe-xyz");
  await expect(page.getByText("Esta página se fue de excursión")).toBeVisible();
});

test("la navegación lleva a las secciones", async ({ page }) => {
  await page.goto("/");
  // La nav principal del header (el footer repite el mismo link).
  await page
    .getByRole("navigation", { name: "Principal", exact: true })
    .getByRole("link", { name: "Salidas", exact: true })
    .click();
  await expect(page).toHaveURL(/\/salidas$/);
  await expect(page.getByRole("heading", { level: 1, name: /Tres maneras de viajar/ })).toBeVisible();
});

test("una nota muestra su tabla comparativa y los enlaces internos", async ({ page }) => {
  await page.goto("/notas/study-work-irlanda-guia-argentinos");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Enlaces útiles")).toBeVisible();
});

test("el newsletter del hero se envía", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Tu email", { exact: true }).fill(emailE2E("suscriptor"));
  await page.getByRole("button", { name: "Suscribirme" }).click();
  await expect(page.getByText(/Te suscribiste/)).toBeVisible();
});

/**
 * Casilla de consentimiento del formulario de consulta. Su nombre accesible es
 * la frase completa (la fija `aria-label`), justamente para que el link que
 * lleva adentro no la parta.
 */
function consentimiento(page: Page): Locator {
  return page.getByRole("checkbox", { name: /^Acepto que Jóvenes en UK use mis datos/ });
}

/**
 * Tilda el consentimiento clickeando su texto (el <label> envuelve al input).
 * Se clickea el ARRANQUE de la frase, no el centro: la Política de Privacidad
 * es un <a> dentro de ese mismo texto y un click al centro puede caerle encima,
 * que abre una pestaña en vez de tildar la casilla.
 */
async function tildarConsentimiento(page: Page) {
  const casilla = consentimiento(page);
  await esperarHidratacion(casilla);
  await page
    .getByText(/^Acepto que Jóvenes en UK use mis datos/)
    .click({ position: { x: 4, y: 4 } });
  await expect(casilla).toBeChecked();
}

test("el formulario de consulta valida y se envía", async ({ page }) => {
  await page.goto("/consulta");

  const enviar = page.getByRole("button", { name: "Quiero que me contacten" });

  // Con campos vacíos no se envía (Zod valida en el servidor): no hay éxito.
  await enviar.click();
  await expect(page.getByText("¡Gracias por tu consulta!")).toHaveCount(0);

  // Camino feliz: incluye los selects obligatorios (que arrancan vacíos).
  await page.getByLabel("Nombre").fill("Juan");
  await page.getByLabel("Apellido").fill("Pérez");
  await page.getByLabel("Email").fill(emailE2E("consulta"));
  await page.getByLabel(/Tel[eé]fono/).fill("1133334444");
  await page.getByLabel("¿Qué te interesa?").selectOption("grupal");
  await page.getByLabel("¿Cuándo te gustaría viajar?").selectOption("proximos_3_meses");
  await tildarConsentimiento(page);
  await enviar.click();

  await expect(page.getByText("¡Gracias por tu consulta!")).toBeVisible();
});

test("el consentimiento linkea la Política de Privacidad y el label sigue tildando", async ({
  page,
}) => {
  await page.goto("/consulta");

  // La frase entera tiene que quedar en el nombre accesible: un lector de
  // pantalla no puede anunciar el consentimiento cortado en el link.
  await expect(consentimiento(page)).toHaveAccessibleName(/Política de Privacidad\.$/);

  // El footer repite el link, así que se ancla al contenido principal.
  const link = page
    .getByRole("main")
    .getByRole("link", { name: "Política de Privacidad", exact: true });
  await expect(link).toHaveAttribute("href", "/privacidad");
  await expect(link).toHaveAttribute("target", "_blank");

  // Borde: el <a> vive DENTRO del <label>, y activar el label no tiene que
  // tildar la casilla cuando el click apunta a contenido interactivo.
  await esperarHidratacion(consentimiento(page));
  const [politica] = await Promise.all([page.waitForEvent("popup"), link.click()]);
  await expect(
    politica.getByRole("heading", { level: 1, name: "Política de Privacidad" })
  ).toBeVisible();
  await politica.close();
  await expect(consentimiento(page)).not.toBeChecked();

  // Y el resto del label sigue siendo clickeable.
  await tildarConsentimiento(page);
});

test("al elegir colegio aparece el campo de institución", async ({ page }) => {
  await page.goto("/consulta");
  await expect(page.getByLabel("Colegio / institución")).toHaveCount(0);
  await page.getByLabel("¿Para quién es la consulta?").selectOption("colegio");
  await expect(page.getByLabel("Colegio / institución")).toBeVisible();
});
