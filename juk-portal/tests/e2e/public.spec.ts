import { test, expect } from "@playwright/test";

/*
 * Smoke tests del SITIO PÚBLICO (marketing). Corren sin sesión y sin DB:
 * el proyecto "public" de playwright.config no depende del setup de auth.
 * Cubren que las páginas carguen, el SEO técnico responda, los redirects y
 * 404 anden, y que los formularios envíen.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const PAGINAS: Array<[string, RegExp]> = [
  ["/", /Aprendé inglés/],
  ["/quienes-somos", /Referentes de educación/],
  ["/salidas", /Tres maneras de viajar/],
  ["/programas", /Un programa para cada etapa/],
  ["/contacto", /Hablemos de tu próximo viaje/],
  ["/consulta", /Armemos juntos tu viaje/],
  ["/notas", /Guías y consejos para estudiar inglés/],
  ["/notas/study-work-irlanda-guia-argentinos", /Study & Work en Irlanda/],
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
  await page.getByRole("link", { name: "Salidas" }).first().click();
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
  await page.locator("#nl-email").fill("suscriptor@example.com");
  await page.getByRole("button", { name: "Suscribirme" }).click();
  await expect(page.getByText(/Te suscribiste/)).toBeVisible();
});

test("el formulario de consulta valida y se envía", async ({ page }) => {
  await page.goto("/consulta");

  const enviar = page.getByRole("button", { name: "Quiero que me contacten" });

  // Con campos vacíos no se envía (Zod valida en el servidor): no hay éxito.
  await enviar.click();
  await expect(page.getByText("¡Gracias por tu consulta!")).toHaveCount(0);

  // Camino feliz: incluye los selects obligatorios (que arrancan vacíos).
  await page.getByLabel("Nombre").fill("Juan");
  await page.getByLabel("Apellido").fill("Pérez");
  await page.getByLabel("Email").fill("juan@example.com");
  await page.getByLabel(/Tel[eé]fono/).fill("1133334444");
  await page.getByLabel("¿Qué te interesa?").selectOption("grupal");
  await page.getByLabel("¿Cuándo te gustaría viajar?").selectOption("proximos_3_meses");
  await page.getByText(/Acepto que Jóvenes en UK use mis datos/).click();
  await enviar.click();

  // La validación pasó y la action corrió: éxito (DB disponible) o el error
  // genérico de procesamiento (no un error de validación de campos).
  await expect(
    page
      .getByText("¡Gracias por tu consulta!")
      .or(page.getByText(/No pudimos procesar/)),
  ).toBeVisible();
});

test("al elegir colegio aparece el campo de institución", async ({ page }) => {
  await page.goto("/consulta");
  await expect(page.getByLabel("Colegio / institución")).toHaveCount(0);
  await page.getByLabel("¿Para quién es la consulta?").selectOption("colegio");
  await expect(page.getByLabel("Colegio / institución")).toBeVisible();
});
