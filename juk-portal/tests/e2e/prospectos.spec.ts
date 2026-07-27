import { test, expect } from "@playwright/test";

import { abrirProspecto, confirmarModal, crearProspecto } from "./helpers";

test("crea un prospecto y aparece en el pipeline", async ({ page }) => {
  const { nombre } = await crearProspecto(page);
  await expect(page.getByText(nombre, { exact: true })).toBeVisible();
});

test("el alta de prospecto exige el nombre", async ({ page }) => {
  await page.goto("/prospectos/nuevo");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/prospectos\/nuevo/);
});

test("el toggle de vista cambia a tabla y vuelve a kanban", async ({ page }) => {
  const { nombre } = await crearProspecto(page);
  await page.getByRole("link", { name: "Tabla" }).click();
  await expect(page).toHaveURL(/vista=tabla/);
  await expect(page.getByRole("cell", { name: nombre })).toBeVisible();
});

test("agrega una nota interna y aparece en el historial", async ({ page }) => {
  const { nombre } = await crearProspecto(page);
  await abrirProspecto(page, nombre);

  const texto = "Llamé al director, responde la semana que viene.";
  await page.getByLabel("Agregar nota interna").fill(texto);
  await page.getByRole("button", { name: "Agregar nota" }).click();

  await expect(page.getByText(texto)).toBeVisible();
});

test("convierte el prospecto en colegio cliente", async ({ page }) => {
  const { nombre } = await crearProspecto(page);
  await abrirProspecto(page, nombre);

  await page.getByRole("button", { name: "Convertir a colegio cliente" }).click();
  await confirmarModal(page, "Convertir");

  await expect(page.getByRole("link", { name: /Ya es colegio cliente/ })).toBeVisible();

  // El colegio cliente quedó creado en el ABM de Colegios.
  await page.goto("/colegios");
  await expect(page.getByText(nombre, { exact: true })).toBeVisible();
});

test("importa prospectos desde CSV pegado", async ({ page }) => {
  const marca = Math.floor(Math.random() * 1e6);
  const a = `Prospecto E2E Import A ${marca}`;
  const b = `Prospecto E2E Import B ${marca}`;
  const csv = [
    "nombre,email,ciudad,pais",
    `${a},a-${marca}@example.com;a2-${marca}@example.com,Córdoba,Argentina`,
    `${b},b-${marca}@example.com,Londres,Reino Unido`,
  ].join("\n");

  await page.goto("/prospectos/importar");
  await page.getByLabel("Pegá las filas").fill(csv);
  await page.getByRole("button", { name: "Previsualizar" }).click();

  await expect(page.getByText(/2 filas/)).toBeVisible();
  await page.getByRole("button", { name: /Importar 2 prospectos/ }).click();

  await expect(page).toHaveURL(/\/prospectos$/);
  await expect(page.getByText(a, { exact: true })).toBeVisible();
  await expect(page.getByText(b, { exact: true })).toBeVisible();
});
