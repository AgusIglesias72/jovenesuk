import { test, expect } from "@playwright/test";

import { completarAltaAlumno, crearAlumno, seccionFormAlumno } from "./helpers";

test("crea un alumno y aparece en el listado", async ({ page }) => {
  const alumno = await crearAlumno(page);
  // El listado está paginado: lo buscamos por apellido (cubre además el filtro q).
  await page.getByPlaceholder(/Buscar por nombre/).fill(alumno.apellido);
  await expect(page.getByRole("row").filter({ hasText: alumno.label })).toBeVisible();
});

test("el alta de alumno valida los campos requeridos", async ({ page }) => {
  await page.goto("/alumnos/nuevo");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/alumnos\/nuevo/);
  await expect(page.getByText("Revisá los campos del formulario.")).toBeVisible();
});

test("un DNI repetido se explica por campo y no rompe el alta", async ({ page }) => {
  const dni = String(10000000 + Math.floor(Math.random() * 89999999));

  await crearAlumno(page, { dni, apellido: `DniDup${Math.floor(Math.random() * 100000)}` });

  await completarAltaAlumno(page, { dni, apellido: `DniDup${Math.floor(Math.random() * 100000)}` });
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/alumnos\/nuevo/);
  // El error queda asociado al campo DNI (aria-describedby), no solo en un aviso suelto.
  await expect(
    seccionFormAlumno(page, "Datos personales").getByLabel("DNI*")
  ).toHaveAccessibleDescription(/Ese DNI ya está registrado/);
});
