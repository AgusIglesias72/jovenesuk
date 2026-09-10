import { test, expect } from "@playwright/test";

import {
  asignarAlumnoAlViaje,
  confirmarModal,
  crearAlumno,
  crearViaje,
  panelAlumnosAsignados,
} from "./helpers";

test("asigna un alumno a un viaje y descuenta el cupo", async ({ page }) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);

  await asignarAlumnoAlViaje(page, alumno);

  await expect(panelAlumnosAsignados(page).getByText(/^1 \/ \d+ cupos$/)).toBeVisible();
});

// Regresión del bug crítico: la unique constraint (alumno, viaje) no incluye el
// estado, así que re-asignar un alumno previamente desasignado (cancelado) debía
// reactivar la fila en vez de fallar con "ya está asignado".
test("permite re-asignar un alumno que fue desasignado del mismo viaje", async ({ page }) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  const panel = panelAlumnosAsignados(page);

  // 1) Asignar
  const fila = await asignarAlumnoAlViaje(page, alumno);

  // 2) Quitar (soft-cancel: la fila queda en "cancelada", no se borra)
  await panel.getByRole("button", { name: "Quitar" }).click();
  await confirmarModal(page, "Sí, quitar");
  await expect(fila).toHaveCount(0);
  await expect(panel.getByText("Todavía no hay alumnos asignados.")).toBeVisible();

  // 3) Re-asignar el mismo alumno al mismo viaje
  await asignarAlumnoAlViaje(page, alumno);
  await expect(page.getByText("El alumno ya está asignado a este viaje.")).toHaveCount(0);
});
