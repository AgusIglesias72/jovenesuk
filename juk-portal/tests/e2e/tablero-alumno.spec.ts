import { test, expect, type Page } from "@playwright/test";

import { crearAlumno, crearViaje, panelAlumnosAsignados } from "./helpers";

function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.locator('option:text-is("Elegí un alumno…")'),
  });
}

test("al asignar un alumno se crea su tablero M6 y se pueden transicionar pasos", async ({
  page,
}) => {
  // Alta de alumno + viaje + asignación (el trigger crea los 11 pasos)
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await selectorElegibles(page).selectOption({ label: alumno.label });
  await panelAlumnosAsignados(page).getByRole("button", { name: "Asignar" }).click();
  await expect(page.getByText(`${alumno.apellido}, ${alumno.nombre}`).first()).toBeVisible();

  // Ir al detalle del alumno desde el roster
  await page.getByRole("link", { name: `${alumno.apellido}, ${alumno.nombre}` }).first().click();
  await page.waitForURL("**/alumnos/**");

  // El tablero muestra los grupos y el Paso 0 completado (solo lectura, sin selector)
  await expect(page.getByText("Inscripción y programa")).toBeVisible();
  await expect(page.getByText("Pagos", { exact: true })).toBeVisible();
  await expect(page.getByText("Documentación de viaje")).toBeVisible();
  await expect(page.getByText("Application Form JUK (origen)")).toBeVisible();

  // C2 nace bloqueado por la dependencia con B1
  const c2 = page.locator('[data-paso="c2"]');
  await expect(c2.locator("span").filter({ hasText: "Bloqueado" }).first()).toBeVisible();

  // B1 es solo lectura: su estado lo deriva el plan de cuotas, así que su card
  // no tiene selector de transición.
  const b1 = page.locator('[data-paso="b1"]');
  await expect(b1.locator("select")).toHaveCount(0);

  // Un paso editable sí se transiciona desde su card (A1: pendiente → en progreso).
  const a1 = page.locator('[data-paso="a1"]');
  await a1.locator("select").selectOption("en_progreso");
  await expect(a1.locator("span").filter({ hasText: "En progreso" }).first()).toBeVisible();
});
