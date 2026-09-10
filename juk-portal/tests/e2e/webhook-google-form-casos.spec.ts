import { eq } from "drizzle-orm";
import { test, expect } from "@playwright/test";

import { db } from "../../src/lib/db";
import { alumnos } from "../../src/lib/db/schema";

import { codigoViajeUnico, panelAlumnosAsignados } from "./helpers";
import {
  asignacionesDeAlumno,
  crearAlumnoPorWebhook,
  crearViajeConTipo,
  dniE2E,
  webhookSecret,
} from "./helpers-flujos";

/*
 * Ramas del webhook del Application Form que webhook-google-form.spec.ts no
 * cubre (ese prueba "sin secret → 401", el camino feliz y el reintento
 * idempotente por DNI): payload inválido, JSON roto, secreto parecido al real,
 * viaje inexistente y viaje sin cupo. En todas se verifica en la DB qué quedó
 * creado y qué no. El largo mínimo del secreto configurado se prueba en
 * src/lib/domain/webhooks/secreto.test.ts: desde acá no se puede cambiar el
 * env del server.
 */

const URL_WEBHOOK = "/api/webhooks/google-form";

async function alumnosConDni(dni: string) {
  return db.select({ id: alumnos.id }).from(alumnos).where(eq(alumnos.dni, dni));
}

test("un payload incompleto responde 422 con los campos que faltan y no crea nada", async ({
  request,
}) => {
  const dni = dniE2E("WV");
  const res = await request.post(URL_WEBHOOK, {
    headers: { "x-webhook-secret": webhookSecret() },
    data: { nombre: "Incompleto", dni },
  });

  expect(res.status()).toBe(422);
  const body = (await res.json()) as { detalles?: Record<string, unknown> };
  expect(Object.keys(body.detalles ?? {})).toEqual(
    expect.arrayContaining(["apellido", "fechaNacimiento", "numeroPasaporte", "tutor1Email"])
  );
  expect(await alumnosConDni(dni)).toHaveLength(0);
});

test("un JSON mal formado responde 400", async ({ request }) => {
  const res = await request.post(URL_WEBHOOK, {
    headers: { "x-webhook-secret": webhookSecret(), "content-type": "application/json" },
    // Buffer y no string: con content-type JSON, Playwright serializa un string
    // como JSON y el cuerpo llega válido (un string entre comillas) → 422.
    data: Buffer.from('{"nombre": "sin cerrar"', "utf8"),
  });
  expect(res.status()).toBe(400);
  expect(await res.json()).toMatchObject({ error: "JSON inválido" });
});

test("un secreto parecido al real (prefijo o con un carácter de más) responde 401 y no crea el alumno", async ({
  request,
}) => {
  const secreto = webhookSecret();
  const dni = dniE2E("WS");
  const payload = {
    nombre: "Intruso",
    apellido: "E2E",
    fechaNacimiento: "2010-01-01",
    dni,
    numeroPasaporte: "WS000001",
    fechaVencimientoPasaporte: "2033-01-01",
    tutor1Nombre: "Tutor",
    tutor1Celular: "+54 9 11 5555-5555",
    tutor1Email: `tutora.${dni.toLowerCase()}@e2e.jovenesenuk.com`,
  };

  for (const intento of [secreto.slice(0, -1), `${secreto}x`]) {
    const res = await request.post(URL_WEBHOOK, {
      headers: { "x-webhook-secret": intento },
      data: payload,
    });
    expect(res.status()).toBe(401);
  }
  expect(await alumnosConDni(dni)).toHaveLength(0);
});

test("con un código de viaje inexistente crea el pre-inscripto sin asignación", async ({
  request,
}) => {
  const alumno = await crearAlumnoPorWebhook(request, {
    etiqueta: "WX",
    codigoViaje: codigoViajeUnico(),
  });

  expect(alumno.asignacionId).toBeNull();
  const [fila] = await db.select().from(alumnos).where(eq(alumnos.id, alumno.alumnoId));
  expect(fila?.estado).toBe("pre_inscripto");
  expect(fila?.canalAlta).toBe("webhook");
  expect(await asignacionesDeAlumno(alumno.alumnoId)).toHaveLength(0);
});

test("en un viaje individual ya ocupado, el segundo alumno queda pre-inscripto sin asignar", async ({
  page,
  request,
}) => {
  const codigo = await crearViajeConTipo(page, { tipo: "individual" });

  const primero = await crearAlumnoPorWebhook(request, { etiqueta: "WI", codigoViaje: codigo });
  expect(primero.asignacionId).not.toBeNull();

  // Sin cupo no asigna solo: la sobre-capacidad es decisión humana (US-11).
  const segundo = await crearAlumnoPorWebhook(request, { etiqueta: "WJ", codigoViaje: codigo });
  expect(segundo.asignacionId).toBeNull();
  expect(await asignacionesDeAlumno(segundo.alumnoId)).toHaveLength(0);

  await page.reload();
  const roster = panelAlumnosAsignados(page);
  await expect(roster.getByText("1 / 1 cupos")).toBeVisible();
  await expect(roster.getByRole("link", { name: primero.label })).toBeVisible();
  await expect(roster.getByRole("link", { name: segundo.label })).toHaveCount(0);
});
