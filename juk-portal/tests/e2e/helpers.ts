import { readFileSync } from "node:fs";

import { expect, type Locator, type Page } from "@playwright/test";

/* Utilidades compartidas por los specs E2E. Generan datos únicos para no
   colisionar entre corridas; el teardown global (global.teardown.ts) borra lo
   que matchea los patrones de cleanup.ts.

   CRITERIO DE SELECTORES: por rol + nombre accesible (getByRole / getByLabel
   dentro de un group o region con nombre). Nada de posiciones (.nth), clases
   CSS, texto de <option> para ubicar un <select> ni click({ force }). Si la UI
   no ofrece un nombre para desambiguar, se agrega en el componente (es un
   problema de accesibilidad, no del test). Los data-* existentes
   (data-paso, data-cuotas-panel, data-roster-cobertura…) quedan como ganchos
   estables donde no hay un nombre visible que usar.

   VARIABLES DE ENTORNO QUE USAN LOS E2E (todas desde .env.local, que
   playwright.config.ts carga al proceso de Playwright):

     DATABASE_URL          obligatoria — la usan cleanup.ts, auth.setup.ts y
                           los specs que verifican persistencia (leads).
     E2E_DATABASE_URL      opcional — si está, pisa DATABASE_URL (branch Neon
                           dedicada). Solo aplica al server que levanta
                           Playwright; con PW_PORT apuntando a un server ya
                           corriendo, manda la DATABASE_URL de ese server.
     SEED_TEST_PASSWORD    obligatoria — password de las cuentas test.* del
                           seed demo (npm run db:seed:demo).
     E2E_EMAIL             opcional — cuenta admin del setup de auth
                           (default: test.superadmin@jovenesenuk.com).
     E2E_PASSWORD          opcional — pisa SEED_TEST_PASSWORD para esa cuenta.
     SEED_FAMILIA_PASSWORD opcional — password de las cuentas de familia demo
                           (default: SEED_TEST_PASSWORD).
     E2E_FAMILIA_EMAIL     opcional — cuenta de familia del portal
                           (default: tutor@demo.jovenesenuk.com).
     E2E_FAMILIA_PASSWORD  opcional — pisa SEED_FAMILIA_PASSWORD.
     E2E_COLEGIO           opcional — nombre del colegio destino base
                           (default: el de COLEGIO_E2E, que crea auth.setup.ts).
     GOOGLE_FORM_WEBHOOK_SECRET  secret del webhook del Google Form (si no
                           está en el entorno se lee de .env.local).
     PW_PORT               opcional — puerto del server bajo prueba (default 3001).

   Precondición: `npm run db:seed:demo` corrido al menos una vez sobre la DB
   apuntada (cuentas test.*, familias demo y dataset [DEMO]). */

/**
 * Colegio destino neutro contra el que se crean los viajes de la suite.
 * `auth.setup.ts` lo garantiza de forma idempotente y el teardown NO lo borra:
 * es infraestructura de los tests, no un dato generado por ellos.
 */
export const COLEGIO_E2E = process.env.E2E_COLEGIO ?? "Colegio E2E Base";

