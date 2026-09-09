import { eq } from "drizzle-orm";
import { test, expect } from "@playwright/test";

import { db } from "../../src/lib/db";
import { configuracion } from "../../src/lib/db/schema";

/*
 * Configuración de mails: es estado GLOBAL del entorno, así que el spec guarda
 * la fila `configuracion.mails` tal como estaba y la restaura al final (incluso
 * si el test falla). Restaurar "los defaults" a mano dejaba pisada cualquier
 * config real del entorno.
 */

const CLAVE = "mails";

let valorOriginal: Record<string, unknown> | null = null;
let existiaFila = false;

test.beforeAll(async () => {
  const filas = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.clave, CLAVE))
    .limit(1);
  existiaFila = filas.length > 0;
  valorOriginal = filas[0]?.valor ?? null;
});

test.afterAll(async () => {
  if (existiaFila && valorOriginal) {
    await db
      .update(configuracion)
      .set({ valor: valorOriginal, updatedAt: new Date() })
      .where(eq(configuracion.clave, CLAVE));
  } else {
    await db.delete(configuracion).where(eq(configuracion.clave, CLAVE));
  }
});

test("configuración de mails: guarda remitentes y la UI de prueba está disponible", async ({
  page,
}) => {
  await page.goto("/configuracion");
  await expect(page.getByRole("heading", { name: "Configuración", level: 1 })).toBeVisible();

  const mails = page.locator("[data-config-mails]");
  const remitenteOriginal = await mails.getByLabel("Remitente de automáticos").inputValue();

  // Guardar un valor único y verificar persistencia tras recargar
  const nombre = `JUK E2E ${Date.now().toString().slice(-6)}`;
  await mails.getByLabel("Nombre del remitente").fill(nombre);
  await mails.getByRole("button", { name: "Guardar" }).click();
  // El feedback es un toast del design system (fuera del panel).
  await expect(page.getByText("Configuración guardada.")).toBeVisible();

  await page.reload();
  await expect(page.locator("[data-config-mails]").getByLabel("Nombre del remitente")).toHaveValue(
    nombre
  );

  // La validación rechaza emails inválidos
  await page
    .locator("[data-config-mails]")
    .getByLabel("Remitente de automáticos")
    .fill("no-es-un-email");
  await page.locator("[data-config-mails]").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Email inválido.").first()).toBeVisible();

  // Dejar el remitente válido de nuevo (el afterAll restaura la fila entera)
  await page
    .locator("[data-config-mails]")
    .getByLabel("Remitente de automáticos")
    .fill(remitenteOriginal);
  await page.locator("[data-config-mails]").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Configuración guardada.").first()).toBeVisible();

  // El panel de prueba ofrece templates y destinatario precargado
  const prueba = page.locator("[data-config-prueba]");
  await expect(prueba.getByRole("button", { name: "Enviar prueba" })).toBeVisible();
  await expect(prueba.getByLabel("Enviar a")).toHaveValue(/@/);
  await expect(
    prueba.locator('option:text-is("Acceso al portal (credenciales) · comunicación")')
  ).toHaveCount(1);
});
