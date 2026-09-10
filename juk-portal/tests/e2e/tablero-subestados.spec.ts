import { test, expect } from "@playwright/test";

import { confirmarModal, crearColegio, crearViaje, esperarHidratacion } from "./helpers";
import { crearAlumnoPorWebhook, pasoDeAlumno, type AlumnoWebhook } from "./helpers-flujos";

/*
 * Tablero M6 del alumno: los pasos que más se tocan a diario.
 *   - C1 (ETA, US-31) y A3 (Parental Consent, US-29): el estado del paso se
 *     DERIVA del sub-estado del trámite (no hay selector de estado a mano);
 *   - A1: la fecha límite nace del viaje (inicio − 30 días) y se ajusta;
 *   - bloquear un paso exige contar el motivo.
 *
 * Escenario propio: colegio "Colegio E2E …" con Parental Consent REQUERIDO
 * (el default es N/A), viaje UK-2099 sobre ese colegio y un alumno de 14 años
 * al inicio (A3 aplica, versión menor de 16) asignado por webhook. Serial: los
 * tests comparten el alumno y cada uno toca pasos distintos.
 */

test.describe.configure({ mode: "serial" });

let alumno!: AlumnoWebhook;

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(180_000);
  const admin = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    storageState: "tests/e2e/.auth/admin.json",
  });
  try {
    const page = await admin.newPage();
    const colegio = await crearColegio(page);

    await page.goto("/colegios");
    // Lista paginada con buscador (debounce): esperar la navegación antes de "Editar".
    await page.getByPlaceholder("Buscar por nombre o ciudad…").fill(colegio.nombre);
    await page.waitForURL(/\/colegios\?q=/);
    await page
      .getByRole("row", { name: new RegExp(colegio.nombre) })
      .getByRole("link", { name: "Editar" })
      .click();
    await page.waitForURL(/\/colegios\/[0-9a-f-]+\/editar/);
    await page.getByLabel("Parental Consent").selectOption("requerido");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page).toHaveURL(/\/colegios$/);

    const codigo = await crearViaje(page, { colegio: colegio.nombre });
    alumno = await crearAlumnoPorWebhook(admin.request, {
      etiqueta: "TS",
      fechaNacimiento: "2012-03-03",
      codigoViaje: codigo,
    });
    expect(alumno.asignacionId, "el alumno debía quedar asignado").not.toBeNull();
  } finally {
    await admin.close();
  }
});

test("C1 · ETA: el sub-estado del trámite define el estado del paso y guarda el N° de autorización", async ({
  page,
}) => {
  await page.goto(`/alumnos/${alumno.dni}`);
  const c1 = page.locator('[data-paso="c1"]');
  const tramite = c1.getByLabel("Estado del trámite · ETA", { exact: true });
  await expect(tramite).toHaveValue("pendiente");
  await esperarHidratacion(tramite);
  // El estado no se elige a mano: no hay selector de estado para C1.
  await expect(c1.getByLabel("Estado de ETA", { exact: true })).toHaveCount(0);

  const casos = [
    { subEstado: "en_tramite", estado: "en_progreso", badge: "En progreso" },
    { subEstado: "rechazado", estado: "bloqueado", badge: "Bloqueado" },
    { subEstado: "aprobado", estado: "completado", badge: "Completado" },
  ] as const;
  for (const caso of casos) {
    await tramite.selectOption(caso.subEstado);
    await expect(c1.getByText(caso.badge, { exact: true })).toBeVisible();
    const paso = await pasoDeAlumno(alumno.alumnoId, "c1");
    expect(paso.estado).toBe(caso.estado);
    expect(paso.metadata).toMatchObject({ subEstado: caso.subEstado });
  }

  // Aprobado habilita el N° de autorización, que se guarda al salir del campo.
  const numero = c1.getByLabel("N° de autorización del ETA");
  await numero.fill("ETA-E2E-4471");
  await numero.blur();
  await expect
    .poll(async () => (await pasoDeAlumno(alumno.alumnoId, "c1")).metadata.numeroAutorizacion)
    .toBe("ETA-E2E-4471");

  await page.reload();
  const recargada = page.locator('[data-paso="c1"]');
  await expect(recargada.getByLabel("Estado del trámite · ETA", { exact: true })).toHaveValue(
    "aprobado"
  );
  await expect(recargada.getByLabel("N° de autorización del ETA")).toHaveValue("ETA-E2E-4471");
  await expect(recargada.getByText("Completado", { exact: true })).toBeVisible();
});

