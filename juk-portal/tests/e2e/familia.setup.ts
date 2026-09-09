import { test as setup, expect } from "@playwright/test";

/**
 * Sesión de familia, guardada una sola vez para todo el spec del portal.
 *
 * Loguearse en cada test agotaba la ventana de rate limit de Better-Auth
 * (`/sign-in/email`) y hacía fallar los últimos tests de la corrida por
 * "credenciales inválidas" cuando en realidad estaban bien.
 */
const authFile = "tests/e2e/.auth/familia.json";

const EMAIL = process.env.E2E_FAMILIA_EMAIL ?? "tutor@demo.jovenesenuk.com";
const PASSWORD =
  process.env.E2E_FAMILIA_PASSWORD ??
  process.env.SEED_FAMILIA_PASSWORD ??
  process.env.SEED_TEST_PASSWORD;
if (!PASSWORD) {
  throw new Error(
    "Falta E2E_FAMILIA_PASSWORD, SEED_FAMILIA_PASSWORD o SEED_TEST_PASSWORD en el entorno (.env.local): sin eso no se puede armar la sesión de familia."
  );
}

setup("autenticar como familia", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
  await expect(page.getByRole("heading", { name: "Resumen", level: 1 })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
