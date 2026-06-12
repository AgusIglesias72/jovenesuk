import { test, expect, type Page } from "@playwright/test";

import { crearViaje, selectorEstadoPaso } from "./helpers";

// Los pasos se identifican por su número + label. Hace falta el número porque el
// botón de "Transfers" bloqueado incluye el texto "Requiere Pasajes", lo que
// haría ambiguo un match por /Pasajes/ solo.
const PASOS = [
  ["01", "Pasajes"],
  ["02", "Excursiones"],
  ["03", "Transfers"],
  ["04", "Tarjetas de transporte"],
  ["05", "Police Checks"],
] as const;

function pasoBtn(page: Page, num: string, label: string) {
  return page.getByRole("button", { name: new RegExp(`${num} ${label}`) });
}

test("el tablero M7 muestra los 5 pasos del viaje", async ({ page }) => {
  await crearViaje(page);
  await expect(page.getByRole("heading", { name: "Seguimiento del viaje · M7" })).toBeVisible();
  for (const [num, label] of PASOS) {
    await expect(pasoBtn(page, num, label)).toBeVisible();
  }
});

test("Transfers no puede avanzar mientras Pasajes no esté completado", async ({ page }) => {
  await crearViaje(page);
  await pasoBtn(page, "03", "Transfers").click();

  await expect(page.getByText("Transfers depende de que")).toBeVisible();
  // El selector de estado solo ofrece Pendiente y Bloqueado (sin avanzar).
  await expect(selectorEstadoPaso(page).locator("option")).toHaveText(["Pendiente", "Bloqueado"]);
});

test("al completar Pasajes, Transfers habilita las transiciones de avance", async ({ page }) => {
  await crearViaje(page);

  await pasoBtn(page, "01", "Pasajes").click();
  await selectorEstadoPaso(page).selectOption({ label: "Completado" });
  await expect(pasoBtn(page, "01", "Pasajes").filter({ hasText: "Completado" })).toBeVisible();

  await pasoBtn(page, "03", "Transfers").click();
  await expect(selectorEstadoPaso(page).locator("option")).toHaveText([
    "Pendiente",
    "En progreso",
    "Completado",
    "Bloqueado",
  ]);
});

test("los datos de Pasajes se guardan y persisten", async ({ page }) => {
  await crearViaje(page);
  await pasoBtn(page, "01", "Pasajes").click();

  await page.getByLabel("Aerolínea").fill("British Airways");
  await page.getByLabel("N° de vuelo").fill("BA246");
  await page.getByRole("button", { name: "Guardar datos" }).click();

  await page.reload();
  await expect(page.getByLabel("Aerolínea")).toHaveValue("British Airways");
  await expect(page.getByLabel("N° de vuelo")).toHaveValue("BA246");
});

test("Police Checks avisa cuando el viaje no tiene Group Leaders asignados", async ({ page }) => {
  await crearViaje(page);
  await pasoBtn(page, "05", "Police Checks").click();
  await expect(
    page.getByText("No hay Group Leaders asignados a este viaje todavía.")
  ).toBeVisible();
});
