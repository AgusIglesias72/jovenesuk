import { test, expect, type Page } from "@playwright/test";

import { crearAlumno, crearViaje } from "./helpers";

// El panel de asignación de alumnos (hay otros paneles con botón "Asignar" en la
// misma página, como el de Group Leaders, así que scopeamos por la sección).
function alumnosPanel(page: Page) {
  return page.locator("section").filter({ hasText: "Alumnos asignados" });
}

// El <select> de alumnos elegibles (único con esa opción).
function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.getByRole("option", { name: "Elegí un alumno…" }),
  });
}

test("asigna un alumno a un viaje y descuenta el cupo", async ({ page }) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  const panel = alumnosPanel(page);

  await selectorElegibles(page).selectOption({ label: alumno.label });
  await panel.getByRole("button", { name: "Asignar" }).click();

  await expect(page.getByText(`${alumno.apellido}, ${alumno.nombre}`).first()).toBeVisible();
  await expect(page.getByText(/^1 \/ \d+ cupos$/)).toBeVisible();
});

// Regresión del bug crítico: la unique constraint (alumno, viaje) no incluye el
// estado, así que re-asignar un alumno previamente desasignado (cancelado) debía
// reactivar la fila en vez de fallar con "ya está asignado".
test("permite re-asignar un alumno que fue desasignado del mismo viaje", async ({ page }) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  const panel = alumnosPanel(page);
  const elegibles = selectorElegibles(page);

  // 1) Asignar
  await elegibles.selectOption({ label: alumno.label });
  await panel.getByRole("button", { name: "Asignar" }).click();
  await expect(page.getByText(`${alumno.apellido}, ${alumno.nombre}`).first()).toBeVisible();

  // 2) Quitar (soft-cancel: la fila queda en "cancelada", no se borra)
  await panel.getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByText("Todavía no hay alumnos asignados.")).toBeVisible();

  // 3) Re-asignar el mismo alumno al mismo viaje
  await elegibles.selectOption({ label: alumno.label });
  await panel.getByRole("button", { name: "Asignar" }).click();

  await expect(page.getByText(`${alumno.apellido}, ${alumno.nombre}`).first()).toBeVisible();
  await expect(page.getByText("El alumno ya está asignado a este viaje.")).toHaveCount(0);
});