test("A3 · Parental Consent: enviado y firmado lo dejan en progreso, recibido lo completa", async ({
  page,
}) => {
  await page.goto(`/alumnos/${alumno.dni}`);
  const a3 = page.locator('[data-paso="a3"]');
  // 14 años al inicio del viaje → versión del consentimiento para menores de 16.
  await expect(a3.getByText("Versión: menor de 16")).toBeVisible();
  const tramite = a3.getByLabel("Estado del trámite · Parental Consent", { exact: true });
  await expect(tramite).toHaveValue("pendiente");
  await esperarHidratacion(tramite);

  await tramite.selectOption("enviado");
  await expect(a3.getByText("En progreso", { exact: true })).toBeVisible();

  // Firmado no cambia el estado visible: se espera al dato persistido.
  await tramite.selectOption("firmado");
  await expect
    .poll(async () => (await pasoDeAlumno(alumno.alumnoId, "a3")).metadata.subEstado)
    .toBe("firmado");
  expect((await pasoDeAlumno(alumno.alumnoId, "a3")).estado).toBe("en_progreso");
  await expect(a3.getByText("En progreso", { exact: true })).toBeVisible();

  await tramite.selectOption("recibido");
  await expect(a3.getByText("Completado", { exact: true })).toBeVisible();
  const paso = await pasoDeAlumno(alumno.alumnoId, "a3");
  expect(paso.estado).toBe("completado");
  expect(paso.fechaCompletado).not.toBeNull();
});

test("A1: la fecha límite nace 30 días antes del viaje y se ajusta por alumno", async ({ page }) => {
  await page.goto(`/alumnos/${alumno.dni}`);
  const fecha = page.locator('[data-paso="a1"]').getByLabel("Fecha límite", { exact: true });
  // crearViaje arranca el 02/02/2027 → A1 vence el 03/01/2027.
  await expect(fecha).toHaveValue("2027-01-03");
  // Sin esto el fill cae antes de la hidratación y no se guarda (ver el helper).
  await esperarHidratacion(fecha);

  await fecha.fill("2026-12-20");
  await expect
    .poll(async () =>
      (await pasoDeAlumno(alumno.alumnoId, "a1")).fechaLimite?.toISOString().slice(0, 10)
    )
    .toBe("2026-12-20");

  await page.reload();
  await expect(
    page.locator('[data-paso="a1"]').getByLabel("Fecha límite", { exact: true })
  ).toHaveValue("2026-12-20");
});

test("bloquear un paso exige contar el motivo, y el motivo queda en la card", async ({ page }) => {
  const motivo = `E2E: falta la firma del segundo tutor (${Date.now()})`;

  await page.goto(`/alumnos/${alumno.dni}`);
  const a1 = page.locator('[data-paso="a1"]');
  const estado = a1.getByLabel("Estado de Application Form del colegio", { exact: true });
  await expect(estado).toHaveValue("pendiente");
  await esperarHidratacion(estado);

  // Sin motivo: avisa y no bloquea.
  await estado.selectOption("bloqueado");
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText("¿Bloquear Application Form del colegio?");
  await confirmarModal(page, "Bloquear paso");
  await expect(page.getByText("Para bloquear el paso contá el motivo.")).toBeVisible();
  await expect(dialogo).toHaveCount(0);
  await expect(estado).toHaveValue("pendiente");
  expect((await pasoDeAlumno(alumno.alumnoId, "a1")).estado).toBe("pendiente");

  // Con motivo: bloquea y lo muestra en la card.
  await estado.selectOption("bloqueado");
  await dialogo.getByLabel("Motivo del bloqueo").fill(motivo);
  await confirmarModal(page, "Bloquear paso");
  await expect(a1.getByText(motivo)).toBeVisible();
  await expect(estado).toHaveValue("bloqueado");

  const paso = await pasoDeAlumno(alumno.alumnoId, "a1");
  expect(paso.estado).toBe("bloqueado");
  expect(paso.notas).toBe(motivo);
});
