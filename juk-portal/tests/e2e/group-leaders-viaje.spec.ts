import { test, expect, type Page } from "@playwright/test";

import { crearGroupLeader, crearViaje } from "./helpers";

// Panel de Group Leaders del viaje (la página tiene otro panel con botón "Asignar").
function glPanel(page: Page) {
  return page.locator("section").filter({ hasText: "Group Leaders del viaje" });
}

// El <select> de GLs elegibles (único con esa opción).
function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.getByRole("option", { name: "Elegí un Group Leader…" }),
  });
}

test("asigna un Group Leader a un viaje, lo marca principal y lo quita", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  const gl = await crearGroupLeader(page);
  await crearViaje(page);
  const panel = glPanel(page);
  const label = `${gl.apellido}, ${gl.nombre}`;

  // Asignar
  await selectorElegibles(page).selectOption({ label });
  await panel.getByRole("button", { name: "Asignar" }).click();
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
  await expect(page.getByText("Todavía no hay Group Leaders asignados.")).toBeVisible();
});
