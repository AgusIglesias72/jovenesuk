import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

import { codigoViajeUnico, crearViaje } from "./helpers";

// El secret vive en .env.local (dev) o en el env del CI.
function webhookSecret(): string {
  if (process.env.GOOGLE_FORM_WEBHOOK_SECRET) return process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  const env = readFileSync(".env.local", "utf8");
  const m = env.match(/^GOOGLE_FORM_WEBHOOK_SECRET=(.+)$/m);
  if (!m) throw new Error("GOOGLE_FORM_WEBHOOK_SECRET no configurado");
  return m[1]!.trim().replace(/^"|"$/g, "");
}

function payloadAlumno(dni: string, codigoViaje?: string) {
  return {
    nombre: "Webhook",
    apellido: `Test ${dni}`,
    fechaNacimiento: "2009-05-05",
    dni,
    numeroPasaporte: `WH${dni}`,
    fechaVencimientoPasaporte: "2033-01-01",
    tutor1Nombre: "Tutor Webhook",
    tutor1Celular: "+54 9 11 5555-5555",
    tutor1Email: `tutor.${dni.toLowerCase()}@e2e.jovenesenuk.com`,
    ...(codigoViaje ? { codigoViaje } : {}),
  };
}

test("rechaza requests sin el secret", async ({ request }) => {
  const res = await request.post("/api/webhooks/google-form", {
    data: payloadAlumno(`E2E-${Date.now()}`),
  });
  expect(res.status()).toBe(401);
});

test("crea el alumno pre-inscripto y lo asigna al viaje del link", async ({ page, request }) => {
  // Viaje real creado por UI (origen independiente, UK)
  const codigo = codigoViajeUnico();
  await crearViaje(page, { codigo });

  const dni = `E2E-${Date.now()}`;
  const res = await request.post("/api/webhooks/google-form", {
    headers: { "x-webhook-secret": webhookSecret() },
    data: payloadAlumno(dni, codigo),
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.asignacion).not.toBeNull();

  // Reintento con el mismo DNI → idempotente
  const res2 = await request.post("/api/webhooks/google-form", {
    headers: { "x-webhook-secret": webhookSecret() },
    data: payloadAlumno(dni, codigo),
  });
  expect((await res2.json()).duplicado).toBe(true);

  // El alumno quedó inscripto con su tablero generado (URL por DNI/slug).
  await page.goto(`/alumnos/${dni}`);
  await expect(page.getByText(`Test ${dni}, Webhook`)).toBeVisible();
  await expect(page.getByText("Inscripción y programa")).toBeVisible();
  await expect(
    page.locator('[data-paso="paso_0"]').getByText("Completado").first()
  ).toBeVisible();
  // Acceso de familia generado pero NO enviado
  await expect(page.getByText(/Acceso .*no enviado/)).toBeVisible();
});
