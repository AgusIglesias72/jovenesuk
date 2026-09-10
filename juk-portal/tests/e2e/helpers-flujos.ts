import { readFileSync } from "node:fs";

import { and, eq, ne } from "drizzle-orm";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";

import { db } from "../../src/lib/db";
import { accounts, asignaciones, pasosAlumno, users, viajes } from "../../src/lib/db/schema";

import { abrirViaje, codigoViajeUnico, COLEGIO_E2E, panelAlumnosAsignados } from "./helpers";

/*
 * Utilidades de los specs de flujos (familias-acciones, alumnos-abm,
 * asignaciones-validaciones, tablero-subestados, m7-excursiones, consultas,
 * usuarios-abm, webhook-google-form-casos).
 *
 * Todo lo que crean respeta los patrones que borra el teardown (cleanup.ts):
 *   - alumnos por webhook: DNI "E2E-…" y tutor "tutora.<dni>@e2e.jovenesenuk.com"
 *     (la cuenta de familia que nace con ese email también se borra);
 *   - alumnos por UI: tutor "tutor-<dni>@example.com";
 *   - viajes: código UK-2099-…
 */

let secuencia = 0;

/** Sufijo único por corrida y por llamada (base 36, en mayúsculas). */
export function sufijoUnico(): string {
  secuencia += 1;
  const azar = Math.floor(Math.random() * 36 ** 2).toString(36);
  return `${Date.now().toString(36)}${secuencia.toString(36)}${azar}`.toUpperCase();
}

export function webhookSecret(): string {
  if (process.env.GOOGLE_FORM_WEBHOOK_SECRET) return process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  const env = readFileSync(".env.local", "utf8");
  const m = env.match(/^GOOGLE_FORM_WEBHOOK_SECRET=(.+)$/m);
  if (!m?.[1]) throw new Error("GOOGLE_FORM_WEBHOOK_SECRET no configurado");
  return m[1].trim().replace(/^"|"$/g, "");
}

/**
 * DNI de test para el webhook: "E2E-<etiqueta>-<sufijo>". El webhook acepta
 * hasta 20 caracteres, así que la etiqueta es corta (2-3 letras).
 */
export function dniE2E(etiqueta: string): string {
  const dni = `E2E-${etiqueta}-${sufijoUnico()}`;
  if (dni.length > 20) throw new Error(`DNI de test demasiado largo: ${dni}`);
  return dni;
}

export type AlumnoWebhook = {
  alumnoId: string;
  dni: string;
  nombre: string;
  apellido: string;
  /** Como lo lista el roster del viaje: "Apellido, Nombre". */
  label: string;
  tutorEmail: string;
  asignacionId: string | null;
};

/**
 * Alta de alumno por el webhook del Application Form (el camino más rápido y
 * el real para los pre-inscriptos). Con `codigoViaje` queda asignado y con
 * tablero M6. Nace con su cuenta de familia (email del tutor), sin password
 * conocida: `fijarPassword` la define si el spec necesita loguearse.
 */
export async function crearAlumnoPorWebhook(
  request: APIRequestContext,
  opts: {
    etiqueta: string;
    fechaNacimiento?: string;
    vencimientoPasaporte?: string;
    codigoViaje?: string;
  }
): Promise<AlumnoWebhook> {
  const dni = dniE2E(opts.etiqueta);
  const nombre = "Flujo";
  const apellido = `E2E ${dni.slice(4)}`;
  const tutorEmail = `tutora.${dni.toLowerCase()}@e2e.jovenesenuk.com`;

  const res = await request.post("/api/webhooks/google-form", {
    headers: { "x-webhook-secret": webhookSecret() },
    data: {
      nombre,
      apellido,
      fechaNacimiento: opts.fechaNacimiento ?? "2011-04-04",
      dni,
      numeroPasaporte: `FX${dni.slice(-10)}`,
      fechaVencimientoPasaporte: opts.vencimientoPasaporte ?? "2034-01-01",
      tutor1Nombre: "Tutora E2E",
      tutor1Celular: "+54 9 11 5555-0000",
      tutor1Email: tutorEmail,
      ...(opts.codigoViaje ? { codigoViaje: opts.codigoViaje } : {}),
    },
  });
  expect(res.status(), await res.text()).toBe(200);

  const body = (await res.json()) as {
    duplicado?: boolean;
    alumnoId?: string;
    asignacion?: { asignacionId: string } | null;
  };
  // Un duplicado querría decir que el DNI ya existía: el spec nunca debe seguir
  // operando sobre un alumno que no creó.
  expect(body.duplicado, `el DNI ${dni} ya existía`).toBeFalsy();
  if (!body.alumnoId) throw new Error(`El webhook no devolvió alumnoId para ${dni}`);

  return {
    alumnoId: body.alumnoId,
    dni,
    nombre,
    apellido,
    label: `${apellido}, ${nombre}`,
    tutorEmail,
    asignacionId: body.asignacion?.asignacionId ?? null,
  };
}

export type AlumnoUI = {
  dni: string;
  nombre: string;
  apellido: string;
  label: string;
  tutorEmail: string;
};

/**
 * Alta de alumno por el formulario (DNI numérico, que es lo único que acepta
 * el campo). Si el DNI al azar ya existiera, el alta falla por campo y el spec
 * se corta acá: nunca toca al alumno existente.
 */
