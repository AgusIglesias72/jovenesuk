import { test, expect } from "@playwright/test";

import { crearViaje } from "./helpers";

test("la edición de viaje solo ofrece transiciones de estado válidas", async ({ page }) => {
  await crearViaje(page);
  await page.getByRole("link", { name: "Editar viaje" }).click();
  await expect(page).toHaveURL(/\/editar$/);

  // Un viaje recién creado arranca en "Inscripción abierta": desde ahí solo se
  // puede ir a Confirmado o Cancelado (no a En curso ni Finalizado).
  const estado = page.getByLabel("Estado", { exact: true });
  await expect(estado.locator("option")).toHaveText([
    "Inscripción abierta",
    "Confirmado",
    "Cancelado",
  ]);
});
