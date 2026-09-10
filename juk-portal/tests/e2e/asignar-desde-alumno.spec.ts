import { test, expect, type Page } from "@playwright/test";

import {
  abrirViaje,
  confirmarModal,
  crearAlumno,
  crearViaje,
  panelAlumnosAsignados,
  pasoAlumno,
} from "./helpers";

/*
 * Asignar un alumno a un viaje DESDE su ficha (/alumnos/<dni>), el camino
 * natural cuando llega un pre-inscripto. Usa la misma server action que el
 * roster del viaje, así que se verifica el efecto en las dos pantallas.
 */

function panelAsignar(page: Page) {
  return page.locator("[data-asignar-viaje]");
}

function selectorViaje(page: Page) {
  return panelAsignar(page).getByLabel("Viaje a asignar", { exact: true });
}

/** Elige el viaje por código: el label completo incluye fecha y cupo, que varían. */
async function elegirViaje(page: Page, codigo: string) {
  const select = selectorViaje(page);
  const valor = await select.locator("option", { hasText: codigo }).getAttribute("value");
  if (!valor) throw new Error(`El viaje ${codigo} no aparece entre los asignables`);
  await select.selectOption(valor);
}

/** Encabezado de la asignación en la ficha: el link al viaje solo existe si hay tablero. */
function tableroDe(page: Page, codigo: string) {
  return page.getByRole("link", { name: codigo, exact: true });
}

test("asigna un alumno desde su ficha: crea el tablero M6 y aparece en el viaje", async ({
  page,
}) => {
  const alumno = await crearAlumno(page);
  const codigo = await crearViaje(page);

  await page.goto(`/alumnos/${alumno.dni}`);
  await expect(panelAsignar(page).getByText("Asignar a un viaje")).toBeVisible();

  await elegirViaje(page, codigo);
  // Al elegir, el panel muestra el contexto del viaje antes de confirmar.
  // exact/regex anclado: los <option> ocultos del select también contienen el código y el cupo.
  await expect(panelAsignar(page).getByText(`Viaje ${codigo}`, { exact: true })).toBeVisible();
  await expect(panelAsignar(page).getByText(/^0\/\d+ cupos$/)).toBeVisible();
  await panelAsignar(page).getByRole("button", { name: "Asignar" }).click();

  // Tablero M6 creado en la misma ficha, con los grupos y el Paso 0.
  await expect(tableroDe(page, codigo)).toBeVisible();
  await expect(page.getByText("Inscripción y programa")).toBeVisible();
  await expect(page.getByText("Application Form JUK (origen)")).toBeVisible();
  await expect(pasoAlumno(page, "a1")).toBeVisible();

  // El viaje ya no se ofrece de nuevo y el panel pasa a "otro viaje".
  await expect(panelAsignar(page).getByText("Asignar a otro viaje")).toBeVisible();
  await expect(selectorViaje(page).locator("option", { hasText: codigo })).toHaveCount(0);

  // En el roster del viaje figura el alumno y el cupo descontado.
  await abrirViaje(page, codigo);
  const roster = panelAlumnosAsignados(page);
  await expect(roster.getByRole("link", { name: alumno.label, exact: true })).toBeVisible();
  await expect(roster.getByText(/^1 \/ \d+ cupos$/)).toBeVisible();
});

test("con pasaporte vencido pide confirmación antes de asignar desde la ficha", async ({
  page,
}) => {
  const alumno = await crearAlumno(page, { vencimientoPasaporte: "2020-01-01" });
  const codigo = await crearViaje(page);

  await page.goto(`/alumnos/${alumno.dni}`);

  // 1) La advertencia aparece y, si se cancela, no se asigna nada.
  await elegirViaje(page, codigo);
  await panelAsignar(page).getByRole("button", { name: "Asignar" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText("el pasaporte del alumno no cumple el requisito de vigencia");
  await confirmarModal(page, "Cancelar");
  await expect(dialogo).toHaveCount(0);
  await expect(tableroDe(page, codigo)).toHaveCount(0);

  // 2) Confirmando la advertencia, la asignación sigue y se crea el tablero.
  await elegirViaje(page, codigo);
  await panelAsignar(page).getByRole("button", { name: "Asignar" }).click();
  await expect(dialogo).toContainText("pasaporte");
  await confirmarModal(page, "Asignar igual");

  await expect(tableroDe(page, codigo)).toBeVisible();
  await expect(page.getByText("Inscripción y programa")).toBeVisible();
});
