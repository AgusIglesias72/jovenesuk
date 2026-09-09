import { eq, like, or } from "drizzle-orm";
import { test, expect, type Page } from "@playwright/test";

import { db } from "../../src/lib/db";
import { consultas, formRateLimits } from "../../src/lib/db/schema/leads";
import { LIMITE_POR_IP } from "../../src/lib/domain/anti-abuso";

/*
 * Anti-abuso de los formularios públicos (1.14): el sexto envío de consultas
 * desde la misma conexión dentro de la ventana se rechaza con un mensaje
 * genérico y NO se persiste.
 *
 * Corre sin sesión (sitio público). El estado del rate limit es global por
 * clave, así que el spec limpia las ventanas antes y después: el resto de la
 * suite (leads.spec, public.spec) comparte la IP de localhost.
 */

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

const PREFIJO = "rl-lead";

/** Emails distintos por envío: lo que se agota es la cuota por IP, no la del email. */
function emailE2E(i: number): string {
  return `${PREFIJO}-${Date.now()}-${i}@e2e.example.com`;
}

async function limpiarVentanas(): Promise<void> {
  await db
    .delete(formRateLimits)
    .where(or(like(formRateLimits.key, "lead:%"), like(formRateLimits.key, "newsletter:%")));
}

async function enviarConsulta(page: Page, email: string): Promise<void> {
  await page.goto("/contacto");
  await page.getByLabel("Nombre").fill("Rate");
  await page.getByLabel("Apellido").fill("Limit");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Teléfono").fill("1133334444");
  await page.getByLabel("¿Qué te interesa?").selectOption("asesoramiento");
  await page.getByLabel("¿Cuándo te gustaría viajar?").selectOption("este_ano");
  await page.getByText("Acepto que Jóvenes en UK").click();
  await page.getByRole("button", { name: "Quiero que me contacten" }).click();
}

test.beforeEach(() => {
  // La primera visita compila la página + la action en dev (cold start).
  test.setTimeout(120_000);
});

test.beforeAll(async () => {
  await limpiarVentanas();
});

test.afterAll(async () => {
  await limpiarVentanas();
  await db.delete(consultas).where(like(consultas.email, `${PREFIJO}-%@e2e.example.com`));
});

test(`el envío ${LIMITE_POR_IP.maximo + 1} desde la misma IP se rechaza y no persiste`, async ({
  page,
}) => {
  const emails = Array.from({ length: LIMITE_POR_IP.maximo }, (_, i) => emailE2E(i));

  for (const email of emails) {
    await enviarConsulta(page, email);
    await expect(page.getByText("¡Gracias por tu consulta!")).toBeVisible();
  }

  const bloqueado = emailE2E(LIMITE_POR_IP.maximo);
  await enviarConsulta(page, bloqueado);

  await expect(page.getByText(/Prob[áa] de nuevo en unos minutos/)).toBeVisible();
  await expect(page.getByText("¡Gracias por tu consulta!")).toHaveCount(0);

  const persistidos = await db.select().from(consultas).where(eq(consultas.email, bloqueado));
  expect(persistidos).toHaveLength(0);

  // Los que sí entraron quedaron guardados: el límite no come leads legítimos.
  const primero = emails[0];
  expect(primero).toBeDefined();
  const guardados = await db.select().from(consultas).where(eq(consultas.email, primero!));
  expect(guardados).toHaveLength(1);
});
