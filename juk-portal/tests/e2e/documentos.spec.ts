import { test, expect, type Page } from "@playwright/test";

import { crearAlumno, crearViaje } from "./helpers";

function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.locator('option:text-is("Elegí un alumno…")'),
  });
}

test("sube un documento al paso A1 y queda linkeado", async ({ page }) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await selectorElegibles(page).selectOption({ label: alumno.label });
  await page
    .locator("section")
    .filter({ hasText: "Alumnos asignados" })
    .getByRole("button", { name: "Asignar" })
    .click();
  await page.getByRole("link", { name: `${alumno.apellido}, ${alumno.nombre}` }).first().click();
  await page.waitForURL("**/alumnos/**");

  const a1 = page.locator('[data-paso="a1"]');
  await expect(a1.getByText("Sin documento")).toBeVisible();

  // PDF mínimo válido en memoria
  await a1.locator('input[type="file"]').setInputFiles({
    name: "application-form-firmado.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\ntrailer <<>>\n%%EOF"),
  });

  const link = a1.getByRole("link", { name: /Ver documento/ });
  await expect(link).toBeVisible({ timeout: 15000 });

  // El documento se sirve (proxy autenticado o URL pública de R2)
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
});
