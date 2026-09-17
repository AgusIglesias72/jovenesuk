import { asc, inArray } from "drizzle-orm";
import { test, expect, type Page } from "@playwright/test";

import { db } from "../../src/lib/db";
import { inscripciones, viajes, type NewInscripcion } from "../../src/lib/db/schema";
import { codigoInscripcion } from "../../src/lib/domain/inscripciones/schema";
import {
  TEXTO_CONSENTIMIENTO,
  VERSION_CONSENTIMIENTO,
} from "../../src/lib/domain/privacidad/politica";
import { formatearDni } from "../../src/lib/utils/dni";
import { hashTexto } from "../../src/lib/utils/hash-texto";

import { ocultarOverlayDeDev } from "./helpers";
import { sufijoUnico } from "./helpers-flujos";

/*
 * Bandeja de inscripciones del back-office (/inscripciones).
 *
 * Las fichas se insertan DIRECTO en la base, con la misma forma que les da la
 * server action del formulario público: mandarlas por el form compartiría la
 * ventana de anti-abuso por IP con el spec del formulario, y acá lo que se
 * prueba es el lado del equipo (listar, contar, filtrar, paginar y leer la
 * ficha completa).
 *
 * El teardown global no conoce esta tabla todavía, así que el afterAll borra
 * las filas por id. El viaje que se referencia sale del seed y NO se toca: solo
 * se lo apunta con una FK que muere con la fila.
 */

const creadas: string[] = [];

test.afterAll(async () => {
  if (creadas.length > 0) {
    await db.delete(inscripciones).where(inArray(inscripciones.id, creadas));
  }
});

/** DNI de test: 8 dígitos que arrancan en 99 (rango que no usan los DNIs reales). */
function dniDeTest(): string {
  return `99${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`;
}

function ficha(sufijo: string, extra: Partial<NewInscripcion> = {}): NewInscripcion {
  return {
    nombre: "Ficha",
    apellido: `E2E ${sufijo}`,
    fechaNacimiento: "2011-04-04",
    dni: dniDeTest(),
    numeroPasaporte: `FX${sufijo}`,
    fechaVencimientoPasaporte: "2034-01-01",
    tutor1Nombre: "Tutora E2E",
    tutor1Celular: "+54 9 11 5555-0000",
    tutor1Email: `e2e+ins-${sufijo.toLowerCase()}@e2e.example.com`,
    consentimientoVersion: VERSION_CONSENTIMIENTO,
    consentimientoTextoHash: hashTexto(TEXTO_CONSENTIMIENTO),
    consentimientoEl: new Date(),
    ...extra,
  };
}

type FichaCreada = { id: string; numero: number | null; dni: string };

async function insertar(filas: NewInscripcion[]): Promise<FichaCreada[]> {
  const nuevas = await db
    .insert(inscripciones)
    .values(filas)
    .returning({ id: inscripciones.id, numero: inscripciones.numero, dni: inscripciones.dni });
  creadas.push(...nuevas.map((f) => f.id));
  return nuevas;
}

function numeroDe(fila: FichaCreada): number {
  if (fila.numero === null) throw new Error("la inscripción se insertó sin número");
  return fila.numero;
}

function codigoDe(fila: FichaCreada): string {
  return codigoInscripcion(numeroDe(fila));
}

/** Un viaje del seed para el contexto de campaña. No se modifica: solo se apunta. */
async function viajeDelSeed() {
  const [viaje] = await db
    .select({ id: viajes.id, codigo: viajes.codigo })
    .from(viajes)
    .orderBy(asc(viajes.codigo))
    .limit(1);
  if (!viaje) throw new Error("No hay viajes en la base: corré npm run db:seed:demo");
  return viaje;
}

/** Abre la bandeja filtrada por el apellido del spec (aísla la corrida). */
async function abrirBandeja(page: Page, sufijo: string, extra = "") {
  await page.goto(
    `/inscripciones?q=${encodeURIComponent(`E2E ${sufijo}`)}${extra}`
  );
}

/** StatCard del resumen: la card entera es un link al listado ya filtrado. */
function card(page: Page, label: string) {
  return page.getByRole("link").filter({ hasText: label });
}

