import { test, expect } from "@playwright/test";

import {
  COLEGIO_E2E,
  asignarAlumnoAlViaje,
  crearAlumno,
  crearViaje,
  panelAlumnosAsignados,
  panelGroupLeaders,
} from "./helpers";

/**
 * Listados de Viajes y Alumnos (US-12 / US-17) y detalle del viaje (4.5):
 * columnas nuevas, filtros en la URL, subnavegación con anclas y alertas del
 * viaje. Los filtros se ubican por su nombre accesible ("Filtrar por …") y se
 * verifican por lo que cambian en la URL y en las filas, nunca por clases CSS.
 */

test("el listado de viajes muestra inscriptos / cupo y filtra por año y colegio", async ({
  page,
}) => {
  const alumno = await crearAlumno(page);
  const codigo = await crearViaje(page, { fechaInicio: "2031-03-02", fechaFin: "2031-03-20" });
  await asignarAlumnoAlViaje(page, alumno, { aceptarAdvertencia: true });

  await page.goto(`/viajes?q=${codigo}`);
  const fila = page.getByRole("row").filter({ hasText: codigo });
  await expect(fila.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(fila.getByRole("progressbar", { name: `Ocupación del cupo de ${codigo}` })).toBeVisible();

  // Año: el del viaje lo incluye, otro lo excluye (la URL es la fuente de verdad).
  await page.getByLabel("Filtrar por año", { exact: true }).selectOption("2031");
  await expect(page).toHaveURL(/anio=2031/);
  await expect(page.getByRole("row").filter({ hasText: codigo })).toBeVisible();

  await page.goto(`/viajes?q=${codigo}&anio=2030`);
  await expect(page.getByText("Sin resultados para estos filtros")).toBeVisible();

  // Colegio destino: combo con los colegios que tienen viajes.
  await page.goto(`/viajes?q=${codigo}`);
  await page
    .getByLabel("Filtrar por colegio destino", { exact: true })
    .selectOption({ label: COLEGIO_E2E });
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
  await asignarAlumnoAlViaje(page, asignado, { aceptarAdvertencia: true });

  const opcionViaje = `${codigo} · Viaje ${codigo}`;
  const filtroViaje = page.getByLabel("Filtrar por viaje", { exact: true });

  // La fila muestra el código del viaje como link al detalle.
  await page.goto(`/alumnos?q=${asignado.apellido}`);
  const fila = page.getByRole("row").filter({ hasText: asignado.label });
  await expect(fila.getByRole("link", { name: codigo })).toHaveAttribute("href", `/viajes/${codigo}`);

  // Filtro por viaje: el asignado aparece…
  await filtroViaje.selectOption({ label: opcionViaje });
  await expect(page).toHaveURL(/viaje=/);
  await expect(page.getByRole("row").filter({ hasText: asignado.label })).toBeVisible();

  // …y con paso pendiente dentro de ese viaje (A1 nace pendiente), también.
  await page.getByLabel("Filtrar por paso pendiente", { exact: true }).selectOption("a1");
  await expect(page).toHaveURL(/paso=a1/);
  await expect(page.getByRole("row").filter({ hasText: asignado.label })).toBeVisible();

  // El que no está en el viaje queda afuera.
  await page.goto(`/alumnos?q=${sinViaje.apellido}`);
  await expect(page.getByRole("row").filter({ hasText: sinViaje.label }).getByText("Sin viaje")).toBeVisible();
  await filtroViaje.selectOption({ label: opcionViaje });
  await expect(page.getByText("Sin resultados para estos filtros")).toBeVisible();
});

test("el detalle del viaje tiene resumen, subnavegación con anclas y alertas propias", async ({
  page,
}) => {
  // Pasaporte que vence antes de inicio + 6 meses: dispara la alerta conservadora
  // del viaje (sigue siendo válido para el Reino Unido, así que se puede asignar).
  const alumno = await crearAlumno(page, {
    apellido: `AlertaPas${Math.floor(Math.random() * 100000)}`,
    vencimientoPasaporte: "2027-05-01",
  });

  const codigo = await crearViaje(page);

  // Resumen: barras de ocupación y de trámites.
  await expect(page.getByRole("progressbar", { name: "Ocupación del cupo" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Trámites completos" })).toBeVisible();

  // Las cinco secciones siguen montadas a la vez (no son tabs).
  await expect(panelAlumnosAsignados(page)).toBeVisible();
  await expect(panelGroupLeaders(page)).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Seguimiento del viaje · M7" })).toBeAttached();

  // Sin alumnos todavía, el viaje no tiene alertas.
  const alertas = page.getByRole("region", { name: "Alertas del viaje", exact: true });
  await expect(alertas.getByText("Sin alertas")).toBeVisible();

  await asignarAlumnoAlViaje(page, alumno, { aceptarAdvertencia: true });
  await page.goto(`/viajes/${codigo}`);
  await expect(alertas.getByText(`Pasaporte por vencer · ${alumno.label}`)).toBeVisible();

  // La subnav salta a la sección por ancla.
  const subnav = page.getByRole("navigation", { name: "Secciones del viaje" });
  await subnav.getByRole("link", { name: "Seguimiento M7" }).click();
  await expect(page).toHaveURL(new RegExp(`/viajes/${codigo}#seguimiento$`));
  await expect(page.getByRole("heading", { name: "Seguimiento del viaje · M7" })).toBeInViewport();
});
