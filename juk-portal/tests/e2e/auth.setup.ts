import { test as setup, expect } from "@playwright/test";

const authFile = "tests/e2e/.auth/admin.json";

// Credenciales del super_admin sembrado. Sobreescribibles por env para CI.
const EMAIL = process.env.E2E_EMAIL ?? "agustin@jovenesenuk.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "kUdzwhWzCQIl";

setup("autenticar como admin", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