function rand(n = 1e9): number {
  return Math.floor(Math.random() * n);
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ============================================================
   Datos auxiliares: fechas, archivos, secrets
   ============================================================ */

/** YYYY-MM-DD (hora local) a N días de hoy: lo que aceptan los DateInput. */
export function fechaEnDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** YYYY-MM-DD → DD/MM/YYYY, como muestra fechas la app. */
export function ddmmyyyy(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** PDF mínimo válido (magic bytes %PDF) armado en memoria, listo para setInputFiles. */
export function pdfMinimo(nombre: string) {
  return {
    name: nombre,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\ntrailer <<>>\n%%EOF"),
  };
}

/** Secret del webhook del Google Form: del entorno (CI) o de .env.local (dev). */
export function webhookSecret(): string {
  if (process.env.GOOGLE_FORM_WEBHOOK_SECRET) return process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  const env = readFileSync(".env.local", "utf8");
  const valor = env.match(/^GOOGLE_FORM_WEBHOOK_SECRET=(.+)$/m)?.[1];
  if (!valor) throw new Error("GOOGLE_FORM_WEBHOOK_SECRET no configurado");
  return valor.trim().replace(/^"|"$/g, "");
}

/* ============================================================
   Viajes
   ============================================================ */

export function codigoViajeUnico(): string {
  const letras = Array.from({ length: 6 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  return `UK-2099-JUL-${letras}`;
}

/** Crea un viaje y deja la página en su detalle (`/viajes/<codigo>`). Devuelve el código. */
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
    .selectOption({ label: opts?.colegio ?? COLEGIO_E2E });
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

/* ============================================================
   Alumnos
   ============================================================ */

export type AlumnoCreado = { nombre: string; apellido: string; label: string };

/** Lo que devuelve el alta: el DNI es el slug de la ficha (`/alumnos/<dni>`). */
export type AlumnoConDni = AlumnoCreado & { dni: string };

export type DatosAlumno = {
  nombre?: string;
  apellido?: string;
  dni?: string;
  pasaporte?: string;
  fechaNacimiento?: string;
  /** Default lejano (2032-12-31): elegible para cualquier viaje sin advertencias. */
  vencimientoPasaporte?: string;
};

/** Sección del formulario de alumno ("Datos personales", "Tutor 1", …) por su nombre accesible. */
export function seccionFormAlumno(page: Page, titulo: string): Locator {
  return page.getByRole("group", { name: titulo, exact: true });
}

/**
 * Abre /alumnos/nuevo y completa los campos obligatorios SIN guardar (para los
 * specs que prueban validaciones del alta). El email del tutor
 * `tutor-<dni>@example.com` es el patrón que limpia el teardown.
 */
export async function completarAltaAlumno(
  page: Page,
  datos: DatosAlumno = {}
): Promise<AlumnoConDni> {
  const nombre = datos.nombre ?? "Alumno";
  const apellido = datos.apellido ?? `Test${rand(100000)}`;
  const dni = datos.dni ?? String(10000000 + rand(89999999));

  await page.goto("/alumnos/nuevo");

  const personales = seccionFormAlumno(page, "Datos personales");
  await personales.getByLabel("Nombre*", { exact: true }).fill(nombre);
  await personales.getByLabel("Apellido*", { exact: true }).fill(apellido);
  await personales.getByLabel("Fecha de nacimiento*").fill(datos.fechaNacimiento ?? "2008-05-10");
  await personales.getByLabel("DNI*").fill(dni);
  await personales.getByLabel("N° de pasaporte*").fill(datos.pasaporte ?? `AE${100000 + rand(899999)}`);
  await personales
    .getByLabel("Vencimiento del pasaporte*")
    .fill(datos.vencimientoPasaporte ?? "2032-12-31");

  const tutor = seccionFormAlumno(page, "Tutor 1");
  await tutor.getByLabel("Nombre*", { exact: true }).fill("Tutor Uno");
  await tutor.getByLabel("Celular*", { exact: true }).fill("+541199999999");
  await tutor.getByLabel("Email*", { exact: true }).fill(`tutor-${dni}@example.com`);

  return { nombre, apellido, dni, label: `${apellido}, ${nombre}` };
}

/** Crea un alumno (por defecto con pasaporte de vencimiento lejano) y vuelve al listado. */
export async function crearAlumno(page: Page, opts?: DatosAlumno): Promise<AlumnoConDni> {
  const alumno = await completarAltaAlumno(page, opts);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/alumnos$/);
  return alumno;
}

/* ============================================================
   Colegios, prospectos y Group Leaders
   ============================================================ */

export async function crearColegio(page: Page, opts?: { nombre?: string }): Promise<{ nombre: string }> {
  const nombre = opts?.nombre ?? `Colegio E2E ${rand(100000)}`;

  await page.goto("/colegios/nuevo");
  await page.getByLabel("Nombre*", { exact: true }).fill(nombre);
  await page.getByLabel("Ciudad*").fill("Londres");
  const academico = page.getByRole("group", { name: "Académico*" });
  await academico.getByLabel("Nombre").fill("Jane Academic");
  await academico.getByLabel("Email").fill(`acad-${rand()}@example.com`);
  const administrativo = page.getByRole("group", { name: "Administrativo*" });
  await administrativo.getByLabel("Nombre").fill("John Admin");
  await administrativo.getByLabel("Email").fill(`admin-${rand()}@example.com`);
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

/* ============================================================
   Detalle del viaje: paneles, asignación y seguimiento M7
   ============================================================ */

/** Aprieta un botón del modal de confirmación del design system. */
export async function confirmarModal(page: Page, boton: string | RegExp) {
  await page.getByRole("dialog").getByRole("button", { name: boton }).click();
}

/**
 * Panel "Alumnos asignados" del detalle del viaje, por su nombre accesible (la
 * sección se nombra con su heading). No por texto: el estado vacío del panel de
 * pagos también menciona "Alumnos asignados".
 */
export function panelAlumnosAsignados(page: Page): Locator {
  return page.getByRole("region", { name: "Alumnos asignados", exact: true });
}

/** Panel "Group Leaders del viaje" del detalle del viaje. */
export function panelGroupLeaders(page: Page): Locator {
  return page.getByRole("region", { name: "Group Leaders del viaje", exact: true });
}

/**
 * Asigna un alumno desde el detalle del viaje y espera a verlo en el roster.
 * Con `aceptarAdvertencia`, si aparece la advertencia no bloqueante (sobre-cupo,
 * pasaporte) la confirma. Devuelve el link del alumno en el roster.
 */
export async function asignarAlumnoAlViaje(
  page: Page,
  alumno: AlumnoCreado,
  opts?: { aceptarAdvertencia?: boolean }
): Promise<Locator> {
  const panel = panelAlumnosAsignados(page);
  await panel.getByLabel("Alumno a asignar", { exact: true }).selectOption({ label: alumno.label });
  await panel.getByRole("button", { name: "Asignar", exact: true }).click();

  const fila = panel.getByRole("link", { name: alumno.label, exact: true });
  if (opts?.aceptarAdvertencia) {
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.or(fila)).toBeVisible();
    if (await dialogo.isVisible()) await confirmarModal(page, "Asignar igual");
  }
  await expect(fila).toBeVisible();
  return fila;
}

/** Desde el detalle del viaje, abre la ficha del alumno con el link del roster. */
export async function abrirFichaDesdeViaje(page: Page, alumno: AlumnoCreado) {
  await panelAlumnosAsignados(page).getByRole("link", { name: alumno.label, exact: true }).click();
  await page.waitForURL("**/alumnos/**");
}

/**
 * Botón de un paso del tablero M7 ("Pasajes", "Tarjetas de transporte", …). El
 * nombre accesible empieza con el número del paso; se ancla a él porque el botón
 * de Transfers bloqueado también dice "Requiere Pasajes".
 */
export function botonPasoViaje(page: Page, paso: string): Locator {
  return page.getByRole("button", { name: new RegExp(`\\d{2}\\s*${escaparRegex(paso)}`) });
}

/**
 * Selector de estado del paso M7 abierto ("Estado de Pasajes"). Sin `paso`
 * resuelve el del paso que esté abierto (el editor muestra uno a la vez).
 */
export function selectorEstadoPaso(page: Page, paso?: string): Locator {
  return paso
    ? page.getByLabel(`Estado de ${paso}`, { exact: true })
    : page.getByLabel(/^Estado de /);
}

/* ============================================================
   Ficha del alumno: tablero M6 y plan de cuotas
   ============================================================ */

/** Card de un paso M6 por su código (`a1`, `b1`, `paso_0`…). */
export function pasoAlumno(page: Page, codigo: string): Locator {
  return page.locator(`[data-paso="${codigo}"]`);
}

/** Selector de transición de estado de la card (no existe en los pasos derivados, como B1). */
export function selectorEstadoPasoAlumno(page: Page, codigo: string): Locator {
  return pasoAlumno(page, codigo).getByLabel(/^Estado de /);
}

/** Input de archivo de la card (oculto: setInputFiles no exige visibilidad). */
export function adjuntoPasoAlumno(page: Page, codigo: string): Locator {
  return pasoAlumno(page, codigo).getByLabel(/^Adjuntar documento de /);
}

/**
 * Estado visible de un paso M6 ("Pendiente", "Completado", …). La card lo expone
 * como descripción accesible: el mismo texto aparece en su selector, así que un
 * getByText sería ambiguo.
 */
export async function expectEstadoPasoAlumno(page: Page, codigo: string, estado: string) {
  await expect(pasoAlumno(page, codigo), `estado del paso ${codigo}`).toHaveAccessibleDescription(
    estado
  );
}

/** Panel del plan de cuotas en la ficha del alumno. */
export function panelCuotas(page: Page): Locator {
  return page.locator("[data-cuotas-panel]");
}

/** Crea el plan de cuotas desde la ficha y espera a que se muestre el resumen. */
export async function crearPlanCuotas(
  page: Page,
  plan: { cuotas: string; monto: string; primerVencimiento: string }
): Promise<Locator> {
  const panel = panelCuotas(page);
  await panel.getByLabel("Cuotas").fill(plan.cuotas);
  await panel.getByLabel("Monto por cuota").fill(plan.monto);
  await panel.getByLabel("Primer vencimiento").fill(plan.primerVencimiento);
  await panel.getByRole("button", { name: "Crear plan de cuotas" }).click();
  await expect(panel.getByText("Total del plan")).toBeVisible();
  return panel;
}

/**
 * Espera a que React haya hidratado un control antes de interactuar con él.
 *
 * Un control renderizado en el server ya existe (y pasa un toHaveValue) antes
 * de que React le conecte los handlers: un fill o un selectOption en esa
 * ventana deja el valor en el DOM, pero ningún onChange corre y no se guarda
 * nada. Verificado con una sonda sobre la fecha límite de A1 (fill antes de
 * hidratar: no guardó; después: sí). React marca cada nodo que hidrata con sus
 * claves internas __reactFiber / __reactProps.
 */
export async function esperarHidratacion(control: Locator): Promise<void> {
  await expect
    .poll(
      () =>
        control.evaluate((el) =>
          Object.keys(el).some((k) => k.startsWith("__reactFiber") || k.startsWith("__reactProps"))
        ),
      { message: "el control no terminó de hidratarse" }
    )
    .toBe(true);
}
