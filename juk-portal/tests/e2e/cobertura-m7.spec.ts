import { test, expect } from "@playwright/test";

import { asignarAlumnoAlViaje, botonPasoViaje, crearAlumno, crearViaje } from "./helpers";

test("tarjeta de transporte por alumno: marcar a todos completa el paso", async ({ page }) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await asignarAlumnoAlViaje(page, alumno);

  // Abrir el paso Tarjetas de transporte en el M7
  const paso = botonPasoViaje(page, "Tarjetas de transporte");
  await paso.click();
  const roster = page.locator('[data-roster-cobertura="tarjeta_transporte"]');
  await expect(roster.getByText("0/1")).toBeVisible();

  // Cada checkbox se nombra con el alumno: así se elige la fila correcta aunque haya varias.
  const tarjeta = roster.getByRole("checkbox", {
    name: `Tarjeta entregada · ${alumno.label}`,
    exact: true,
  });

  // Marcar al único alumno → cobertura completa → paso Completado.
  // click y no check(): el checkbox lo controla el estado del server y recién
  // cambia con el refresh, así que check() fallaría por "did not change its state".
  await tarjeta.click();
  await expect(tarjeta).toBeChecked();
  await expect(roster.getByText("1/1")).toBeVisible();
  await expect(paso).toContainText("Completado");

  // Desmarcar → el paso se reabre
  await tarjeta.click();
  await expect(tarjeta).not.toBeChecked();
  await expect(roster.getByText("0/1")).toBeVisible();
  await expect(paso).toContainText("En progreso");
});
