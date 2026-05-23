import { test, expect } from "@playwright/test";

// Estos tests corren SIN sesión (ignoran el storageState global).
test.use({ storageState: { cookies: [], origins: [] } });

test("sin sesión, una ruta protegida redirige a login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Ingresar al portal" })).toBeVisible();
});
