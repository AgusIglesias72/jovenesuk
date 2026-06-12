import { test, expect } from "@playwright/test";

// La sesión global es la del super_admin sembrado: debe poder entrar a Usuarios.
test("el super_admin accede a Usuarios y ve el alta", async ({ page }) => {
  await page.goto("/usuarios");
  await expect(page.getByRole("heading", { name: "Usuarios", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Nuevo/ })).toBeVisible();
});
