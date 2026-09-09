import { eq } from "drizzle-orm";
import { test, expect } from "@playwright/test";

import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema/users";

/*
 * Endurecimiento de la capa de auth (item 1.5 del plan de adecuación):
 *   - el registro público de Better-Auth no existe (el bloqueo vive en la
 *     config de auth, no solo en el proxy) y no deja usuarios creados;
 *   - un login fallido muestra el Alert genérico, sin filtrar qué campo falló.
 *
 * Corren SIN sesión: ignoran el storageState global del proyecto chromium.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(() => {
  // Primera visita a /login en dev: compila la página (cold start).
  test.setTimeout(60_000);
});

test("el sign-up público responde 4xx y no crea la cuenta", async ({ request, baseURL }) => {
  const email = `e2e.signup.${Date.now()}@e2e.example.com`;

  const res = await request.post("/api/auth/sign-up/email", {
    headers: { origin: baseURL ?? "" },
    data: { email, password: "Prueba12345", name: "Intruso E2E" },
    failOnStatusCode: false,
  });

  expect(res.status()).toBeGreaterThanOrEqual(400);
  expect(res.status()).toBeLessThan(500);

  const filas = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  expect(filas).toHaveLength(0);
});

test("login con contraseña incorrecta muestra el error genérico", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(`e2e.nadie.${Date.now()}@e2e.example.com`);
  await page.getByLabel("Contraseña").fill("passwordIncorrecta123");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByText("No se pudo ingresar")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
