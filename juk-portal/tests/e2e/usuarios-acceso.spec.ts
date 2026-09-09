import { test, expect } from "@playwright/test";
import { like } from "drizzle-orm";

import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema";

/**
 * Alta de usuario del equipo: la pantalla NUNCA muestra una contraseña; el
 * usuario nuevo recibe un link para crear la suya (24 h).
 *
 * El teardown global (cleanup.ts) solo borra cuentas de FAMILIA, así que los
 * usuarios del equipo que genera este spec los limpia el afterAll de acá.
 */

const EMAIL_PREFIX = "e2e+";

function emailUnico(): string {
  return `${EMAIL_PREFIX}${Date.now()}${Math.floor(Math.random() * 1000)}@e2e.jovenesenuk.com`;
}

test.afterAll(async () => {
  await db.delete(users).where(like(users.email, `${EMAIL_PREFIX}%`));
});

test("crear un usuario avisa que le mandamos un link, sin mostrar contraseña", async ({
  page,
}) => {
  const email = emailUnico();

  await page.goto("/usuarios/nuevo");
  await expect(page.getByRole("heading", { name: "Nuevo usuario", level: 1 })).toBeVisible();

  // La ayuda del form ya no promete una contraseña temporal.
  await expect(page.getByText(/No se genera ninguna contraseña/i)).toBeVisible();

  await page.getByLabel("Nombre").fill("Usuario E2E Acceso");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Rol").selectOption({ label: "Admin JUK" });
  await page.getByRole("button", { name: "Crear usuario" }).click();

  // Scopeado a main: los toasts también usan role="alert" cuando son de error.
  const alerta = page.locator("main").getByRole("alert");
  await expect(alerta).toBeVisible({ timeout: 20_000 });
  await expect(alerta).toContainText(email);
  // Con Resend configurado sale el mail; si falla, el aviso es el de warning.
  // Los dos dicen "link para crear ... contraseña" y ninguno muestra la clave.
  await expect(alerta).toContainText(/link para crear/i);

  const cuerpo = (await page.locator("main").innerText()).toLowerCase();
  expect(cuerpo).not.toContain("contraseña temporal");
  expect(cuerpo).not.toContain("copiala");

  // El usuario quedó realmente creado.
  await page.getByRole("link", { name: "Volver a usuarios" }).click();
  await expect(page.getByText(email)).toBeVisible();
});

test("desde la lista se puede reenviar el acceso sin tocar nada más", async ({ page }) => {
  const email = emailUnico();

  await page.goto("/usuarios/nuevo");
  await page.getByLabel("Nombre").fill("Usuario E2E Reenvío");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible({ timeout: 20_000 });

  await page.goto("/usuarios");
  const fila = page.getByRole("row").filter({ hasText: email });
  await expect(fila).toBeVisible();
  await expect(fila.getByRole("button", { name: "Reenviar acceso" })).toBeEnabled();
});