test("la bandeja lista las fichas, cuenta por estado y por variante, y filtra", async ({
  page,
}) => {
  const sufijo = sufijoUnico();
  const viaje = await viajeDelSeed();

  const [recibida, revision] = await insertar([
    ficha(sufijo, { estado: "recibida", variante: "a", viajeId: viaje.id }),
    ficha(sufijo, {
      estado: "requiere_revision",
      variante: "b",
      motivo: `Llegó sin invitación ${sufijo}`,
    }),
    ficha(sufijo, { estado: "procesada", variante: "c" }),
  ]);
  if (!recibida || !revision) throw new Error("no se insertaron las fichas del test");

  await abrirBandeja(page, sufijo);

  const filas = page.getByRole("row").filter({ hasText: `E2E ${sufijo}` });
  await expect(filas).toHaveCount(3);

  // El resumen se agrega en SQL sobre el universo filtrado (acá, la q del spec):
  // si contara la página visible, estos números cambiarían al paginar.
  await expect(card(page, "Total de fichas")).toContainText(/Total de fichas\s*3/);
  await expect(card(page, "Necesitan revisión")).toContainText(/Necesitan revisión\s*1/);
  await expect(card(page, "Procesadas")).toContainText(/Procesadas\s*1/);
  for (const variante of ["Variante A", "Variante B", "Variante C"]) {
    await expect(card(page, variante)).toContainText(new RegExp(`${variante}\\s*1`));
  }

  // La fila trae el código público, el viaje y el DNI ENMASCARADO: el listado es
  // lo que más veces está abierto en pantalla, y el DNI entero se ve recién en
  // el detalle, que se abre a propósito.
  const filaRecibida = page.getByRole("row").filter({ hasText: codigoDe(recibida) });
  await expect(filaRecibida).toContainText("Recibida");
  await expect(filaRecibida).toContainText(viaje.codigo);
  await expect(filaRecibida).toContainText(recibida.dni.slice(-4));
  await expect(filaRecibida).not.toContainText(recibida.dni);

  // Filtrar por estado deja una sola ficha, con su motivo a la vista.
  await abrirBandeja(page, sufijo, "&estado=requiere_revision");
  await expect(page.getByRole("row").filter({ hasText: `E2E ${sufijo}` })).toHaveCount(1);
  const filaRevision = page.getByRole("row").filter({ hasText: codigoDe(revision) });
  await expect(filaRevision).toContainText("Necesita revisión");
  await expect(filaRevision).toContainText(`Llegó sin invitación ${sufijo}`);

  // Un estado sin fichas cae en el vacío de "sin resultados", no en una tabla muda.
  await abrirBandeja(page, sufijo, "&estado=anulada");
  await expect(page.getByText("Sin resultados para estos filtros")).toBeVisible();
});

