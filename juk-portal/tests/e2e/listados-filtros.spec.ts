import { test, expect, type Page } from "@playwright/test";

import { COLEGIO_E2E, confirmarModal, crearAlumno, crearViaje, type AlumnoCreado, panelAlumnosAsignados } from "./helpers";

/**
 * Listados de Viajes y Alumnos (US-12 / US-17) y detalle del viaje (4.5):
 * columnas nuevas, filtros en la URL, subnavegación con anclas y alertas del
 * viaje. Los filtros se verifican por lo que cambian en la URL y en las filas,
 * nunca por clases CSS.
 */

function selectConOpcion(page: Page, opcion: string) {
  return page.locator("select", { has: page.locator(`option:text-is("${opcion}")`) });
}

/** Asigna desde el detalle del viaje; acepta la advertencia no bloqueante si aparece. */
async function asignar(page: Page, alumno: AlumnoCreado) {
  await selectConOpcion(page, "Elegí un alumno…").selectOption({ label: alumno.label });
  await panelAlumnosAsignados(page).getByRole("button", { name: "Asignar" }).click();

  const fila = panelAlumnosAsignados(page).getByRole("link", { name: alumno.label });
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.or(fila)).toBeVisible();
  if (await dialogo.isVisible()) await confirmarModal(page, "Asignar igual");
  await expect(fila).toBeVisible();
}

test("el listado de viajes muestra inscriptos / cupo y filtra por año y colegio", async ({
  page,
}) => {
  const alumno = await crearAlumno(page);
  const codigo = await crearViaje(page, { fechaInicio: "2031-03-02", fechaFin: "2031-03-20" });
  await asignar(page, alumno);

  await page.goto(`/viajes?q=${codigo}`);
  const fila = page.getByRole("row").filter({ hasText: codigo });
  await expect(fila.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(fila.getByRole("progressbar", { name: `Ocupación del cupo de ${codigo}` })).toBeVisible();

  // Año: el del viaje lo incluye, otro lo excluye (la URL es la fuente de verdad).
  await selectConOpcion(page, "Todos los años").selectOption("2031");
  await expect(page).toHaveURL(/anio=2031/);
  await expect(page.getByRole("row").filter({ hasText: codigo })).toBeVisible();

  await page.goto(`/viajes?q=${codigo}&anio=2030`);
  await expect(page.getByText("Sin resultados para estos filtros")).toBeVisible();

  // Colegio destino: combo con los colegios que tienen viajes.
  await page.goto(`/viajes?q=${codigo}`);
  await selectConOpcion(page, "Todos los colegios").selectOption({ label: COLEGIO_E2E });
  await expect(page).toHaveURL(/colegio=/);
  await expect(page.getByRole("row").filter({ hasText: codigo })).toBeVisible();

  // Un param inválido se ignora sin romper los demás filtros.
  await page.goto(`/viajes?q=${codigo}&anio=abc&pais=narnia`);
  await expect(page.getByRole("row").filter({ hasText: codigo })).toBeVisible();

  // "Limpiar filtros" vuelve al listado sin params.
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page).toHaveURL(/\/viajes$/);
});

test("el listado de alumnos muestra el viaje y filtra por viaje y paso pendiente", async ({
  page,
}) => {
  const asignado = await crearAlumno(page);
  const sinViaje = await crearAlumno(page);
  const codigo = await crearViaje(page);
  await asignar(page, asignado);

  const opcionViaje = `${codigo} · Viaje ${codigo}`;

  // La fila muestra el código del viaje como link al detalle.
  await page.goto(`/alumnos?q=${asignado.apellido}`);
  const fila = page.getByRole("row").filter({ hasText: asignado.apellido });
  await expect(fila.getByRole("link", { name: codigo })).toHaveAttribute("href", `/viajes/${codigo}`);

  // Filtro por viaje: el asignado aparece…
  await selectConOpcion(page, "Todos los viajes").selectOption({ label: opcionViaje });
  await expect(page).toHaveURL(/viaje=/);
  await expect(page.getByRole("row").filter({ hasText: asignado.apellido })).toBeVisible();

  // …y con paso pendiente dentro de ese viaje (A1 nace pendiente), también.
  await selectConOpcion(page, "Cualquier paso").selectOption("a1");
  await expect(page).toHaveURL(/paso=a1/);
  await expect(page.getByRole("row").filter({ hasText: asignado.apellido })).toBeVisible();

  // El que no está en el viaje queda afuera.
  await page.goto(`/alumnos?q=${sinViaje.apellido}`);
  await expect(page.getByRole("row").filter({ hasText: sinViaje.apellido }).getByText("Sin viaje")).toBeVisible();
  await selectConOpcion(page, "Todos los viajes").selectOption({ label: opcionViaje });
  await expect(page.getByText("Sin resultados para estos filtros")).toBeVisible();
});

test("el detalle del viaje tiene resumen, subnavegación con anclas y alertas propias", async ({
  page,
}) => {
  // Pasaporte que vence antes de inicio + 6 meses: dispara la alerta conservadora
  // del viaje (sigue siendo válido para el Reino Unido, así que se puede asignar).
  const apellido = `AlertaPas${Math.floor(Math.random() * 100000)}`;
  const dni = String(10000000 + Math.floor(Math.random() * 89999999));
  await page.goto("/alumnos/nuevo");
  await page.getByLabel("Nombre*", { exact: true }).first().fill("Alumno");
  await page.getByLabel("Apellido*", { exact: true }).fill(apellido);
  await page.getByLabel("Fecha de nacimiento*").fill("2008-05-10");
  await page.getByLabel("DNI*").fill(dni);
  await page.getByLabel("N° de pasaporte*").fill(`AE${100000 + Math.floor(Math.random() * 899999)}`);
  await page.getByLabel("Vencimiento del pasaporte*").fill("2027-05-01");
  await page.getByLabel("Nombre*", { exact: true }).nth(1).fill("Tutor Uno");
  await page.getByLabel("Celular*", { exact: true }).fill("+541199999999");
  await page.getByLabel("Email*", { exact: true }).fill(`tutor-${dni}@example.com`);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/alumnos$/);
  const alumno: AlumnoCreado = { nombre: "Alumno", apellido, label: `${apellido}, Alumno` };

  const codigo = await crearViaje(page);

  // Resumen: barras de ocupación y de trámites.
  await expect(page.getByRole("progressbar", { name: "Ocupación del cupo" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Trámites completos" })).toBeVisible();

  // Las cinco secciones siguen montadas a la vez (no son tabs).
  await expect(panelAlumnosAsignados(page)).toBeVisible();
  await expect(page.locator("section").filter({ hasText: "Group Leaders del viaje" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Seguimiento del viaje · M7" })).toBeAttached();

  // Sin alumnos todavía, el viaje no tiene alertas.
  await expect(page.locator("#alertas").getByText("Sin alertas")).toBeVisible();

  await asignar(page, alumno);
  await page.goto(`/viajes/${codigo}`);
  await expect(
    page.locator("#alertas").getByText(`Pasaporte por vencer · ${alumno.label}`)
  ).toBeVisible();

  // La subnav salta a la sección por ancla.
  const subnav = page.getByRole("navigation", { name: "Secciones del viaje" });
  await subnav.getByRole("link", { name: "Seguimiento M7" }).click();
  await expect(page).toHaveURL(new RegExp(`/viajes/${codigo}#seguimiento$`));
  await expect(page.getByRole("heading", { name: "Seguimiento del viaje · M7" })).toBeInViewport();
});
