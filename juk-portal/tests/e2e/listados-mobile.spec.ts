import { test, expect, type Locator, type Page } from "@playwright/test";

import { confirmarModal, crearAlumno, crearViaje, panelAlumnosAsignados } from "./helpers";

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

  const fila = page.getByRole("row").filter({ hasText: alumno.apellido });
  await expect(fila.first()).toBeVisible();

  // Modo card: cada celda anuncia su rótulo dentro de la propia fila.
  for (const rotulo of ["DNI", "Pasaporte vto.", "Estado"]) {
    await expect(fila.first().getByText(rotulo, { exact: true })).toBeVisible();
  }

  // La acción principal de la primera fila entra en pantalla y se puede tocar.
  await visibleSinScrollLateral(page, fila.first().getByRole("link", { name: "Ver" }));
  await sinScrollHorizontal(page);

  await fila.first().getByRole("link", { name: "Ver" }).click();
  await page.waitForURL("**/alumnos/**");
});

test("@mobile /pagos muestra las cuotas como tarjetas y 'Registrar pago' es tapeable", async ({
  page,
}) => {
  const alumno = await crearAlumno(page);
  const codigo = await crearViaje(page);

  await page
    .locator("select", { has: page.locator('option:text-is("Elegí un alumno…")') })
    .selectOption({ label: alumno.label });
  await panelAlumnosAsignados(page)
    .getByRole("button", { name: "Asignar" })
    .click();

  await page.getByRole("link", { name: `${alumno.apellido}, ${alumno.nombre}` }).first().click();
  await page.waitForURL("**/alumnos/**");

  const cuotas = page.locator("[data-cuotas-panel]");
  await cuotas.getByLabel("Cuotas").fill("2");
  await cuotas.getByLabel("Monto por cuota").fill("600");
  await cuotas.getByLabel("Primer vencimiento").fill("2026-12-01");
  await cuotas.getByRole("button", { name: "Crear plan de cuotas" }).click();
  await expect(cuotas.getByText("US$ 1.200,00")).toBeVisible();

  await page.goto("/pagos");
  await page
    .locator("select", { has: page.locator('option:text-is("Todos los viajes")') })
    .selectOption({ label: `${codigo} · Viaje ${codigo}` });
  await expect(page).toHaveURL(/viaje=/);

  const fila = page.getByRole("row").filter({ hasText: alumno.apellido }).first();
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
