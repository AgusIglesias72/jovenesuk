import { test, expect } from "@playwright/test";

/**
 * Portal de Familias. Corre contra el alumno demo del seed (Lola Demo Quince,
 * DNI DEMO-1, con plan de cuotas y pasos) usando la cuenta de familia que crea
 * `npm run db:seed:demo`. Todo es de SÓLO LECTURA sobre datos sembrados, así
 * que no genera datos que limpiar.
 */

const DNI = "DEMO-1";
const NOMBRE = "Lola Demo Quince";
// Benja (DEMO-2): EXISTE en la DB, tiene asignación y pasos, pero cuelga de la
// otra cuenta de familia (tutor2@demo). Así el 404 prueba la rama de ownership
// y no la de "el alumno no existe".
const DNI_AJENO = "DEMO-2";

// La sesión de familia la arma `familia.setup.ts` (proyecto "familias" en
// playwright.config.ts): un login por corrida, no uno por test.

test("entra al portal y aterriza en el resumen del alumno", async ({ page }) => {
  await page.goto("/familias");
  await expect(page).toHaveURL(new RegExp(`/familias/${DNI}$`));
  await expect(page.getByRole("heading", { name: "Resumen", level: 1 })).toBeVisible();
  // La sidebar muestra al alumno.
  await expect(page.getByText(NOMBRE).first()).toBeVisible();
});

test("el breadcrumb refleja el alumno y la sección", async ({ page }) => {
  await page.goto(`/familias/${DNI}/documentacion`);
  const bc = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(bc).toContainText(NOMBRE);
  await expect(bc).toContainText("Documentación");
});

test("navega entre los módulos desde la sidebar", async ({ page }) => {
  await page.goto(`/familias/${DNI}`);

  for (const [label, heading] of [
    ["Documentación", "Documentación"],
    ["Pagos", "Pagos"],
    ["Viaje", "Viaje"],
    ["Mis datos", "Mis datos"],
  ] as const) {
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  }
});

test("Pagos muestra el plan, filtra cuotas y abre el detalle", async ({ page }) => {
  await page.goto(`/familias/${DNI}/pagos`);
  await expect(page.getByRole("heading", { name: "Pagos", level: 1 })).toBeVisible();

  // Resumen del plan: las 5 cuotas del seed.
  await expect(page.getByText("Cuotas", { exact: true })).toBeVisible();
  await expect(page.getByText("Saldo", { exact: true })).toBeVisible();

  // Filtro por estado.
  await page.getByRole("tab", { name: /Pagadas/ }).click();
  await page.getByRole("tab", { name: /Todas/ }).click();

  // Abrir el detalle de la primera cuota.
  await page.getByRole("button", { name: /Cuota 1/ }).click();
  await expect(page.getByText("Vencimiento", { exact: true })).toBeVisible();
  await expect(page.getByText("Comprobante", { exact: true })).toBeVisible();
});

test("Documentación lista los trámites con su estado", async ({ page }) => {
  await page.goto(`/familias/${DNI}/documentacion`);
  await expect(page.getByRole("heading", { name: "Documentación", level: 1 })).toBeVisible();
  // La barra de progreso del checklist.
  await expect(page.getByRole("progressbar").first()).toBeVisible();
  await expect(page.getByText(/de \d+ listos/).first()).toBeVisible();
});

test("Mis datos muestra la ficha del alumno", async ({ page }) => {
  await page.goto(`/familias/${DNI}/datos`);
  await expect(page.getByRole("heading", { name: "Mis datos", level: 1 })).toBeVisible();
  await expect(page.getByText("Lola", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Reportar un dato incorrecto" })).toBeVisible();
});

test("una familia no puede ver el alumno de otra familia", async ({ page }) => {
  // El alumno ajeno existe (lo sembró el seed y lo ve el admin), así que un 200
  // acá sería una fuga de datos entre familias, no un 404 accidental.
  const resp = await page.goto(`/familias/${DNI_AJENO}`);
  expect(resp?.status()).toBe(404);

  // Las subrutas resuelven por el mismo helper: no deben filtrarse tampoco.
  for (const sub of ["documentacion", "pagos", "viaje", "datos"]) {
    const r = await page.goto(`/familias/${DNI_AJENO}/${sub}`);
    expect(r?.status(), `/familias/${DNI_AJENO}/${sub}`).toBe(404);
  }
});
