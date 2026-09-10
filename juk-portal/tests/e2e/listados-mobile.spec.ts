import { test, expect, type Locator, type Page } from "@playwright/test";

import {
  abrirFichaDesdeViaje,
  asignarAlumnoAlViaje,
  confirmarModal,
  crearAlumno,
  crearPlanCuotas,
  crearViaje,
} from "./helpers";

/**
 * @mobile — los listados en un teléfono.
 *
 * La app nativa es Capacitor envolviendo esta web, así que /alumnos y /pagos
 * tienen que operarse con el pulgar: cada fila se lee como una tarjeta (rótulo
 * + valor, uno abajo del otro) y la acción principal de la primera fila se ve y
 * se toca SIN scroll horizontal.
 *
 * Se verifica por rol y por texto (nunca por clase CSS): lo que importa es que
 * la tarjeta anuncie el rótulo de cada dato y que el botón caiga dentro del
 * viewport, no cómo esté implementado el layout.
 */
test.use({ viewport: { width: 390, height: 844 } });

/** El body no puede desbordar a lo ancho: nada de scroll horizontal. */
async function sinScrollHorizontal(page: Page) {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(desborda, "la página no debe scrollear horizontalmente").toBe(false);
}

/** La caja del elemento entra entera en el ancho del viewport. */
async function visibleSinScrollLateral(page: Page, accion: Locator) {
  await expect(accion).toBeVisible();
  const caja = await accion.boundingBox();
  if (!caja) throw new Error("la acción principal no tiene caja: no está renderizada");
  const ancho = page.viewportSize()?.width ?? 0;
  expect(caja.x).toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width).toBeLessThanOrEqual(ancho);
  // Touch target real: al menos los 44px del token --tap.
  expect(caja.height).toBeGreaterThanOrEqual(40);
}

test("@mobile /alumnos muestra las filas como tarjetas y 'Ver' es tapeable", async ({ page }) => {
  const alumno = await crearAlumno(page);

  await page.goto("/alumnos");
  await page.getByPlaceholder(/Buscar por nombre/).fill(alumno.apellido);
  await expect(page).toHaveURL(/\/alumnos\?q=/);

  // Por "Apellido, Nombre" y no solo por apellido: la búsqueda es parcial y un
  // apellido de otra corrida que lo contenga traería dos filas.
  const fila = page.getByRole("row").filter({ hasText: alumno.label });
  await expect(fila).toBeVisible();

  // Modo card: cada celda anuncia su rótulo dentro de la propia fila.
  for (const rotulo of ["DNI", "Pasaporte vto.", "Estado"]) {
    await expect(fila.getByText(rotulo, { exact: true })).toBeVisible();
  }

  // La acción principal de la fila entra en pantalla y se puede tocar.
  const ver = fila.getByRole("link", { name: "Ver" });
  await visibleSinScrollLateral(page, ver);
  await sinScrollHorizontal(page);

  await ver.click();
  await page.waitForURL(`**/alumnos/${alumno.dni}`);
});

test("@mobile /pagos muestra las cuotas como tarjetas y 'Registrar pago' es tapeable", async ({
  page,
}) => {
  const alumno = await crearAlumno(page);
  const codigo = await crearViaje(page);
  await asignarAlumnoAlViaje(page, alumno);
  await abrirFichaDesdeViaje(page, alumno);

  const cuotas = await crearPlanCuotas(page, {
    cuotas: "2",
    monto: "600",
    primerVencimiento: "2026-12-01",
  });
  await expect(cuotas.getByText("US$ 1.200,00")).toBeVisible();

  await page.goto("/pagos");
  await page
    .getByLabel("Filtrar por viaje", { exact: true })
    .selectOption({ label: `${codigo} · Viaje ${codigo}` });
  await expect(page).toHaveURL(/viaje=/);

  // La cuota 1: la 2° es la última (presencial) y se distingue por "(última)".
  const fila = page
    .getByRole("row")
    .filter({ hasText: alumno.label })
    .filter({ hasNotText: "(última)" });
  await expect(fila).toBeVisible();

  for (const rotulo of ["Viaje", "Monto", "Vencimiento", "Estado"]) {
    await expect(fila.getByText(rotulo, { exact: true })).toBeVisible();
  }

  await visibleSinScrollLateral(page, fila.getByRole("button", { name: "Registrar pago" }));
  await sinScrollHorizontal(page);

  // Y se puede operar de verdad desde el teléfono.
  await fila.getByRole("button", { name: "Registrar pago" }).click();
  await confirmarModal(page, "Registrar pago");
  await expect(fila.getByText("Pagada")).toBeVisible();
});