test("la bandeja pagina en SQL: 51 fichas entran en dos páginas sin repetir ninguna", async ({
  page,
}) => {
  const sufijo = sufijoUnico();
  // 51 = PAGE_SIZE + 1: la página 2 prueba el OFFSET y, con el desempate por
  // `numero`, que ninguna fila se repita ni se saltee entre páginas.
  const nuevas = await insertar(
    Array.from({ length: 51 }, () => ficha(sufijo, { estado: "procesada" }))
  );

  await abrirBandeja(page, sufijo);
  const filas = page.getByRole("row").filter({ hasText: `E2E ${sufijo}` });
  await expect(filas).toHaveCount(50);

  const paginacion = page.getByRole("navigation", { name: "Paginación" });
  await expect(paginacion).toContainText("1–50");
  await expect(paginacion).toContainText("51");

  await paginacion.getByRole("button", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(filas).toHaveCount(1);

  // La que queda sola en la página 2 es la del `numero` más chico: las 51 filas
  // comparten `created_at` (un solo INSERT), así que el orden lo define el
  // desempate. Sin él, LIMIT/OFFSET repetiría o saltearía fichas entre páginas.
  const masVieja = nuevas.reduce((min, f) => (numeroDe(f) < numeroDe(min) ? f : min));
  await expect(page.getByRole("row").filter({ hasText: codigoDe(masVieja) })).toBeVisible();
});

test("el detalle abre por código y muestra la ficha completa, con su consentimiento", async ({
  page,
}) => {
  const sufijo = sufijoUnico();
  const viaje = await viajeDelSeed();
  const alergias = `Alergia al maní y asma leve (E2E ${sufijo})`;

  const [fila] = await insertar([
    ficha(sufijo, {
      estado: "requiere_revision",
      variante: "b",
      viajeId: viaje.id,
      motivo: `Llegó sin invitación ${sufijo}`,
      alergiasSalud: alergias,
      telefonoAlumno: "11 4444-3333",
      emailAlumno: `e2e+alumno-${sufijo.toLowerCase()}@e2e.example.com`,
      preferenciasAlojamiento: "Prefiere casa sin mascotas",
      nivelInglesAutoevaluacion: "Intermedio",
    }),
  ]);
  if (!fila) throw new Error("no se insertó la ficha del test");
  const codigo = codigoDe(fila);

  await page.goto(`/inscripciones/${codigo}`);

  await expect(page.getByRole("heading", { name: `Ficha E2E ${sufijo}`, level: 1 })).toBeVisible();
  // El código aparece tres veces a propósito (el breadcrumb, que además tiene
  // una copia que se esconde según el ancho, y el chip del encabezado). Se
  // verifica el que la persona ve, no "alguno": con `.first()` el test se
  // colgaba de la copia oculta.
  await expect(page.getByText(codigo).filter({ visible: true }).first()).toBeVisible();

  // Back-office con sesión: acá SÍ se ven los datos de Nivel 2, enteros. Es lo
  // que el equipo necesita para decidir qué hacer con la ficha.
  const alumno = page.getByRole("region", { name: "Ficha del alumno" });
  await expect(alumno).toContainText(formatearDni(fila.dni));
  await expect(alumno).toContainText("04/04/2011");
  await expect(alumno).toContainText(`FX${sufijo}`);
  await expect(page.getByRole("region", { name: "Lo que contó la familia" })).toContainText(
    alergias
  );

  // Estado con su motivo, y el lugar donde van a ir las acciones de la etapa 4.
  const estado = page.getByRole("region", { name: "Estado" });
  await expect(estado).toContainText("Necesita revisión");
  await expect(estado).toContainText(`Llegó sin invitación ${sufijo}`);
  await expect(estado).toContainText("Las acciones llegan con el alta automática");

  // Contexto de campaña: el viaje sale del token, no del formulario.
  const origen = page.getByRole("region", { name: "Origen y campaña" });
  await expect(origen).toContainText("Sin invitación");
  await expect(origen.getByRole("link", { name: new RegExp(viaje.codigo) })).toHaveAttribute(
    "href",
    `/viajes/${viaje.codigo}`
  );

  // El sello del consentimiento linkea a ESA versión de la política.
  const consentimiento = page.getByRole("region", { name: "Consentimiento" });
  await expect(
    consentimiento.getByRole("link", { name: `Política de Privacidad ${VERSION_CONSENTIMIENTO}` })
  ).toHaveAttribute("href", `/privacidad/${VERSION_CONSENTIMIENTO}`);
  await expect(consentimiento).toContainText(hashTexto(TEXTO_CONSENTIMIENTO));

  // Y desde la bandeja se llega con el botón de la fila.
  await abrirBandeja(page, sufijo);
  await page.getByRole("row").filter({ hasText: codigo }).getByRole("link", { name: "Ver" }).click();
  await page.waitForURL(`**/inscripciones/${codigo}`);
});

test("un código que no existe muestra el 404 del back-office", async ({ page }) => {
  await page.goto("/inscripciones/INS-000000000");
  await expect(page.getByRole("heading", { name: "No encontramos eso" })).toBeVisible();

  // Y uno que ni siquiera tiene forma de código tampoco rompe la pantalla.
  await page.goto("/inscripciones/no-es-un-codigo");
  await expect(page.getByRole("heading", { name: "No encontramos eso" })).toBeVisible();
});

test("@mobile la bandeja se lee como tarjetas y 'Ver' es tapeable", async ({ page }) => {
  const sufijo = sufijoUnico();
  const [fila] = await insertar([ficha(sufijo, { estado: "recibida", variante: "a" })]);
  if (!fila) throw new Error("no se insertó la ficha del test");

  await abrirBandeja(page, sufijo);

  const tarjeta = page.getByRole("row").filter({ hasText: codigoDe(fila) });
  await expect(tarjeta).toBeVisible();

  // Modo card: cada celda anuncia su rótulo dentro de la propia fila.
  for (const rotulo of ["Código", "Alumno", "Viaje", "Estado"]) {
    await expect(tarjeta.getByText(rotulo, { exact: true })).toBeVisible();
  }

  const ver = tarjeta.getByRole("link", { name: "Ver" });
  await expect(ver).toBeVisible();
  const caja = await ver.boundingBox();
  if (!caja) throw new Error("el botón Ver no tiene caja: no está renderizado");
  const ancho = page.viewportSize()?.width ?? 0;
  expect(caja.x).toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width).toBeLessThanOrEqual(ancho);
  expect(caja.height).toBeGreaterThanOrEqual(40);

  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(desborda, "la bandeja no debe scrollear horizontalmente").toBe(false);

  await ocultarOverlayDeDev(page);
  await ver.click();
  await page.waitForURL(`**/inscripciones/${codigoDe(fila)}`);
});
