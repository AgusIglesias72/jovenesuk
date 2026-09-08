import { test as setup, expect } from "@playwright/test";

const authFile = "tests/e2e/.auth/admin.json";

// Cuenta de TEST del seed demo (npm run db:seed:demo). La contraseña nunca va
// en el código: viene de E2E_PASSWORD (CI / otra cuenta) o de SEED_TEST_PASSWORD.
const EMAIL = process.env.E2E_EMAIL ?? "test.superadmin@jovenesenuk.com";
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.SEED_TEST_PASSWORD;
if (!PASSWORD) {
  throw new Error("Falta E2E_PASSWORD o SEED_TEST_PASSWORD en el entorno (.env.local): sin eso el setup de auth no puede loguearse.");
}

setup("autenticar como admin", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
