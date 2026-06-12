import { test, expect, type Page } from "@playwright/test";

import { crearAlumno, crearViaje } from "./helpers";

function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.getByRole("option", { name: "Elegí un alumno…" }),
  });
}

test("tarjeta de transporte por alumno: marcar a todos completa el paso", async ({ page }) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await selectorElegibles(page).selectOption({ label: alumno.label });
  await page
    .locator("section")
    .filter({ hasText: "Alumnos asignados" })
    .getByRole("button", { name: "Asignar" })
    .click();
  await expect(page.getByText(`${alumno.apellido}, ${alumno.nombre}`).first()).toBeVisible();

  // Abrir el paso Tarjeta de transporte en el M7
  await page.getByRole("button", { name: /Tarjeta/ }).click();
  const roster = page.locator('[data-roster-cobertura="tarjeta_transporte"]');
  await expect(roster.getByText("0/1")).toBeVisible();

  // Marcar al único alumno → cobertura completa → paso Completado
  // (force: el checkbox estilizado superpone un span decorativo)
  await roster.locator('input[type="checkbox"]').check({ force: true });
  await expect(roster.getByText("1/1")).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: /Tarjeta/ })
      .locator("span")
      .filter({ hasText: "Completado" })
      .first()
  ).toBeVisible();

  // Desmarcar → el paso se reabre
  await roster.locator('input[type="checkbox"]').uncheck({ force: true });
  await expect(roster.getByText("0/1")).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: /Tarjeta/ })
      .locator("span")
      .filter({ hasText: "En progreso" })
      .first()
  ).toBeVisible();
});