export async function crearAlumnoUI(page: Page): Promise<AlumnoUI> {
  const nombre = "Alumno";
  const apellido = `Abm${sufijoUnico()}`;
  const dni = String(10000000 + Math.floor(Math.random() * 89999999));
  const tutorEmail = `tutor-${dni}@example.com`;

  await page.goto("/alumnos/nuevo");
  await page.getByLabel("Nombre*", { exact: true }).first().fill(nombre);
  await page.getByLabel("Apellido*", { exact: true }).fill(apellido);
  await page.getByLabel("Fecha de nacimiento*").fill("2009-05-10");
  await page.getByLabel("DNI*").fill(dni);
  await page.getByLabel("N° de pasaporte*").fill(`AB${100000 + Math.floor(Math.random() * 899999)}`);
  await page.getByLabel("Vencimiento del pasaporte*").fill("2033-12-31");
  await page.getByLabel("Nombre*", { exact: true }).nth(1).fill("Tutor Uno");
  await page.getByLabel("Celular*", { exact: true }).fill("+541199999999");
  await page.getByLabel("Email*", { exact: true }).fill(tutorEmail);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/alumnos$/);
  return { dni, nombre, apellido, label: `${apellido}, ${nombre}`, tutorEmail };
}

/** Crea un viaje Grupal o Individual y deja la página en su detalle. Devuelve el código. */
export async function crearViajeConTipo(
  page: Page,
  opts: { tipo: "grupal" | "individual"; colegio?: string }
): Promise<string> {
  const codigo = codigoViajeUnico();

  await page.goto("/viajes/nuevo");
  await page.getByLabel("Código").fill(codigo);
  await page.getByLabel("Nombre").fill(`Viaje ${codigo}`);
  await page
    .getByLabel("Tipo de viaje")
    .selectOption({ label: opts.tipo === "individual" ? "Individual" : "Grupal" });
  await page.getByLabel("Fecha de inicio").fill("2027-02-02");
  await page.getByLabel("Fecha de fin").fill("2027-02-20");
  await page.getByLabel("Colegio destino").selectOption({ label: opts.colegio ?? COLEGIO_E2E });
  await page.getByLabel("Curso").fill("General English");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/viajes$/);
  await abrirViaje(page, codigo);
  return codigo;
}

export async function viajeIdPorCodigo(codigo: string): Promise<string> {
  const [fila] = await db
    .select({ id: viajes.id })
    .from(viajes)
    .where(eq(viajes.codigo, codigo))
    .limit(1);
  if (!fila) throw new Error(`No existe el viaje ${codigo}`);
  return fila.id;
}

/** Elige un alumno en el roster del viaje y aprieta "Asignar". */
export async function asignarDesdeRoster(page: Page, label: string): Promise<void> {
  await page.getByLabel("Alumno a asignar", { exact: true }).selectOption({ label });
  await panelAlumnosAsignados(page).getByRole("button", { name: "Asignar" }).click();
}

/** El badge de estado del resumen del viaje (el único <dd> que dice un estado de viaje). */
export function estadoDelViaje(page: Page) {
  return page
    .getByRole("definition")
    .filter({ hasText: /^(Inscripción abierta|Confirmado|En curso|Finalizado|Cancelado)$/ });
}

const EMAIL_DE_TEST = /@(e2e\.jovenesenuk\.com|e2e\.example\.com|example\.com)$/;

/**
 * Define una password conocida para una cuenta CREADA POR EL SPEC (familia por
 * webhook o usuario del equipo por /usuarios): las dos nacen con una password
 * aleatoria que nadie conoce. Se niega a tocar cualquier email que no sea de
 * test. Devuelve el id del usuario.
 */
export async function fijarPassword(email: string, password: string): Promise<string> {
  const normalizado = email.toLowerCase();
  if (!EMAIL_DE_TEST.test(normalizado)) {
    throw new Error(`fijarPassword solo opera sobre cuentas de test, no sobre ${email}`);
  }
  const [usuario] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizado))
    .limit(1);
  if (!usuario) throw new Error(`No existe el usuario ${email}`);

  const actualizadas = await db
    .update(accounts)
    .set({ password: await hashPassword(password), updatedAt: new Date() })
    .where(and(eq(accounts.userId, usuario.id), eq(accounts.providerId, "credential")))
    .returning({ id: accounts.id });
  expect(actualizadas, `la cuenta ${email} no tiene credencial de email`).toHaveLength(1);
  return usuario.id;
}

/** Login por el formulario real (sin esperar destino: cada spec asierta el suyo). */
export async function ingresar(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

type CodigoPaso = (typeof pasosAlumno.$inferSelect)["codigo"];

/** Paso M6 vigente de un alumno (de su asignación no cancelada). */
export async function pasoDeAlumno(alumnoId: string, codigo: CodigoPaso) {
  const [fila] = await db
    .select({ paso: pasosAlumno })
    .from(pasosAlumno)
    .innerJoin(asignaciones, eq(pasosAlumno.asignacionId, asignaciones.id))
    .where(
      and(
        eq(asignaciones.alumnoId, alumnoId),
        ne(asignaciones.estado, "cancelada"),
        eq(pasosAlumno.codigo, codigo)
      )
    )
    .limit(1);
  if (!fila) throw new Error(`El alumno ${alumnoId} no tiene paso ${codigo}`);
  return fila.paso;
}

/** Asignaciones (de cualquier estado) de un alumno. */
export async function asignacionesDeAlumno(alumnoId: string) {
  return db
    .select({ id: asignaciones.id, estado: asignaciones.estado, viajeId: asignaciones.viajeId })
    .from(asignaciones)
    .where(eq(asignaciones.alumnoId, alumnoId));
}

/** PDF mínimo válido (magic bytes %PDF) para setInputFiles. */
export function pdfMinimo(nombre: string) {
  return {
    name: nombre,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\ntrailer <<>>\n%%EOF"),
  };
}

/** Escapa un literal para usarlo dentro de un RegExp. */
export function literalRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
