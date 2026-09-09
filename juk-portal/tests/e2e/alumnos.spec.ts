import { test, expect } from "@playwright/test";

import { crearAlumno } from "./helpers";

test("crea un alumno y aparece en el listado", async ({ page }) => {
  const { apellido } = await crearAlumno(page);
  // El listado está paginado: lo buscamos por apellido (cubre además el filtro q).
  await page.getByPlaceholder(/Buscar por nombre/).fill(apellido);
  await expect(page.getByText(apellido).first()).toBeVisible();
});

test("el alta de alumno valida los campos requeridos", async ({ page }) => {
  await page.goto("/alumnos/nuevo");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/alumnos\/nuevo/);
  await expect(page.getByText("Revisá los campos del formulario.")).toBeVisible();
});

test("un DNI repetido se explica por campo y no rompe el alta", async ({ page }) => {
  const dni = String(10000000 + Math.floor(Math.random() * 89999999));

  const completarAlta = async (apellido: string) => {
    await page.goto("/alumnos/nuevo");
    await page.getByLabel("Nombre*", { exact: true }).first().fill("Alumno");
    await page.getByLabel("Apellido*", { exact: true }).fill(apellido);
    await page.getByLabel("Fecha de nacimiento*").fill("2008-05-10");
    await page.getByLabel("DNI*").fill(dni);
    await page.getByLabel("N° de pasaporte*").fill(`AE${100000 + Math.floor(Math.random() * 899999)}`);
    await page.getByLabel("Vencimiento del pasaporte*").fill("2032-12-31");
    await page.getByLabel("Nombre*", { exact: true }).nth(1).fill("Tutor Uno");
    await page.getByLabel("Celular*", { exact: true }).fill("+541199999999");
    await page.getByLabel("Email*", { exact: true }).fill(`tutor-${dni}@example.com`);
    await page.getByRole("button", { name: "Guardar" }).click();
  };

  await completarAlta(`DniDup${Math.floor(Math.random() * 100000)}`);
  await expect(page).toHaveURL(/\/alumnos$/);

  await completarAlta(`DniDup${Math.floor(Math.random() * 100000)}`);
  await expect(page).toHaveURL(/\/alumnos\/nuevo/);
  await expect(page.getByText("Ese DNI ya está registrado")).toBeVisible();
});
