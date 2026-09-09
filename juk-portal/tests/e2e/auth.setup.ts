import { eq } from "drizzle-orm";
import { test as setup, expect } from "@playwright/test";

import { db } from "../../src/lib/db";
import { colegios } from "../../src/lib/db/schema";

import { COLEGIO_E2E } from "./helpers";

const authFile = "tests/e2e/.auth/admin.json";

// Cuenta de TEST del seed demo (npm run db:seed:demo). La contraseña nunca va
// en el código: viene de E2E_PASSWORD (CI / otra cuenta) o de SEED_TEST_PASSWORD.
const EMAIL = process.env.E2E_EMAIL ?? "test.superadmin@jovenesenuk.com";
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.SEED_TEST_PASSWORD;
if (!PASSWORD) {
  throw new Error("Falta E2E_PASSWORD o SEED_TEST_PASSWORD en el entorno (.env.local): sin eso el setup de auth no puede loguearse.");
}

setup("autenticar como admin", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();

  await page.context().storageState({ path: authFile });
});

/**
 * Colegio destino base contra el que `crearViaje` arma los viajes de la suite.
 * Idempotente por nombre (no hay unique en colegios.nombre, así que un
 * onConflict no sirve) y sin config documental: los specs de documentos/pasos
 * asumen los defaults del dominio. El teardown lo preserva a propósito.
 */
setup("garantizar el colegio base de los E2E", async () => {
  const existente = await db
    .select({ id: colegios.id })
    .from(colegios)
    .where(eq(colegios.nombre, COLEGIO_E2E))
    .limit(1);
  if (existente.length > 0) return;

  const contacto = { nombre: "E2E Contacto", email: "colegio-base@e2e.example.com" };
  await db.insert(colegios).values({
    nombre: COLEGIO_E2E,
    tipo: "destino",
    pais: "reino_unido",
    ciudad: "Londres",
    contactoAcademico: contacto,
    contactoAdministrativo: contacto,
    cursosDisponibles: ["General English"],
    tiposAlojamiento: ["familia_anfitriona"],
    tipoEntradaRequerida: "eta",
  });
});
