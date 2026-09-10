import { test, expect } from "@playwright/test";

import {
  botonPasoViaje,
  confirmarModal,
  crearGroupLeader,
  crearViaje,
  panelGroupLeaders,
} from "./helpers";

test("asigna un Group Leader a un viaje, lo marca principal y lo quita", async ({ page }) => {
  const gl = await crearGroupLeader(page);
  await crearViaje(page);
  const panel = panelGroupLeaders(page);
  const label = `${gl.apellido}, ${gl.nombre}`;

  // Asignar — el police check del GL nuevo está "pendiente": advertencia confirmable
  await panel.getByLabel("Group Leader a asignar", { exact: true }).selectOption({ label });
  await panel.getByRole("button", { name: "Asignar", exact: true }).click();
  await confirmarModal(page, "Asignar igual");
  const fila = panel.getByRole("row").filter({ hasText: label });
  await expect(fila).toBeVisible();

  // Tras asignar un GL, el paso 05 (Police Checks) lo lista y deja de mostrar el vacío.
  await botonPasoViaje(page, "Police Checks").click();
  await expect(page.getByRole("heading", { name: "Police Checks", level: 3 })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: label })).toBeVisible();
  await expect(
    page.getByText("No hay Group Leaders asignados a este viaje todavía.")
  ).toHaveCount(0);

  // Marcar principal → aparece la marca
  await fila.getByRole("button", { name: "Marcar principal" }).click();
  await expect(fila.getByText("Principal", { exact: true })).toBeVisible();

  // Quitar → desaparece
  await fila.getByRole("button", { name: "Quitar" }).click();
  await confirmarModal(page, "Sí, quitar");
  await expect(panel.getByText("Todavía no hay Group Leaders asignados.")).toBeVisible();
});
