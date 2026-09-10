import { eq, inArray } from "drizzle-orm";
import { test, expect } from "@playwright/test";

import { db } from "../../src/lib/db";
import { consultas } from "../../src/lib/db/schema";

import { literalRegex, sufijoUnico } from "./helpers-flujos";

/*
 * Bandeja de consultas del back-office (/consultas).
 *
 * La consulta se inserta directo en la DB, con la misma forma que le da la
 * server action del sitio: el formulario público ya lo cubren leads.spec.ts
 * (persistencia) y public.spec.ts (validaciones), y enviarlo acá compartiría
 * la ventana de rate limit por IP con leads-rate-limit.spec.ts. Lo que no
 * tenía red es el lado del equipo: verla con su mensaje, contactarla y
 * cambiarle el estado.
 *
 * Email "e2e+…@e2e.example.com": lo borra el teardown; el afterAll borra además
 * las filas por id.
 */

const creadas: string[] = [];

test.afterAll(async () => {
  if (creadas.length > 0) await db.delete(consultas).where(inArray(consultas.id, creadas));
});

test("una consulta de la web se lee completa, se puede responder y se marca como contactada", async ({
  page,
}) => {
  const sufijo = sufijoUnico();
  const email = `e2e+consulta-${sufijo}@e2e.example.com`;
  const mensaje = `Hola, mi hija quiere viajar el año que viene.\nConsulta de prueba E2E ${sufijo}.`;

  const [consulta] = await db
    .insert(consultas)
    .values({
      nombre: "Consulta",
      apellido: `E2E ${sufijo}`,
      email,
      telefono: "11 5555-1234",
      paraQuien: "para_mi_hijo",
      modalidad: "grupal",
      destino: "reino_unido",
      cuando: "proximo_ano",
      mensaje,
    })
    .returning({ id: consultas.id });
  if (!consulta) throw new Error("No se pudo insertar la consulta de test");
  creadas.push(consulta.id);

  await page.goto(`/consultas?q=${encodeURIComponent(email)}`);
  const fila = page.getByRole("row").filter({ hasText: email });
  await expect(fila).toBeVisible();
  await expect(fila).toContainText(`E2E ${sufijo}, Consulta`);
  await expect(fila).toContainText("Para mi hijo/a");
  await expect(fila).toContainText("Salida grupal");
  await expect(fila).toContainText(`Consulta de prueba E2E ${sufijo}.`);

  await fila.getByText("Ver mensaje completo").click();
  await expect(fila.getByText("Ocultar mensaje")).toBeVisible();

  // Canales para responder: mail con asunto y WhatsApp con código de país.
  await expect(fila.getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);
  await expect(fila.getByRole("link", { name: "Responder" })).toHaveAttribute(
    "href",
    new RegExp(`^mailto:${literalRegex(email)}\\?subject=`)
  );
  await expect(fila.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/541155551234"
  );

  const estado = fila.getByLabel("Estado de la consulta");
  await expect(estado).toHaveValue("nueva");
  await estado.selectOption("contactada");
  await expect
    .poll(async () => {
      const [actual] = await db
        .select({ estado: consultas.estado })
        .from(consultas)
        .where(eq(consultas.id, consulta.id));
      return actual?.estado;
    })
    .toBe("contactada");

  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: email }).getByLabel("Estado de la consulta")
  ).toHaveValue("contactada");

  // El filtro por estado la mueve de bandeja.
  await page.goto(`/consultas?estado=nueva&q=${encodeURIComponent(email)}`);
  await expect(page.getByText("Sin resultados para estos filtros")).toBeVisible();
  await page.goto(`/consultas?estado=contactada&q=${encodeURIComponent(email)}`);
  await expect(page.getByRole("row").filter({ hasText: email })).toBeVisible();
});
