import { test, expect } from "@playwright/test";

import {
  abrirFichaDesdeViaje,
  adjuntoPasoAlumno,
  asignarAlumnoAlViaje,
  crearAlumno,
  crearViaje,
  pasoAlumno,
  pdfMinimo,
} from "./helpers";

test("sube un documento al paso A1 y queda linkeado", async ({ page }) => {
  const alumno = await crearAlumno(page);
  await crearViaje(page);
  await asignarAlumnoAlViaje(page, alumno);
  await abrirFichaDesdeViaje(page, alumno);

  const a1 = pasoAlumno(page, "a1");
  await expect(a1.getByText("Sin documento")).toBeVisible();

  await adjuntoPasoAlumno(page, "a1").setInputFiles(pdfMinimo("application-form-firmado.pdf"));

  const link = a1.getByRole("link", { name: /Ver documento/ });
  await expect(link).toBeVisible();

  // El documento se sirve (proxy autenticado o URL pública de R2)
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
});
