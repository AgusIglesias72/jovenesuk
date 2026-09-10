import { expect, test } from "@playwright/test";

import { abrirProspecto, crearProspecto } from "./helpers";

/*
 * Navegación en teléfono. La app nativa va a ser esta misma web dentro de
 * Capacitor, así que lo que no se pueda operar con el pulgar acá tampoco va a
 * funcionar allá.
 *
 * El viewport se fija en el propio spec (no depende de que exista el proyecto
 * "mobile" de Playwright) y los casos van tagueados @mobile.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("@mobile el drawer del admin navega y se cierra", async ({ page }) => {
  await page.goto("/dashboard");

  const drawer = page.getByRole("dialog", { name: "Navegación" });
  await expect(drawer).toBeHidden();

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(drawer).toBeVisible();

  await drawer.getByRole("link", { name: "Alumnos" }).click();
  await expect(page).toHaveURL(/\/alumnos$/);
  await expect(drawer).toBeHidden();
});

test("@mobile Escape cierra el drawer y devuelve el foco a la hamburguesa", async ({
  page,
}) => {
  await page.goto("/dashboard");

  const hamburguesa = page.getByRole("button", { name: "Abrir menú" });
  const drawer = page.getByRole("dialog", { name: "Navegación" });

  await hamburguesa.click();
  await expect(drawer).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(hamburguesa).toBeFocused();
});

test("@mobile mueve un prospecto de etapa desde la tarjeta y persiste", async ({
  page,
}) => {
  const { nombre } = await crearProspecto(page);
  await page.goto("/prospectos");

  const mover = page.getByLabel(`Mover ${nombre} a otra etapa`);
  await expect(mover).toHaveCount(1);

  await Promise.all([
    page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes("/prospectos")
    ),
    mover.selectOption("contactado"),
  ]);

  await abrirProspecto(page, nombre);
  await expect(page.getByText("Nuevo → Contactado")).toBeVisible();
});

test.describe("sitio público", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("@mobile el menú del sitio abre y cierra con Escape", async ({ page }) => {
    await page.goto("/");

    const menu = page.getByRole("navigation", { name: "Menú" });
    await expect(menu).toBeHidden();

    await page.getByRole("button", { name: "Abrir menú" }).click();
    await expect(menu).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
  });
});
