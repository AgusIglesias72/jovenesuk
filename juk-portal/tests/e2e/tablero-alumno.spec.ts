import { test, expect, type Page } from "@playwright/test";

import { crearAlumno, crearViaje } from "./helpers";

function alumnosPanel(page: Page) {
  return page.locator("section").filter({ hasText: "Alumnos asignados" });
}

function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.getByRole("option", { name: "Elegí un alumno…" }),
  });
}

test("al asignar un alumno se crea su tablero M6 y se pueden transicionar pasos", async ({
  page,
}) => {
  // Alta de alumno + viaje + asignación (el trigger crea los 11 pasos)
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await selectorElegibles(page).selectOption({ label: alumno.label });
  await alumnosPanel(page).getByRole("button", { name: "Asignar" }).click();
  await expect(page.getByText(`${alumno.apellido}, ${alumno.nombre}`).first()).toBeVisible();

  // Ir al detalle del alumno desde el roster
  await page.getByRole("link", { name: `${alumno.apellido}, ${alumno.nombre}` }).click();
  await page.waitForURL("**/alumnos/**");

  // El tablero muestra los grupos y el Paso 0 completado (solo lectura, sin selector)
  await expect(page.getByText("Inscripción y programa")).toBeVisible();
  await expect(page.getByText("Pagos", { exact: true })).toBeVisible();
  await expect(page.getByText("Documentación de viaje")).toBeVisible();
  await expect(page.getByText("Application Form JUK (origen)")).toBeVisible();

  // C2 nace bloqueado por la dependencia con B1
  const c2 = page.locator('[data-paso="c2"]');
  await expect(c2.locator("span").filter({ hasText: "Bloqueado" }).first()).toBeVisible();

  // Transicionar B1 de pendiente a en progreso desde su card
  const b1 = page.locator('[data-paso="b1"]');
  await b1.locator("select").selectOption("en_progreso");
  await expect(b1.locator("span").filter({ hasText: "En progreso" }).first()).toBeVisible();
});
