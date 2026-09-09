import { test, expect } from "@playwright/test";

// Cuenta de TEST del seed demo, igual que auth.setup.ts.
const EMAIL = process.env.E2E_EMAIL ?? "test.superadmin@jovenesenuk.com";
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.SEED_TEST_PASSWORD;
if (!PASSWORD) {
  throw new Error(
    "Falta E2E_PASSWORD o SEED_TEST_PASSWORD en el entorno (.env.local): sin eso login-ux no puede loguearse."
  );
}

test.describe("login: feedback y returnTo (sin sesión)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("?reset=success muestra la confirmación de contraseña", async ({ page }) => {
    await page.goto("/login?reset=success");
    await expect(page.getByRole("alert").filter({ hasText: "Contraseña actualizada" })).toBeVisible();
  });

  test("?inactivo=1 explica que la cuenta está desactivada", async ({ page }) => {
    await page.goto("/login?inactivo=1");
    await expect(page.getByRole("alert").filter({ hasText: "Cuenta desactivada" })).toBeVisible();
  });

  test("?portal=familias le habla a la familia", async ({ page }) => {
    await page.goto("/login?portal=familias");
    await expect(
      page.getByRole("heading", { name: "Ingresá al Portal de Familias" })
    ).toBeVisible();
  });

  test("un returnTo hacia otro dominio termina en /dashboard", async ({ page }) => {
    await page.goto("/login?returnTo=%2F%2Fevil.com");
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("un returnTo con backslash tampoco escapa del portal", async ({ page }) => {
    await page.goto("/login?returnTo=%2F%5Cevil.com");
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("back-office: 404 propio", () => {
  test("un alumno inexistente muestra el 404 del portal, no el público", async ({ page }) => {
    await page.goto("/alumnos/00000000");

    await expect(page.getByRole("heading", { name: "No encontramos eso" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir al dashboard" })).toBeVisible();
    await expect(page.getByText("se fue de excursión")).toHaveCount(0);
  });
});
