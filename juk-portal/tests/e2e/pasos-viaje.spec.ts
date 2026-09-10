import { test, expect } from "@playwright/test";

import { botonPasoViaje, crearViaje, selectorEstadoPaso } from "./helpers";

const PASOS = [
  ["01", "Pasajes"],
  ["02", "Excursiones"],
  ["03", "Transfers"],
  ["04", "Tarjetas de transporte"],
  ["05", "Police Checks"],
] as const;

test("el tablero M7 muestra los 5 pasos del viaje", async ({ page }) => {
  await crearViaje(page);
  await expect(page.getByRole("heading", { name: "Seguimiento del viaje · M7" })).toBeVisible();
  for (const [num, label] of PASOS) {
    await expect(botonPasoViaje(page, label)).toContainText(num);
  }
});

test("Transfers no puede avanzar mientras Pasajes no esté completado", async ({ page }) => {
  await crearViaje(page);
  await botonPasoViaje(page, "Transfers").click();

  await expect(page.getByText("Transfers depende de que")).toBeVisible();
  // El selector de estado solo ofrece Pendiente y Bloqueado (sin avanzar).
  await expect(selectorEstadoPaso(page, "Transfers").locator("option")).toHaveText([
    "Pendiente",
    "Bloqueado",
  ]);
});

test("al completar Pasajes, Transfers habilita las transiciones de avance", async ({ page }) => {
  await crearViaje(page);

  await botonPasoViaje(page, "Pasajes").click();
  await selectorEstadoPaso(page, "Pasajes").selectOption({ label: "Completado" });
  await expect(botonPasoViaje(page, "Pasajes")).toContainText("Completado");

  await botonPasoViaje(page, "Transfers").click();
  await expect(selectorEstadoPaso(page, "Transfers").locator("option")).toHaveText([
    "Pendiente",
    "En progreso",
    "Completado",
    "Bloqueado",
  ]);
});

test("los datos de Pasajes se guardan y persisten", async ({ page }) => {
  await crearViaje(page);
  await botonPasoViaje(page, "Pasajes").click();

  await page.getByLabel("Aerolínea").fill("British Airways");
  await page.getByLabel("N° de vuelo").fill("BA246");
  await page.getByRole("button", { name: "Guardar datos" }).click();

  // Esperar la confirmación del guardado antes de recargar: sin esto, el reload
  // puede ganarle a la server action y la aserción de persistencia se vuelve flaky.
  await expect(page.getByText("Paso guardado")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Aerolínea")).toHaveValue("British Airways");
  await expect(page.getByLabel("N° de vuelo")).toHaveValue("BA246");
});

test("Police Checks avisa cuando el viaje no tiene Group Leaders asignados", async ({ page }) => {
  await crearViaje(page);
  await botonPasoViaje(page, "Police Checks").click();
  await expect(
    page.getByText("No hay Group Leaders asignados a este viaje todavía.")
  ).toBeVisible();
});
