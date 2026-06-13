import { test, expect, type Page } from "@playwright/test";

import { crearAlumno, crearViaje } from "./helpers";

function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.locator('option:text-is("Elegí un alumno…")'),
  });
}

test("módulo Pagos: lista las cuotas, filtra por viaje y registra un pago", async ({ page }) => {
  page.on("dialog", (d) => d.accept());

  // Alumno + viaje + plan de 2 cuotas (desde la ficha)
  const alumno = await crearAlumno(page);
  const codigo = await crearViaje(page);
  await selectorElegibles(page).selectOption({ label: alumno.label });
  await page
    .locator("section")
    .filter({ hasText: "Alumnos asignados" })
    .getByRole("button", { name: "Asignar" })
    .click();
  await page.getByRole("link", { name: `${alumno.apellido}, ${alumno.nombre}` }).first().click();
  await page.waitForURL("**/alumnos/**");

  const panel = page.locator("[data-cuotas-panel]");
  await panel.getByLabel("Cuotas").fill("2");
  await panel.getByLabel("Monto por cuota").fill("700");
  await panel.getByLabel("Primer vencimiento").fill("2026-12-01");
  await panel.getByRole("button", { name: "Crear plan de cuotas" }).click();
  await expect(panel.getByText("US$ 1.400,00")).toBeVisible({ timeout: 15000 });

  // El detalle del viaje muestra la sección Pagos (US-24) con el plan al día
  await page.goto("/viajes");
  await page.getByRole("row", { name: new RegExp(codigo) }).getByRole("link", { name: "Ver" }).click();
  const pagosViaje = page.locator("[data-pagos-viaje]");
  await expect(pagosViaje.getByText(`${alumno.apellido}, ${alumno.nombre}`)).toBeVisible();
  await expect(pagosViaje.getByText("0 / 2")).toBeVisible();
  await expect(pagosViaje.getByText("Al día").first()).toBeVisible();

  // Módulo global: filtrar por el viaje → 2 cuotas pendientes
  await page.goto("/pagos");
  await expect(page.getByRole("heading", { name: "Pagos", level: 1 })).toBeVisible();
  await page
    .locator("select", { has: page.locator('option:text-is("Todos los viajes")') })
    .selectOption({ label: `${codigo} · Viaje ${codigo}` });
  // Esperar a que la navegación del filtro commitee antes de operar la tabla.
  await expect(page).toHaveURL(/viaje=/);
  await expect(page.locator("tbody tr")).toHaveCount(2);

  // Registrar el pago de la cuota 1 desde el módulo
  const fila1 = page.locator("tbody tr").first();
  await fila1.getByRole("button", { name: "Registrar pago" }).click();
  await expect(fila1.getByText("Pagada")).toBeVisible({ timeout: 15000 });

  // El filtro por estado deja solo la pendiente
  await page
    .locator("select", { has: page.locator('option:text-is("Todos los estados")') })
    .selectOption("pendiente");
  await expect(page).toHaveURL(/estado=pendiente/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr").first().getByText("(última)")).toBeVisible();
});
