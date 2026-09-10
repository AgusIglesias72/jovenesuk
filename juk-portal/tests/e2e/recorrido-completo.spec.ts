import { test, expect } from "@playwright/test";

import {
  abrirViaje,
  adjuntoPasoAlumno,
  botonPasoViaje,
  codigoViajeUnico,
  confirmarModal,
  crearColegio,
  crearPlanCuotas,
  crearViaje,
  expectEstadoPasoAlumno,
  pasoAlumno,
  pdfMinimo,
  selectorEstadoPasoAlumno,
  webhookSecret,
} from "./helpers";

/**
 * RECORRIDO COMPLETO del negocio, de punta a punta:
 * colegio (config documental) → viaje → alumno por webhook (auto-asignado) →
 * tablero M6 con N/A correctos → cuotas B1/B2 → desbloqueo de C2 → documento
 * → completar paso → cobertura M7 → dashboard.
 *
 * Es el canary más valioso de la suite y también el más lento: va tagueado
 * @slow y cada fase es un test.step, así el reporter y el trace dicen en qué
 * fase se rompió.
 *
 * Correrlo solo (desde juk-portal/):
 *   npx playwright test recorrido-completo --project=chromium
 *   npx playwright test --grep @slow --project=chromium
 * Correr el resto de la suite sin él (iteración rápida):
 *   npx playwright test --grep-invert @slow
 */

test("recorrido completo: del colegio al dashboard", { tag: "@slow" }, async ({ page, request }) => {
  test.setTimeout(180_000);

  // Datos compartidos entre fases.
  const codigo = codigoViajeUnico();
  const dni = `E2E-F-${Date.now().toString().slice(-9)}`;
  const apellido = `Completo ${dni.slice(-5)}`;
  const nombre = "Recorrido";
  let colegio = "";

  await test.step("1 · Colegio destino con Test de Nivel requerido", async () => {
    const creado = await crearColegio(page);
    colegio = creado.nombre;

    await page.goto("/colegios");
    // Lista paginada: filtrar por nombre. Esperar a que el buscador (debounce
    // 300ms) navegue antes de clickear "Editar", si no el click se pierde.
    await page.getByPlaceholder("Buscar por nombre o ciudad…").fill(colegio);
    await page.waitForURL(/\/colegios\?q=/);
    await page
      .getByRole("row", { name: new RegExp(colegio) })
      .getByRole("link", { name: "Editar" })
      .click();
    await page.waitForURL(/\/colegios\/[0-9a-f-]+\/editar/);
    await page.getByLabel("Test de Nivel").selectOption("requerido");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page).toHaveURL(/\/colegios$/);
  });

  await test.step("2 · Viaje grupal (independiente, UK) sobre ese colegio", async () => {
    await crearViaje(page, { codigo, colegio });
  });

  await test.step("3 · Alumno por webhook con auto-asignación al viaje", async () => {
    const res = await request.post("/api/webhooks/google-form", {
      headers: { "x-webhook-secret": webhookSecret() },
      data: {
        nombre,
        apellido,
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
    const { asignacion } = await res.json();
    expect(asignacion).not.toBeNull();
  });

  await test.step("4 · Tablero M6: A2 por config del colegio, C1 por UK, C2 bloqueado por B1", async () => {
    // La URL de detalle usa el DNI (slug), no el uuid.
    await page.goto(`/alumnos/${dni}`);
    await expectEstadoPasoAlumno(page, "a2", "Pendiente");
    await expectEstadoPasoAlumno(page, "c1", "Pendiente");
    await expectEstadoPasoAlumno(page, "b2", "Pendiente");
    await expectEstadoPasoAlumno(page, "c2", "Bloqueado");
    await expect(page.getByText(/Acceso .*no enviado/)).toBeVisible();
  });

  await test.step("5 · Cuotas: plan de 2, pagar la 1°, confirmar B2 → C2 se desbloquea", async () => {
    const cuotas = await crearPlanCuotas(page, {
      cuotas: "2",
      monto: "800",
      primerVencimiento: "2026-12-15",
    });
    await expect(cuotas.getByText("US$ 1.600,00")).toBeVisible();

    // Con B2 la última cuota se cobra presencial: la única con "Registrar pago" es la 1°.
    await cuotas.getByRole("button", { name: "Registrar pago", exact: true }).click();
    await confirmarModal(page, "Registrar pago");
    await expect(pasoAlumno(page, "b1").getByText("1 de 2 cuotas acreditadas")).toBeVisible();

    await cuotas.getByRole("button", { name: "Confirmar pago presencial" }).click();
    await confirmarModal(page, "Sí, confirmar pago");
    await expectEstadoPasoAlumno(page, "b1", "Completado");
    await expectEstadoPasoAlumno(page, "b2", "Completado");
    await expectEstadoPasoAlumno(page, "c2", "Pendiente");
    await expect(cuotas.getByText("Plan saldado")).toBeVisible();
  });

  await test.step("6 · Documento en C2 y completar el paso", async () => {
    await adjuntoPasoAlumno(page, "c2").setInputFiles(pdfMinimo("immigration-letter.pdf"));
    await expect(pasoAlumno(page, "c2").getByRole("link", { name: /Ver documento/ })).toBeVisible();
    await selectorEstadoPasoAlumno(page, "c2").selectOption("completado");
    await expectEstadoPasoAlumno(page, "c2", "Completado");
  });

  await test.step("7 · M7: tarjeta de transporte cubierta para el único alumno", async () => {
    await abrirViaje(page, codigo);
    const tarjetas = botonPasoViaje(page, "Tarjetas de transporte");
    await tarjetas.click();

    const roster = page.locator('[data-roster-cobertura="tarjeta_transporte"]');
    // click y no check(): el checkbox lo controla el estado del server y recién
    // cambia con el refresh, así que check() fallaría por "did not change its state".
    await roster
      .getByRole("checkbox", { name: `Tarjeta entregada · ${apellido}, ${nombre}`, exact: true })
      .click();
    await expect(roster.getByText("1/1")).toBeVisible();
    await expect(tarjetas).toContainText("Completado");
  });

  await test.step("8 · Dashboard: renderiza con stats y panel de alertas", async () => {
    // (no assertamos el viaje puntual: la sección muestra solo los 6 próximos y
    // los datos acumulados de E2E compiten por esos lugares)
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByText("Alumnos en mora")).toBeVisible();
    await expect(page.getByRole("region", { name: /^Alertas/ })).toBeVisible();
  });
});
