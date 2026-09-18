import { test, expect } from "@playwright/test";

import { esperarHidratacion } from "./helpers";

// Cuenta de TEST del seed demo, igual que auth.setup.ts.
const EMAIL = process.env.E2E_EMAIL ?? "test.superadmin@jovenesenuk.com";
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.SEED_TEST_PASSWORD;
if (!PASSWORD) {
  throw new Error(
    "Falta E2E_PASSWORD o SEED_TEST_PASSWORD en el entorno (.env.local): sin eso login-ux no puede loguearse."
  );
}

test.describe("login: feedback y returnTo (sin sesión)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("?reset=success muestra la confirmación de contraseña", async ({ page }) => {
    await page.goto("/login?reset=success");
    await expect(page.getByRole("alert").filter({ hasText: "Contraseña actualizada" })).toBeVisible();
  });

  test("?inactivo=1 explica que la cuenta está desactivada", async ({ page }) => {
    await page.goto("/login?inactivo=1");
    await expect(page.getByRole("alert").filter({ hasText: "Cuenta desactivada" })).toBeVisible();
  });

  test("?portal=familias le habla a la familia", async ({ page }) => {
    await page.goto("/login?portal=familias");
    await expect(
      page.getByRole("heading", { name: "Ingresá al Portal de Familias" })
    ).toBeVisible();
  });

  /*
   * Google es solo una forma de entrar a una cuenta que YA existe: el provider
   * corta el alta (`disableSignUp: true`) y el callback vuelve con
   * `?error=signup_disabled`. Antes de este cambio el login declaraba
   * `searchParams.error` y no lo renderizaba: el error moría en silencio.
   */
  test("un Google desconocido se rechaza con un mensaje claro", async ({ page }) => {
    await page.goto("/login?error=signup_disabled");
    await expect(
      page.getByRole("alert").filter({ hasText: "Ese Google no está habilitado" })
    ).toBeVisible();
    await expect(page.getByText("No tenemos ninguna cuenta con ese email")).toBeVisible();
  });

  test("un código de error desconocido no muere en silencio", async ({ page }) => {
    await page.goto("/login?error=unable_to_get_user_info");
    await expect(
      page.getByRole("alert").filter({ hasText: "No se pudo ingresar con Google" })
    ).toBeVisible();
  });

  // El gate condicional es la mitad del cambio: el server de Playwright no
  // tiene GOOGLE_CLIENT_ID/SECRET, así que el botón no tiene que existir y el
  // login por email tiene que seguir entero.
  test("sin credenciales de Google el login no ofrece el botón", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  });

  test(
    "@mobile si Google está configurado, su botón respeta el objetivo táctil de 44px",
    async ({ page }) => {
      await page.goto("/login");
      const boton = page.getByRole("button", { name: "Continuar con Google" });

      // Sin credenciales el botón no se renderiza (es el estado esperado hoy);
      // el caso queda activo para el día que el entorno las tenga.
      test.skip(
        (await boton.count()) === 0,
        "GOOGLE_CLIENT_ID/SECRET no están en este entorno: el botón no se muestra."
      );

      await esperarHidratacion(boton);
      const caja = await boton.boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  );

  test("un returnTo hacia otro dominio termina en /dashboard", async ({ page }) => {
    await page.goto("/login?returnTo=%2F%2Fevil.com");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("un returnTo con backslash tampoco escapa del portal", async ({ page }) => {
    await page.goto("/login?returnTo=%2F%5Cevil.com");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("back-office: 404 propio", () => {
  test("un alumno inexistente muestra el 404 del portal, no el público", async ({ page }) => {
    await page.goto("/alumnos/00000000");

    await expect(page.getByRole("heading", { name: "No encontramos eso" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir al dashboard" })).toBeVisible();
    await expect(page.getByText("se fue de excursión")).toHaveCount(0);
  });
});
