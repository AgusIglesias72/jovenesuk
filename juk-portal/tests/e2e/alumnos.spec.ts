import { test, expect } from "@playwright/test";

import { crearAlumno } from "./helpers";

test("crea un alumno y aparece en el listado", async ({ page }) => {
  const { apellido } = await crearAlumno(page);
  await expect(page.getByText(apellido).first()).toBeVisible();
});

test("el alta de alumno valida los campos requeridos", async ({ page }) => {
  await page.goto("/alumnos/nuevo");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/alumnos\/nuevo/);
  await expect(page.getByText("Revisá los campos del formulario.")).toBeVisible();
});
