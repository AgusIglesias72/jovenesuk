import { test, expect } from "@playwright/test";

import { COLEGIO_E2E, codigoViajeUnico } from "./helpers";

test("crea un viaje y aparece en el listado", async ({ page }) => {
  const codigo = codigoViajeUnico();

  await page.goto("/viajes/nuevo");
  await page.getByLabel("Código").fill(codigo);
  await page.getByLabel("Nombre").fill("Viaje de prueba E2E");
  await page.getByLabel("Fecha de inicio").fill("2027-02-02");
  await page.getByLabel("Fecha de fin").fill("2027-02-20");
  await page.getByLabel("Colegio destino").selectOption({ label: COLEGIO_E2E });
  await page.getByLabel("Curso").fill("General English");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/viajes$/);
  // La lista está paginada: filtrar por código para encontrarlo sin importar el volumen.
  await page.getByPlaceholder("Buscar por código o nombre…").fill(codigo);
  await expect(page.getByText(codigo)).toBeVisible();
});
