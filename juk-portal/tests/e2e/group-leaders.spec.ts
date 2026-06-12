import { test, expect } from "@playwright/test";

import { crearGroupLeader } from "./helpers";

test("crea un group leader y aparece en el listado", async ({ page }) => {
  const { apellido } = await crearGroupLeader(page);
  await expect(page.getByText(apellido).first()).toBeVisible();
});

test("el alta de group leader valida los campos requeridos", async ({ page }) => {
  await page.goto("/group-leaders/nuevo");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/group-leaders\/nuevo/);
  await expect(page.getByText("Revisá los campos del formulario.")).toBeVisible();
});
