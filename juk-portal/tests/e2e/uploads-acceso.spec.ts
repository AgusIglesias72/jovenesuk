import { test, expect, type Page } from "@playwright/test";

import { crearAlumno, crearViaje, panelAlumnosAsignados } from "./helpers";

function selectorElegibles(page: Page) {
  return page.locator("select", {
    has: page.locator('option:text-is("Elegí un alumno…")'),
  });
}

/** PDF válido (magic bytes %PDF) de ~2 MB, armado en memoria. */
function pdfDeDosMegas(): Buffer {
  return Buffer.concat([
    Buffer.from("%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\n"),
    Buffer.alloc(2 * 1024 * 1024, 0x20),
    Buffer.from("\ntrailer <<>>\n%%EOF"),
  ]);
}

test("/api/uploads sirve el documento al admin y nunca a un anónimo", async ({
  page,
  browser,
}) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await selectorElegibles(page).selectOption({ label: alumno.label });
  await panelAlumnosAsignados(page)
    .getByRole("button", { name: "Asignar" })
    .click();
  await page.getByRole("link", { name: `${alumno.apellido}, ${alumno.nombre}` }).first().click();
  await page.waitForURL("**/alumnos/**");

  const a1 = page.locator('[data-paso="a1"]');
  await a1.locator('input[type="file"]').setInputFiles({
    name: "application form firmado.pdf",
    mimeType: "application/pdf",
    buffer: pdfDeDosMegas(),
  });

  const link = a1.getByRole("link", { name: /Ver documento/ });
  await expect(link).toBeVisible({ timeout: 30000 });

  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  expect(href).toMatch(/^\/api\/uploads\//);

  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/pdf");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(res.headers()["content-disposition"]).toContain("filename=");
  expect((await res.body()).length).toBeGreaterThan(2 * 1024 * 1024);

  // Sin sesión: cualquier cosa menos servir el archivo.
  const absoluta = new URL(href!, new URL(page.url()).origin).toString();
  const anonimo = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const sinSesion = await anonimo.request.get(absoluta, { maxRedirects: 0 });
    expect(sinSesion.status()).not.toBe(200);
    expect([302, 303, 307, 401, 403, 404]).toContain(sinSesion.status());
  } finally {
    await anonimo.close();
  }
});
