import { test, expect } from "@playwright/test";

test("configuración de mails: guarda remitentes y la UI de prueba está disponible", async ({
  page,
}) => {
  await page.goto("/configuracion");
  await expect(page.getByRole("heading", { name: "Configuración", level: 1 })).toBeVisible();

  const mails = page.locator("[data-config-mails]");

  // Guardar un valor único y verificar persistencia tras recargar
  const nombre = `JUK E2E ${Date.now().toString().slice(-6)}`;
  await mails.getByLabel("Nombre del remitente").fill(nombre);
  await mails.getByRole("button", { name: "Guardar" }).click();
  // El feedback es un toast del design system (fuera del panel).
  await expect(page.getByText("Configuración guardada.")).toBeVisible({ timeout: 15000 });

  await page.reload();
  await expect(page.locator("[data-config-mails]").getByLabel("Nombre del remitente")).toHaveValue(
    nombre
  );

  // La validación rechaza emails inválidos
  await page
    .locator("[data-config-mails]")
    .getByLabel("Remitente de automáticos")
    .fill("no-es-un-email");
  await page.locator("[data-config-mails]").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Email inválido.").first()).toBeVisible();

  // Restaurar los defaults para no dejar la config del entorno modificada
  await page
    .locator("[data-config-mails]")
    .getByLabel("Remitente de automáticos")
    .fill("noreply@jovenesenuk.com");
  await page.locator("[data-config-mails]").getByLabel("Nombre del remitente").fill("Jóvenes en UK");
  await page.locator("[data-config-mails]").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Configuración guardada.").first()).toBeVisible({
    timeout: 15000,
  });

  // El panel de prueba ofrece templates y destinatario precargado
  const prueba = page.locator("[data-config-prueba]");
  await expect(prueba.getByRole("button", { name: "Enviar prueba" })).toBeVisible();
  await expect(prueba.getByLabel("Enviar a")).toHaveValue(/@/);
  await expect(
    prueba.locator('option:text-is("Acceso al portal (credenciales) · comunicación")')
  ).toHaveCount(1);
});
