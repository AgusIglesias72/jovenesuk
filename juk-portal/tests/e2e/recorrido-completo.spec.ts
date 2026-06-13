import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

import { codigoViajeUnico, confirmarModal, crearColegio, crearViaje } from "./helpers";

/**
 * RECORRIDO COMPLETO del negocio, de punta a punta:
 * colegio (config documental) → viaje → alumno por webhook (auto-asignado) →
 * tablero M6 con N/A correctos → cuotas B1/B2 → desbloqueo de C2 → documento
 * → completar paso → cobertura M7 → dashboard.
 */

function webhookSecret(): string {
  if (process.env.GOOGLE_FORM_WEBHOOK_SECRET) return process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  const env = readFileSync(".env.local", "utf8");
  const m = env.match(/^GOOGLE_FORM_WEBHOOK_SECRET=(.+)$/m);
  if (!m) throw new Error("GOOGLE_FORM_WEBHOOK_SECRET no configurado");
  return m[1]!.trim().replace(/^"|"$/g, "");
}

test("recorrido completo: del colegio al dashboard", async ({ page, request }) => {
  test.setTimeout(180_000);

  // ── 1 · Colegio destino con Test de Nivel REQUERIDO (config documental) ──
  const colegio = await crearColegio(page);
  await page.goto("/colegios");
  await page.getByRole("row", { name: new RegExp(colegio.nombre) }).getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Test de Nivel").selectOption("requerido");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/colegios$/);

  // ── 2 · Viaje grupal (independiente, UK) sobre ese colegio ──
  const codigo = codigoViajeUnico();
  await crearViaje(page, { codigo, colegio: colegio.nombre });

  // ── 3 · Alumno por WEBHOOK con auto-asignación al viaje ──
  const dni = `E2E-F-${Date.now().toString().slice(-9)}`;
  const res = await request.post("/api/webhooks/google-form", {
    headers: { "x-webhook-secret": webhookSecret() },
    data: {
      nombre: "Recorrido",
      apellido: `Completo ${dni.slice(-5)}`,
      fechaNacimiento: "2009-03-03",
      dni,
      numeroPasaporte: `RC${dni.slice(-6)}`,
      fechaVencimientoPasaporte: "2033-06-06",
      tutor1Nombre: "Tutora Recorrido",
      tutor1Celular: "+54 9 11 4444-4444",
      tutor1Email: `tutora.${dni.toLowerCase()}@e2e.jovenesenuk.com`,
      codigoViaje: codigo,
    },
  });
  expect(res.status()).toBe(200);
  const { alumnoId, asignacion } = await res.json();
  expect(asignacion).not.toBeNull();

  // ── 4 · Tablero M6: la config del colegio activó A2; C1 activo (UK→ETA);
  //        B2 activo (independiente); C2 bloqueado por B1 ──
  await page.goto(`/alumnos/${alumnoId}`);
  await expect(page.locator('[data-paso="a2"]').getByText("Pendiente").first()).toBeVisible();
  await expect(page.locator('[data-paso="c1"]').getByText("Pendiente").first()).toBeVisible();
  await expect(page.locator('[data-paso="b2"]').getByText("Pendiente").first()).toBeVisible();
  await expect(page.locator('[data-paso="c2"]').getByText("Bloqueado").first()).toBeVisible();
  await expect(page.getByText(/Acceso .*no enviado/)).toBeVisible();

  // ── 5 · Cuotas: plan de 2, pagar la 1°, confirmar B2 → C2 se desbloquea ──
  const cuotas = page.locator("[data-cuotas-panel]");
  await cuotas.getByLabel("Cuotas").fill("2");
  await cuotas.getByLabel("Monto por cuota").fill("800");
  await cuotas.getByLabel("Primer vencimiento").fill("2026-12-15");
  await cuotas.getByRole("button", { name: "Crear plan de cuotas" }).click();
  await expect(cuotas.getByText("US$ 1.600,00")).toBeVisible();

  await cuotas.getByRole("button", { name: "Registrar pago" }).first().click();
  await expect(
    page.locator('[data-paso="b1"]').getByText("1 de 2 cuotas acreditadas")
  ).toBeVisible();

  await cuotas.getByRole("button", { name: "Confirmar pago presencial" }).click();
  await confirmarModal(page, "Sí, confirmar pago");
  await expect(page.locator('[data-paso="b1"]').getByText("Completado").first()).toBeVisible();
  await expect(page.locator('[data-paso="b2"]').getByText("Completado").first()).toBeVisible();
  await expect(page.locator('[data-paso="c2"]').getByText("Pendiente").first()).toBeVisible();
  await expect(cuotas.getByText("Plan saldado")).toBeVisible();

  // ── 6 · Documento en C2 y completar el paso ──
  const c2 = page.locator('[data-paso="c2"]');
  await c2.locator('input[type="file"]').setInputFiles({
    name: "immigration-letter.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\ntrailer <<>>\n%%EOF"),
  });
  await expect(c2.getByRole("link", { name: /Ver documento/ })).toBeVisible({ timeout: 15000 });
  await c2.locator("select").selectOption("completado");
  await expect(c2.getByText("Completado").first()).toBeVisible();

  // ── 7 · M7: tarjeta de transporte cubierta para el único alumno ──
  await page.goto("/viajes");
  await page.getByRole("row", { name: new RegExp(codigo) }).getByRole("link", { name: "Ver" }).click();
  await page.getByRole("button", { name: /Tarjeta/ }).click();
  const roster = page.locator('[data-roster-cobertura="tarjeta_transporte"]');
  await roster.locator('input[type="checkbox"]').click({ force: true });
  await expect(roster.getByText("1/1")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Tarjeta/ }).locator("span").filter({ hasText: "Completado" }).first()
  ).toBeVisible();

  // ── 8 · Dashboard: renderiza con stats y panel de alertas reales ──
  // (no assertamos el viaje puntual: la sección muestra solo los 6 próximos y
  // los datos acumulados de E2E compiten por esos lugares)
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await expect(page.getByText("Alumnos en mora")).toBeVisible();
  await expect(page.getByText(/Alertas/).first()).toBeVisible();
});
