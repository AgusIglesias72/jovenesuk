import { test, expect, type Page } from "@playwright/test";

import {
  abrirFichaDesdeViaje,
  asignarAlumnoAlViaje,
  confirmarModal,
  crearAlumno,
  crearPlanCuotas,
  crearViaje,
  ddmmyyyy,
  fechaEnDias,
  pasoAlumno,
} from "./helpers";

/**
 * US-22: registrar un pago captura la fecha efectiva (puede ser retroactiva,
 * nunca futura) y observaciones. Los tres puntos de registro (módulo Pagos,
 * fila de la cuota en la ficha y B2 presencial) usan el mismo diálogo.
 */

async function alumnoConPlan(page: Page, monto: string) {
  const alumno = await crearAlumno(page);
  const codigo = await crearViaje(page);
  await asignarAlumnoAlViaje(page, alumno);
  await abrirFichaDesdeViaje(page, alumno);

  const panel = await crearPlanCuotas(page, { cuotas: "2", monto, primerVencimiento: "2026-12-10" });
  return { alumno, codigo, panel };
}

test("registrar pago en la ficha con fecha retroactiva y observaciones, y B2 con el mismo diálogo", async ({
  page,
}) => {
  const { panel } = await alumnoConPlan(page, "450");

  // La 2° cuota es la última presencial (B2): la única fila con "Registrar pago" es la 1°.
  const fechaCuota = fechaEnDias(-20);
  await panel.getByRole("button", { name: "Registrar pago", exact: true }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Registrar pago" })).toBeVisible();
  // La fecha arranca en hoy: el caso más común es un pago del día.
  await expect(dialogo.getByLabel("Fecha de pago")).toHaveValue(fechaEnDias(0));
  await dialogo.getByLabel("Fecha de pago").fill(fechaCuota);
  await dialogo.getByLabel("Observaciones").fill("Transferencia #4521");
  await confirmarModal(page, "Registrar pago");

  await expect(dialogo).toHaveCount(0);
  await expect(pasoAlumno(page, "b1").getByText("1 de 2 cuotas acreditadas")).toBeVisible();
  await expect(panel.getByText(`el ${ddmmyyyy(fechaCuota)}`)).toBeVisible();
  await expect(panel.getByText("Transferencia #4521")).toBeVisible();

  // B2 (última cuota presencial): mismo diálogo, con su propio botón.
  const fechaB2 = fechaEnDias(-3);
  await panel.getByRole("button", { name: "Confirmar pago presencial" }).click();
  await expect(dialogo.getByLabel("Fecha de pago")).toBeVisible();
  await dialogo.getByLabel("Fecha de pago").fill(fechaB2);
  await dialogo.getByLabel("Observaciones").fill("Efectivo en oficina");
  await confirmarModal(page, "Sí, confirmar pago");

  await expect(panel.getByText("Plan saldado")).toBeVisible();
  await expect(panel.getByText(`el ${ddmmyyyy(fechaB2)}`)).toBeVisible();
  await expect(panel.getByText("Efectivo en oficina")).toBeVisible();

  // Persistió en la base, no solo en la UI.
  await page.reload();
  await expect(panel.getByText("Transferencia #4521")).toBeVisible();
  await expect(panel.getByText(`el ${ddmmyyyy(fechaCuota)}`)).toBeVisible();
});

test("no deja registrar un pago con fecha futura, y cancelar no registra nada", async ({ page }) => {
  const { panel } = await alumnoConPlan(page, "300");

  await panel.getByRole("button", { name: "Registrar pago", exact: true }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Fecha de pago").fill(fechaEnDias(2));
  await confirmarModal(page, "Registrar pago");

  await expect(dialogo.getByText("La fecha del pago no puede ser futura")).toBeVisible();
  await expect(dialogo).toBeVisible();

  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(panel.getByText("Pagada")).toHaveCount(0);
  await expect(panel.getByText("0 cuotas acreditadas")).toBeVisible();
});

test("el módulo Pagos registra con el mismo diálogo y muestra la fecha efectiva", async ({ page }) => {
  const { alumno, codigo } = await alumnoConPlan(page, "380");

  await page.goto("/pagos");
  await page
    .getByLabel("Filtrar por viaje", { exact: true })
    .selectOption({ label: `${codigo} · Viaje ${codigo}` });
  await expect(page).toHaveURL(/viaje=/);

  // En el módulo las dos cuotas tienen "Registrar pago": la 1° es la que no dice "(última)".
  const fila = page
    .getByRole("row")
    .filter({ hasText: alumno.label })
    .filter({ hasNotText: "(última)" });
  await fila.getByRole("button", { name: "Registrar pago" }).click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText(codigo)).toBeVisible();
  const fecha = fechaEnDias(-7);
  await dialogo.getByLabel("Fecha de pago").fill(fecha);
  await confirmarModal(page, "Registrar pago");

  await expect(fila.getByText("Pagada")).toBeVisible();
  await expect(fila.getByText(`el ${ddmmyyyy(fecha)}`)).toBeVisible();
});
