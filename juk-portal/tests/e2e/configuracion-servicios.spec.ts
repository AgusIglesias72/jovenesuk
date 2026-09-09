import { test, expect } from "@playwright/test";

test("configuración muestra el estado de servicios y la previsualización de templates", async ({
  page,
}) => {
  await page.goto("/configuracion");

  const servicios = page.locator("[data-config-servicios]");
  await expect(servicios.getByRole("heading", { name: "Estado de servicios" })).toBeVisible();
  await expect(servicios.getByText("Base de datos (Neon)")).toBeVisible();
  await expect(servicios.getByText("Resend (emails)")).toBeVisible();

  const preview = page.locator("[data-config-preview]");
  await expect(preview.getByRole("button", { name: "Previsualizar" })).toBeVisible();

  await expect(page.getByRole("link", { name: "Mi cuenta · cambiar contraseña" })).toHaveAttribute(
    "href",
    "/configuracion/cuenta"
  );
});

test("el playground /tests ya no existe ni aparece en el sidebar", async ({ page }) => {
  const res = await page.goto("/tests");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Esta página se fue de excursión")).toBeVisible();

  await page.goto("/configuracion");
  await expect(page.getByRole("link", { name: "Tests", exact: true })).toHaveCount(0);
});
