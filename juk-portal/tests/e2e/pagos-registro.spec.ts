import { test, expect, type Page } from "@playwright/test";

import { confirmarModal, crearAlumno, crearViaje, panelAlumnosAsignados } from "./helpers";

/**
 * US-22: registrar un pago captura la fecha efectiva (puede ser retroactiva,
 * nunca futura) y observaciones. Los tres puntos de registro (módulo Pagos,
 * fila de la cuota en la ficha y B2 presencial) usan el mismo diálogo.
 */

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ddmmyyyy(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function diasDesdeHoy(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
}

async function alumnoConPlan(page: Page, monto: string) {
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

  const panel = page.locator("[data-cuotas-panel]");
  await panel.getByLabel("Cuotas").fill("2");
  await panel.getByLabel("Monto por cuota").fill(monto);
  await panel.getByLabel("Primer vencimiento").fill("2026-12-10");
  await panel.getByRole("button", { name: "Crear plan de cuotas" }).click();
  await expect(panel.getByRole("button", { name: "Registrar pago" }).first()).toBeVisible();
  return { alumno, codigo, panel };
}

test("registrar pago en la ficha con fecha retroactiva y observaciones, y B2 con el mismo diálogo", async ({
  page,
}) => {
  const { panel } = await alumnoConPlan(page, "450");

  const fechaCuota = diasDesdeHoy(-20);
  await panel.getByRole("button", { name: "Registrar pago" }).first().click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Registrar pago" })).toBeVisible();
  // La fecha arranca en hoy: el caso más común es un pago del día.
  await expect(dialogo.getByLabel("Fecha de pago")).toHaveValue(diasDesdeHoy(0));
  await dialogo.getByLabel("Fecha de pago").fill(fechaCuota);
  await dialogo.getByLabel("Observaciones").fill("Transferencia #4521");
  await confirmarModal(page, "Registrar pago");

  await expect(dialogo).toHaveCount(0);
  await expect(page.locator('[data-paso="b1"]').getByText("1 de 2 cuotas acreditadas")).toBeVisible();
  await expect(panel.getByText(`el ${ddmmyyyy(fechaCuota)}`)).toBeVisible();
  await expect(panel.getByText("Transferencia #4521")).toBeVisible();

  // B2 (última cuota presencial): mismo diálogo, con su propio botón.
  const fechaB2 = diasDesdeHoy(-3);
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

  await panel.getByRole("button", { name: "Registrar pago" }).first().click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Fecha de pago").fill(diasDesdeHoy(2));
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
    .locator("select", { has: page.locator('option:text-is("Todos los viajes")') })
    .selectOption({ label: `${codigo} · Viaje ${codigo}` });
  await expect(page).toHaveURL(/viaje=/);

  const fila = page.getByRole("row").filter({ hasText: alumno.apellido }).first();
  await fila.getByRole("button", { name: "Registrar pago" }).click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText(codigo)).toBeVisible();
  const fecha = diasDesdeHoy(-7);
  await dialogo.getByLabel("Fecha de pago").fill(fecha);
  await confirmarModal(page, "Registrar pago");

  await expect(fila.getByText("Pagada")).toBeVisible();
  await expect(fila.getByText(`el ${ddmmyyyy(fecha)}`)).toBeVisible();
});
