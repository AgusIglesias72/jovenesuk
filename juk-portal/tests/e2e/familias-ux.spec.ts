import { test, expect } from "@playwright/test";

/**
 * Portal de Familias guiado (plan 4.6): documentación agrupada por etapas con
 * código y ayuda, acceso a Ayuda con los canales reales, aviso global de cuota
 * vencida y confirmación visible al reportar un dato.
 *
 * Corre con la sesión de familia (tutor@demo → Lola, DEMO-1) que arma
 * `familia.setup.ts`. Lola tiene C1 (viaje a UK) y un plan de 5 cuotas con 2
 * pagadas y vencimientos desde abril 2026 (seed-demo), así que hay cuotas
 * vencidas.
 *
 * Todo es de solo lectura salvo "reportar un dato", que deja una fila en
 * auditoría y un email en dry-run (el webServer de Playwright corre con
 * EMAIL_DRY_RUN=1). NO se envía el formulario del problema de ETA: cambiaría
 * el estado sembrado de C1 para el resto de la suite.
 */

test.use({ storageState: "tests/e2e/.auth/familia.json" });

const DNI = "DEMO-1";

test.describe("Portal de Familias — UX guiada", () => {
  test("la documentación se ve agrupada por etapa, con código y quién lo hace", async ({ page }) => {
    await page.goto(`/familias/${DNI}/documentacion`);
    await expect(page.getByRole("heading", { name: "Documentación", level: 1 })).toBeVisible();

    for (const etapa of [
      "Inscripción en el colegio",
      "Pagos",
      "Documentación para viajar",
      "Trámites en Argentina",
    ]) {
      await expect(page.getByRole("heading", { name: etapa, level: 3 })).toBeVisible();
    }

    // El identificador del tablero, visible junto al nombre en criollo.
    const etapaViaje = page.getByRole("region", { name: "Documentación para viajar" });
    await expect(etapaViaje.getByText("C1", { exact: true })).toBeVisible();
    await expect(etapaViaje.getByText(/Permiso de entrada al Reino Unido/)).toBeVisible();

    const etapaColegio = page.getByRole("region", { name: "Inscripción en el colegio" });
    await expect(etapaColegio.getByText("A1", { exact: true })).toBeVisible();

    // Cada trámite dice quién se ocupa.
    await expect(page.getByText("Lo hacés vos").first()).toBeVisible();
    await expect(page.getByText("Lo hacemos nosotros").first()).toBeVisible();

    // La barra de progreso general se conserva.
    await expect(page.getByText(/de \d+ listos/).first()).toBeVisible();
  });

  test("el ETA ofrece 'Tuve un problema' con los tipos de problema y el sitio oficial", async ({ page }) => {
    await page.goto(`/familias/${DNI}/documentacion`);
    const etapaViaje = page.getByRole("region", { name: "Documentación para viajar" });

    await expect(etapaViaje.getByRole("link", { name: /sitio oficial/i })).toHaveAttribute(
      "href",
      /gov\.uk/
    );

    await etapaViaje.getByRole("button", { name: "Tuve un problema con el ETA" }).click();
    await expect(etapaViaje.getByText("Contanos qué pasó con el ETA")).toBeVisible();
    await expect(etapaViaje.getByLabel("¿Qué pasó?")).toBeAttached();
    await expect(etapaViaje.getByRole("button", { name: "Enviar aviso" })).toBeVisible();

    // Se cancela sin enviar: no se toca el estado sembrado de C1.
    await etapaViaje.getByRole("button", { name: "Cancelar" }).click();
    await expect(etapaViaje.getByRole("button", { name: "Tuve un problema con el ETA" })).toBeVisible();
  });

  test("Ayuda está a un clic con WhatsApp, email y preguntas frecuentes", async ({ page }) => {
    await page.goto(`/familias/${DNI}`);
    await page.getByRole("link", { name: "Ayuda y contacto" }).click();

    await expect(page).toHaveURL(new RegExp(`/familias/${DNI}/ayuda$`));
    await expect(page.getByRole("heading", { name: "Ayuda", level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Ayuda");

    const canales = page.getByRole("region", { name: "Canales de contacto" });
    await expect(canales.getByRole("link", { name: "Escribinos por WhatsApp" })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/\d+/
    );
    await expect(canales.getByRole("link", { name: "Mandanos un email" })).toHaveAttribute(
      "href",
      /^mailto:/
    );

    await page.getByText("¿Qué es el Parental Consent?").click();
    await expect(page.getByText(/permiso que firman los padres/)).toBeVisible();
  });

  test("el aviso de cuota vencida acompaña fuera de Pagos y lleva a Pagos", async ({ page }) => {
    await page.goto(`/familias/${DNI}/documentacion`);
    const aviso = page.getByRole("status", { name: "Aviso de cuota vencida" });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(/cuotas? vencidas?/);
    await expect(aviso).toContainText("Lola");

    await aviso.getByRole("link", { name: /Ver mis pagos/ }).click();
    await expect(page).toHaveURL(new RegExp(`/familias/${DNI}/pagos$`));
    await expect(page.getByRole("heading", { name: "Pagos", level: 1 })).toBeVisible();
    // En Pagos no se repite: el listado ya marca cada cuota.
    await expect(page.getByRole("status", { name: "Aviso de cuota vencida" })).toHaveCount(0);
  });

  test("reportar un dato incorrecto muestra la confirmación", async ({ page }) => {
    await page.goto(`/familias/${DNI}/datos`);
    await page.getByRole("button", { name: "Reportar un dato incorrecto" }).click();

    await page.getByLabel("¿Qué dato está mal?").selectOption("Pasaporte");
    await page.getByLabel("Comentario (opcional)").fill("E2E familias-ux: reporte de prueba, ignorar.");
    await page.getByRole("button", { name: "Enviar aviso" }).click();

    await expect(page.getByText("Recibimos tu aviso sobre «Pasaporte»")).toBeVisible();
    await expect(page.getByText(/Ya le llegó al equipo de JUK/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reportar otro dato" })).toBeVisible();
  });

  test("en el teléfono, Ayuda está en el header", { tag: "@mobile" }, async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo aplica al header mobile.");
    await page.goto(`/familias/${DNI}/documentacion`);
    await page.getByRole("banner").getByRole("link", { name: "Ayuda" }).click();
    await expect(page.getByRole("heading", { name: "Ayuda", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Escribinos por WhatsApp" })).toHaveAttribute(
      "href",
      /wa\.me/
    );
  });
});
