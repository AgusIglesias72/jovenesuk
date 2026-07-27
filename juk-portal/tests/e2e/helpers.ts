import { expect, type Page } from "@playwright/test";

/* Utilidades compartidas por los specs E2E. Generan datos únicos para no
   colisionar entre corridas (la suite no tiene teardown). */

function rand(n = 1e9): number {
  return Math.floor(Math.random() * n);
}

export function codigoViajeUnico(): string {
  const letras = Array.from({ length: 6 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  return `UK-2099-JUL-${letras}`;
}

/** Crea un viaje y deja la página en su detalle (`/viajes/<id>`). Devuelve el código. */
export async function crearViaje(
  page: Page,
  opts?: { codigo?: string; fechaInicio?: string; fechaFin?: string; colegio?: string }
): Promise<string> {
  const codigo = opts?.codigo ?? codigoViajeUnico();

  await page.goto("/viajes/nuevo");
  await page.getByLabel("Código").fill(codigo);
  await page.getByLabel("Nombre").fill(`Viaje ${codigo}`);
  await page.getByLabel("Fecha de inicio").fill(opts?.fechaInicio ?? "2027-02-02");
  await page.getByLabel("Fecha de fin").fill(opts?.fechaFin ?? "2027-02-20");
  await page
    .getByLabel("Colegio destino")
    .selectOption({ label: opts?.colegio ?? "London School of English" });
  await page.getByLabel("Curso").fill("General English");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/viajes$/);
  // El detalle se resuelve por slug (código), así que vamos directo —
  // evita la carrera entre el debounce del buscador y el click en "Ver".
  await abrirViaje(page, codigo);
  return codigo;
}

/** Abre el detalle de un viaje por su código (slug). */
export async function abrirViaje(page: Page, codigo: string) {
  await page.goto(`/viajes/${codigo}`);
  await page.waitForURL(`**/viajes/${codigo}`);
}

export type AlumnoCreado = { nombre: string; apellido: string; label: string };

/** Crea un alumno con pasaporte de vencimiento lejano (elegible para cualquier viaje). */
export async function crearAlumno(
  page: Page,
  opts?: { nombre?: string; apellido?: string }
): Promise<AlumnoCreado> {
  const nombre = opts?.nombre ?? "Alumno";
  const apellido = opts?.apellido ?? `Test${rand(100000)}`;
  const dni = String(10000000 + rand(89999999));
  const pasaporte = `AE${100000 + rand(899999)}`;

  await page.goto("/alumnos/nuevo");
  await page.getByLabel("Nombre*", { exact: true }).first().fill(nombre);
  await page.getByLabel("Apellido*", { exact: true }).fill(apellido);
  await page.getByLabel("Fecha de nacimiento*").fill("2008-05-10");
  await page.getByLabel("DNI*").fill(dni);
  await page.getByLabel("N° de pasaporte*").fill(pasaporte);
  await page.getByLabel("Vencimiento del pasaporte*").fill("2032-12-31");
  // Tutor 1 (el segundo "Nombre*" de la página)
  await page.getByLabel("Nombre*", { exact: true }).nth(1).fill("Tutor Uno");
  await page.getByLabel("Celular*", { exact: true }).fill("+541199999999");
  await page.getByLabel("Email*", { exact: true }).fill(`tutor-${dni}@example.com`);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/alumnos$/);
  return { nombre, apellido, label: `${apellido}, ${nombre}` };
}

export async function crearColegio(page: Page, opts?: { nombre?: string }): Promise<{ nombre: string }> {
  const nombre = opts?.nombre ?? `Colegio E2E ${rand(100000)}`;

  await page.goto("/colegios/nuevo");
  await page.getByLabel("Nombre*", { exact: true }).fill(nombre);
  await page.getByLabel("Ciudad*").fill("Londres");
  await page.getByRole("group", { name: "Académico*" }).getByLabel("Nombre").fill("Jane Academic");
  await page
    .getByRole("group", { name: "Académico*" })
    .getByLabel("Email")
    .fill(`acad-${rand()}@example.com`);
  await page.getByRole("group", { name: "Administrativo*" }).getByLabel("Nombre").fill("John Admin");
  await page
    .getByRole("group", { name: "Administrativo*" })
    .getByLabel("Email")
    .fill(`admin-${rand()}@example.com`);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/colegios$/);
  return { nombre };
}

/**
 * Crea un prospecto de CRM y vuelve al pipeline (`/prospectos`). El nombre lleva
 * el prefijo "Prospecto E2E " para que el teardown lo limpie (y el colegio que
 * genere al convertirlo, que hereda ese nombre). Devuelve el nombre.
 */
export async function crearProspecto(
  page: Page,
  opts?: { nombre?: string; email?: string }
): Promise<{ nombre: string }> {
  const nombre = opts?.nombre ?? `Prospecto E2E ${rand(100000)}`;

  await page.goto("/prospectos/nuevo");
  await page.getByLabel("Nombre*", { exact: true }).fill(nombre);
  await page.getByLabel("Ciudad").fill("Londres");
  await page.getByPlaceholder("contacto@colegio.com").fill(opts?.email ?? `prospecto-${rand()}@example.com`);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/prospectos$/);
  return { nombre };
}

/** Abre el detalle del prospecto clickeando su tarjeta/fila por nombre. */
export async function abrirProspecto(page: Page, nombre: string) {
  await page.goto("/prospectos");
  await page.getByText(nombre, { exact: true }).click();
  await page.waitForURL(/\/prospectos\/[0-9a-f-]{36}$/);
}

export async function crearGroupLeader(
  page: Page,
  opts?: { nombre?: string; apellido?: string }
): Promise<{ nombre: string; apellido: string }> {
  const nombre = opts?.nombre ?? "Leader";
  const apellido = opts?.apellido ?? `GL${rand(100000)}`;

  await page.goto("/group-leaders/nuevo");
  await page.getByLabel("Nombre*").fill(nombre);
  await page.getByLabel("Apellido*").fill(apellido);
  await page.getByLabel("Email*").fill(`gl-${rand()}@example.com`);
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/group-leaders$/);
  return { nombre, apellido };
}

/** El <select> de estado del paso M7 abierto (es el único con la opción "Pendiente"). */
export function selectorEstadoPaso(page: Page) {
  return page.locator("select", {
    has: page.locator('option:text-is("Pendiente")'),
  });
}

/** Aprieta un botón del modal de confirmación del design system. */
export async function confirmarModal(page: Page, boton: string | RegExp) {
  await page.getByRole("dialog").getByRole("button", { name: boton }).click();
}
