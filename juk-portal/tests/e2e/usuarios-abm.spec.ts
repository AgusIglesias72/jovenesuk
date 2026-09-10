import { eq } from "drizzle-orm";
import { test, expect } from "@playwright/test";

import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema";

import { confirmarModal } from "./helpers";
import { fijarPassword, ingresar, sufijoUnico } from "./helpers-flujos";

/*
 * Gestión de usuarios del equipo más allá del alta y el reenvío de acceso
 * (usuarios-acceso.spec.ts): cambio de rol con confirmación, desactivar y
 * activar, y el efecto real sobre el login.
 *
 * Serial: los tests comparten un usuario propio "e2e+abm-…@e2e.example.com"
 * (lo borra el afterAll y, si algo falla, el teardown).
 */

test.describe.configure({ mode: "serial" });

const SUFIJO = sufijoUnico().toLowerCase();
const EMAIL = `e2e+abm-${SUFIJO}@e2e.example.com`;
const NOMBRE = `Usuario E2E ABM ${SUFIJO}`;
const PASSWORD = `E2e-Abm-${SUFIJO}`;

async function usuarioEnDb() {
  const [fila] = await db
    .select({ role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, EMAIL))
    .limit(1);
  return fila;
}

test.afterAll(async () => {
  await db.delete(users).where(eq(users.email, EMAIL));
});

test("el super_admin cambia el rol de un usuario con confirmación, y cancelar no lo cambia", async ({
  page,
}) => {
  await page.goto("/usuarios/nuevo");
  await page.getByLabel("Nombre").fill(NOMBRE);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Rol").selectOption({ label: "Admin JUK" });
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(EMAIL, { timeout: 20_000 });

  await page.goto("/usuarios");
  const fila = page.getByRole("row").filter({ hasText: EMAIL });
  const rol = fila.getByLabel(`Rol de ${NOMBRE}`, { exact: true });
  await expect(rol).toHaveValue("admin_juk");

  await rol.selectOption("super_admin");
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toContainText(`¿Cambiar el rol de ${NOMBRE}?`);
  await expect(dialogo).toContainText("Super Admin es el único rol");
  await confirmarModal(page, "Cambiar rol");
  await expect.poll(async () => (await usuarioEnDb())?.role).toBe("super_admin");

  await page.reload();
  await expect(rol).toHaveValue("super_admin");

  // Cancelar el diálogo no toca el rol.
  await rol.selectOption("admin_juk");
  await confirmarModal(page, "Cancelar");
  await expect(dialogo).toHaveCount(0);
  await expect(rol).toHaveValue("super_admin");
  expect((await usuarioEnDb())?.role).toBe("super_admin");

  await rol.selectOption("admin_juk");
  await confirmarModal(page, "Cambiar rol");
  await expect.poll(async () => (await usuarioEnDb())?.role).toBe("admin_juk");
});

test("desactivar y activar desde la lista cambia el estado; el usuario activo entra al portal", async ({
  page,
  browser,
  baseURL,
}) => {
  await fijarPassword(EMAIL, PASSWORD);

  await page.goto("/usuarios");
  const fila = page.getByRole("row").filter({ hasText: EMAIL });

  await fila.getByRole("button", { name: "Desactivar", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(`¿Desactivar a ${NOMBRE}?`);
  await confirmarModal(page, "Sí, desactivar");
  await expect(fila.getByText("Inactivo", { exact: true })).toBeVisible();
  await expect(fila.getByRole("button", { name: "Reenviar acceso" })).toHaveCount(0);
  expect((await usuarioEnDb())?.isActive).toBe(false);

  await fila.getByRole("button", { name: "Activar", exact: true }).click();
  await expect(fila.getByText("Activo", { exact: true })).toBeVisible();
  expect((await usuarioEnDb())?.isActive).toBe(true);

  // Vacío a propósito: dentro de Playwright Test, browser.newContext hereda el
  // storageState del proyecto (la sesión de admin) y /login rebota a /dashboard.
  const contexto = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  try {
    const pagina = await contexto.newPage();
    await ingresar(pagina, EMAIL, PASSWORD);
    await expect(pagina).toHaveURL(/\/dashboard$/);
    await expect(pagina.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("un usuario desactivado que intenta entrar ve «Cuenta desactivada» y se queda en el login", async ({
  browser,
  baseURL,
}) => {
  /*
   * Regresión del loop /login → /dashboard → /login. Better-Auth rechaza con
   * 403 la creación de sesión de una cuenta inactiva (después de verificar la
   * contraseña), y el proxy ya no rebota /login mirando solo la cookie.
   */

  await db.update(users).set({ isActive: false }).where(eq(users.email, EMAIL));

  // Vacío a propósito: dentro de Playwright Test, browser.newContext hereda el
  // storageState del proyecto (la sesión de admin) y /login rebota a /dashboard.
  const contexto = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  try {
    const pagina = await contexto.newPage();
    await ingresar(pagina, EMAIL, PASSWORD);
    await expect(pagina.getByText("Cuenta desactivada")).toBeVisible();
    await expect(pagina).toHaveURL(/\/login/);
  } finally {
    await contexto.close();
  }
});
