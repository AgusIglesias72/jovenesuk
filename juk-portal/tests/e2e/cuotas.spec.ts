import { test, expect, type Page } from "@playwright/test";

import { confirmarModal, crearAlumno, crearViaje, panelAlumnosAsignados } from "./helpers";

function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.locator('option:text-is("Elegí un alumno…")'),
  });
}

test("plan de cuotas end-to-end: pagos completan B1, desbloquean C2 y B2 cierra presencial", async ({
  page,
}) => {
  // Alta + asignación (viaje con origen independiente → B2 aplica)
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await selectorElegibles(page).selectOption({ label: alumno.label });
  await panelAlumnosAsignados(page)
    .getByRole("button", { name: "Asignar" })
    .click();
  await page.getByRole("link", { name: `${alumno.apellido}, ${alumno.nombre}` }).first().click();
  await page.waitForURL("**/alumnos/**");

  // Crear el plan: 2 cuotas de USD 500
  const panel = page.locator("[data-cuotas-panel]");
  await panel.getByLabel("Cuotas").fill("2");
  await panel.getByLabel("Monto por cuota").fill("500");
  await panel.getByLabel("Primer vencimiento").fill("2026-12-10");
  await panel.getByRole("button", { name: "Crear plan de cuotas" }).click();

  // El plan aparece con total y última cuota presencial (B2)
  await expect(panel.getByText("US$ 1.000,00")).toBeVisible();
  await expect(panel.getByText("Presencial JUK")).toBeVisible();

  // Pagar la cuota 1 (vía agencia) → B1 en progreso
  await panel.getByRole("button", { name: "Registrar pago" }).first().click();
  await confirmarModal(page, "Registrar pago");
  const b1 = page.locator('[data-paso="b1"]');
  await expect(b1.locator("span").filter({ hasText: "En progreso" }).first()).toBeVisible();
  await expect(b1.getByText("1 de 2 cuotas acreditadas")).toBeVisible();

  // C2 sigue bloqueado hasta completar B1
  const c2 = page.locator('[data-paso="c2"]');
  await expect(c2.locator("span").filter({ hasText: "Bloqueado" }).first()).toBeVisible();

  // Confirmar B2 (última cuota presencial) → B1 completado, C2 desbloqueado, B2 completado
  await panel.getByRole("button", { name: "Confirmar pago presencial" }).click();
  await confirmarModal(page, "Sí, confirmar pago");
  await expect(b1.locator("span").filter({ hasText: "Completado" }).first()).toBeVisible();
  await expect(c2.locator("span").filter({ hasText: "Pendiente" }).first()).toBeVisible();
  const b2 = page.locator('[data-paso="b2"]');
  await expect(b2.locator("span").filter({ hasText: "Completado" }).first()).toBeVisible();

  // El resumen quedó saldado
  await expect(panel.getByText("Plan saldado")).toBeVisible();
});
