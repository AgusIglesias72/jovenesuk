import { test, expect } from "@playwright/test";

import { crearColegio } from "./helpers";

test("crea un colegio completo y aparece en el listado", async ({ page }) => {
  const { nombre } = await crearColegio(page);
  await expect(page.getByText(nombre)).toBeVisible();
});

test("el alta de colegio exige los contactos académico y administrativo", async ({ page }) => {
  await page.goto("/colegios/nuevo");
  await page.getByLabel("Nombre*", { exact: true }).fill("Colegio sin contactos");
  await page.getByLabel("Ciudad*").fill("Londres");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/colegios\/nuevo/);
  await expect(page.getByText("Revisá los campos del formulario.")).toBeVisible();
});
