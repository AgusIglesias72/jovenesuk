import { test as setup, expect } from "@playwright/test";

const authFile = "tests/e2e/.auth/admin.json";

// Cuenta de TEST del seed demo (npm run db:seed:demo) — password fija de dev.
// Sobreescribible por env para CI o para correr con otra cuenta.
const EMAIL = process.env.E2E_EMAIL ?? "test.superadmin@jovenesenuk.com";
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.SEED_TEST_PASSWORD ?? "JukTest2026!";

setup("autenticar como admin", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
