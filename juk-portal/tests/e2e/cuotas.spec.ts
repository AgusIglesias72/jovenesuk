import { test, expect, type Page } from "@playwright/test";

import { crearAlumno, crearViaje } from "./helpers";

function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.getByRole("option", { name: "Elegí un alumno…" }),
  });
}

test("plan de cuotas end-to-end: pagos completan B1, desbloquean C2 y B2 cierra presencial", async ({
  page,
}) => {
  // Aceptar los confirm() (B2 presencial); sin esto Playwright los descarta.
  page.on("dialog", (d) => d.accept());
  // Alta + asignación (viaje con origen independiente → B2 aplica)
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await selectorElegibles(page).selectOption({ label: alumno.label });
  await page
    .locator("section")
    .filter({ hasText: "Alumnos asignados" })
    .getByRole("button", { name: "Asignar" })
    .click();
  await page.getByRole("link", { name: `${alumno.apellido}, ${alumno.nombre}` }).click();
  await page.waitForURL("**/alumnos/**");

  // Crear el plan: 2 cuotas de USD 500
  const panel = page.locator("[data-cuotas-panel]");
  await panel.getByLabel("Cuotas").fill("2");
  await panel.getByLabel("Monto por cuota").fill("500");
  await panel.getByLabel("Primer vencimiento").fill("2026-12-10");
  await panel.getByRole("button", { name: "Crear plan de cuotas" }).click();

  // El plan aparece con total y última cuota presencial (B2)
  await expect(panel.getByText("US$ 1.000,00")).toBeVisible({ timeout: 15000 });
  await expect(panel.getByText("Presencial JUK")).toBeVisible({ timeout: 15000 });

  // Pagar la cuota 1 (vía agencia) → B1 en progreso
  await panel.getByRole("button", { name: "Registrar pago" }).first().click();
  const b1 = page.locator('[data-paso="b1"]');
  await expect(b1.locator("span").filter({ hasText: "En progreso" }).first()).toBeVisible({ timeout: 15000 });
  await expect(b1.getByText("1 de 2 cuotas acreditadas")).toBeVisible({ timeout: 15000 });

  // C2 sigue bloqueado hasta completar B1
  const c2 = page.locator('[data-paso="c2"]');
  await expect(c2.locator("span").filter({ hasText: "Bloqueado" }).first()).toBeVisible({ timeout: 15000 });

  // Confirmar B2 (última cuota presencial) → B1 completado, C2 desbloqueado, B2 completado
  await panel.getByRole("button", { name: "Confirmar pago presencial" }).click();
  await expect(b1.locator("span").filter({ hasText: "Completado" }).first()).toBeVisible({ timeout: 15000 });
  await expect(c2.locator("span").filter({ hasText: "Pendiente" }).first()).toBeVisible({ timeout: 15000 });
  const b2 = page.locator('[data-paso="b2"]');
  await expect(b2.locator("span").filter({ hasText: "Completado" }).first()).toBeVisible({ timeout: 15000 });

  // El resumen quedó saldado
  await expect(panel.getByText("Plan saldado")).toBeVisible({ timeout: 15000 });
});
