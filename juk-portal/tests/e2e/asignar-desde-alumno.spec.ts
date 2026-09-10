import { test, expect, type Page } from "@playwright/test";

import { abrirViaje, confirmarModal, crearViaje, panelAlumnosAsignados } from "./helpers";

/*
 * Asignar un alumno a un viaje DESDE su ficha (/alumnos/<dni>), el camino
 * natural cuando llega un pre-inscripto. Usa la misma server action que el
 * roster del viaje, así que se verifica el efecto en las dos pantallas.
 */

type AlumnoConDni = { dni: string; nombre: string; apellido: string; label: string };

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

/*
 * Como `crearAlumno` de helpers.ts, pero devuelve el DNI (la ficha se abre por
 * slug) y permite un pasaporte vencido. El email `tutor-…@example.com` es el
 * patrón que limpia el teardown.
 */
async function crearAlumnoConDni(
  page: Page,
  opts?: { vencimientoPasaporte?: string }
): Promise<AlumnoConDni> {
  const nombre = "Alumno";
  const apellido = `Ficha${rand(100000)}`;
  const dni = String(10000000 + rand(89999999));

  await page.goto("/alumnos/nuevo");
  await page.getByLabel("Nombre*", { exact: true }).first().fill(nombre);
  await page.getByLabel("Apellido*", { exact: true }).fill(apellido);
  await page.getByLabel("Fecha de nacimiento*").fill("2008-05-10");
  await page.getByLabel("DNI*").fill(dni);
  await page.getByLabel("N° de pasaporte*").fill(`AE${100000 + rand(899999)}`);
  await page
    .getByLabel("Vencimiento del pasaporte*")
    .fill(opts?.vencimientoPasaporte ?? "2032-12-31");
  await page.getByLabel("Nombre*", { exact: true }).nth(1).fill("Tutor Uno");
  await page.getByLabel("Celular*", { exact: true }).fill("+541199999999");
  await page.getByLabel("Email*", { exact: true }).fill(`tutor-${dni}@example.com`);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/alumnos$/);
  return { dni, nombre, apellido, label: `${apellido}, ${nombre}` };
}

function panelAsignar(page: Page) {
  return page.locator("[data-asignar-viaje]");
}

/** Elige el viaje por código: el label completo incluye fecha y cupo, que varían. */
async function elegirViaje(page: Page, codigo: string) {
  const select = panelAsignar(page).locator("select");
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
  const alumno = await crearAlumnoConDni(page);
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
  await expect(page.locator('[data-paso="a1"]')).toBeVisible();

  // El viaje ya no se ofrece de nuevo y el panel pasa a "otro viaje".
  await expect(panelAsignar(page).getByText("Asignar a otro viaje")).toBeVisible();
  await expect(
    panelAsignar(page).locator("select option", { hasText: codigo })
  ).toHaveCount(0);

  // En el roster del viaje figura el alumno y el cupo descontado.
  await abrirViaje(page, codigo);
  const roster = panelAlumnosAsignados(page);
  await expect(roster.getByRole("link", { name: alumno.label })).toBeVisible();
  await expect(page.getByText(/^1 \/ \d+ cupos$/)).toBeVisible();
});

test("con pasaporte vencido pide confirmación antes de asignar desde la ficha", async ({
  page,
}) => {
  const alumno = await crearAlumnoConDni(page, { vencimientoPasaporte: "2020-01-01" });
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
  await expect(page.getByRole("dialog")).toContainText("pasaporte");
  await confirmarModal(page, "Asignar igual");

  await expect(tableroDe(page, codigo)).toBeVisible();
  await expect(page.getByText("Inscripción y programa")).toBeVisible();
});
