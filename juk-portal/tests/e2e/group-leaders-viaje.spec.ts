import { test, expect, type Page } from "@playwright/test";

import { confirmarModal, crearGroupLeader, crearViaje } from "./helpers";

// Panel de Group Leaders del viaje (la página tiene otro panel con botón "Asignar").
function glPanel(page: Page) {
  return page.locator("section").filter({ hasText: "Group Leaders del viaje" });
}

// El <select> de GLs elegibles (único con esa opción).
function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.locator('option:text-is("Elegí un Group Leader…")'),
  });
}

test("asigna un Group Leader a un viaje, lo marca principal y lo quita", async ({ page }) => {
  const gl = await crearGroupLeader(page);
  await crearViaje(page);
  const panel = glPanel(page);
  const label = `${gl.apellido}, ${gl.nombre}`;

  // Asignar — el police check del GL nuevo está "pendiente": advertencia confirmable
  await selectorElegibles(page).selectOption({ label });
  await panel.getByRole("button", { name: "Asignar" }).click();
  await confirmarModal(page, "Asignar igual");
  await expect(panel.getByText(label).first()).toBeVisible();

  // Tras asignar un GL, el paso 05 (Police Checks) deja de mostrar el vacío.
  await page.getByRole("button", { name: /05\s*Police Checks/ }).click();
  await expect(
    page.getByText("No hay Group Leaders asignados a este viaje todavía.")
  ).toHaveCount(0);

  // Marcar principal → aparece la marca
  await panel.getByRole("button", { name: "Marcar principal" }).click();
  await expect(panel.getByText("Principal", { exact: true })).toBeVisible();

  // Quitar → desaparece
  await panel.getByRole("button", { name: "Quitar" }).click();
  await confirmarModal(page, "Sí, quitar");
  await expect(page.getByText("Todavía no hay Group Leaders asignados.")).toBeVisible();
});
