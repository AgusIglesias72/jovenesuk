import { test, expect } from "@playwright/test";

import {
  abrirFichaDesdeViaje,
  abrirViaje,
  asignarAlumnoAlViaje,
  confirmarModal,
  crearAlumno,
  crearPlanCuotas,
  crearViaje,
} from "./helpers";

test("módulo Pagos: lista las cuotas, filtra por viaje y registra un pago", async ({ page }) => {
  // Alumno + viaje + plan de 2 cuotas (desde la ficha)
  const alumno = await crearAlumno(page);
  const codigo = await crearViaje(page);
  await asignarAlumnoAlViaje(page, alumno);
  await abrirFichaDesdeViaje(page, alumno);

  const panel = await crearPlanCuotas(page, {
    cuotas: "2",
    monto: "700",
    primerVencimiento: "2026-12-01",
  });
  await expect(panel.getByText("US$ 1.400,00")).toBeVisible();

  // El detalle del viaje muestra la sección Pagos (US-24) con el plan al día
  await abrirViaje(page, codigo);
  const pagosDelAlumno = page
    .locator("[data-pagos-viaje]")
    .getByRole("row")
    .filter({ hasText: alumno.label });
  await expect(pagosDelAlumno).toContainText("0 / 2");
  await expect(pagosDelAlumno).toContainText("Al día");

  // Módulo global: filtrar por el viaje → 2 cuotas pendientes
  await page.goto("/pagos");
  await expect(page.getByRole("heading", { name: "Pagos", level: 1 })).toBeVisible();
  await page
    .getByLabel("Filtrar por viaje", { exact: true })
    .selectOption({ label: `${codigo} · Viaje ${codigo}` });
  // Esperar a que la navegación del filtro commitee antes de operar la tabla.
  await expect(page).toHaveURL(/viaje=/);
  const cuotasDelAlumno = page.getByRole("row").filter({ hasText: alumno.label });
  await expect(cuotasDelAlumno).toHaveCount(2);

  // Registrar el pago de la cuota 1 desde el módulo (la 2° es la "(última)")
  const primera = cuotasDelAlumno.filter({ hasNotText: "(última)" });
  await primera.getByRole("button", { name: "Registrar pago" }).click();
  await confirmarModal(page, "Registrar pago");
  await expect(primera.getByText("Pagada")).toBeVisible();

  // El filtro por estado deja solo la pendiente
  await page.getByLabel("Filtrar por estado", { exact: true }).selectOption("pendiente");
  await expect(page).toHaveURL(/estado=pendiente/);
  await expect(cuotasDelAlumno).toHaveCount(1);
  await expect(cuotasDelAlumno).toContainText("(última)");
});
