import { test, expect, type Page } from "@playwright/test";

import { crearViaje } from "./helpers";
import { crearViajeConTipo } from "./helpers-flujos";

/*
 * Seguimiento M7 del viaje, lo que pasos-viaje.spec.ts no cubre:
 *   - Paso 2 · Excursiones (US-38): alta de filas con estado, cambio de estado
 *     y baja, todo persistido;
 *   - Paso 1 · Pasajes: los sub-estados dependen del tipo de viaje (Grupal
 *     cotiza y emite JUK; en el Individual el alumno trae sus datos).
 */

/** Botón de un paso del M7 por número + nombre ("02 Excursiones"). */
function pasoBtn(page: Page, num: string, label: string) {
  return page.getByRole("button", { name: new RegExp(`${num} ${label}`) });
}

async function guardarYRecargar(page: Page, boton: string) {
  await page.getByRole("button", { name: boton }).click();
  // Sin esperar la confirmación, el reload le gana a la server action.
  await expect(page.getByText("Paso guardado")).toBeVisible();
  await page.reload();
}

test("Excursiones: alta con estado, cambio de estado y baja quedan guardados", async ({ page }) => {
  await crearViaje(page);
  await pasoBtn(page, "02", "Excursiones").click();
  await expect(page.getByText("Todavía no hay excursiones cargadas.")).toBeVisible();

  await page.getByRole("button", { name: "Agregar excursión" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Warner Bros. Studio Tour");
  await page.getByLabel("Fecha", { exact: true }).fill("2027-02-10");
  await page.getByLabel("Proveedor", { exact: true }).fill("Golden Tours");
  await page.getByLabel("Costo (£)", { exact: true }).fill("55.5");
  await page.getByLabel("Estado", { exact: true }).selectOption("aprobada_representante");
  await guardarYRecargar(page, "Guardar excursiones");

  // El reload vuelve a Pasajes: reabrir Excursiones.
  await pasoBtn(page, "02", "Excursiones").click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Warner Bros. Studio Tour");
  await expect(page.getByLabel("Fecha", { exact: true })).toHaveValue("2027-02-10");
  await expect(page.getByLabel("Proveedor", { exact: true })).toHaveValue("Golden Tours");
  await expect(page.getByLabel("Costo (£)", { exact: true })).toHaveValue("55.5");
  await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("aprobada_representante");

  // Cambio de sub-estado de la excursión.
  await page.getByLabel("Estado", { exact: true }).selectOption("confirmada");
  await guardarYRecargar(page, "Guardar excursiones");
  await pasoBtn(page, "02", "Excursiones").click();
  await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("confirmada");

  // Baja de la fila.
  await page.getByRole("button", { name: "Quitar", exact: true }).click();
  await expect(page.getByText("Todavía no hay excursiones cargadas.")).toBeVisible();
  await guardarYRecargar(page, "Guardar excursiones");
  await pasoBtn(page, "02", "Excursiones").click();
  await expect(page.getByText("Todavía no hay excursiones cargadas.")).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveCount(0);
});

test("Pasajes: el viaje grupal y el individual ofrecen sub-estados distintos", async ({ page }) => {
  await crearViaje(page);
  // Pasajes es el paso abierto por defecto.
  await expect(page.getByLabel("Sub-estado", { exact: true }).locator("option")).toHaveText([
    "—",
    "Pendiente cotización",
    "Cotizado",
    "Confirmado",
    "Emitido",
  ]);
  await expect(page.getByText(/El alumno gestiona sus propios pasajes/)).toHaveCount(0);

  await crearViajeConTipo(page, { tipo: "individual" });
  const subEstado = page.getByLabel("Sub-estado", { exact: true });
  await expect(subEstado.locator("option")).toHaveText(["—", "Pendiente datos", "Datos recibidos"]);
  await expect(page.getByText(/El alumno gestiona sus propios pasajes/)).toBeVisible();

  await subEstado.selectOption("datos_recibidos");
  await guardarYRecargar(page, "Guardar datos");
  await expect(page.getByLabel("Sub-estado", { exact: true })).toHaveValue("datos_recibidos");
});
