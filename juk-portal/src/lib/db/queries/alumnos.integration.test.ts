import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Alumno } from "@/lib/db/schema/alumnos";
import { alumnoFiltersSchema } from "@/lib/domain/alumnos";

import { crearFixtures, dia, integracionHabilitada } from "../../../../tests/integration/fixtures";

type ListAlumnos = (typeof import("./alumnos"))["listAlumnos"];

/*
 * El filtro por canal de alta del listado (US-17 + Application Form propio):
 * "los que entraron por el formulario" tiene que salir de la condición SQL, no
 * de filtrar la página en memoria.
 *
 * La base puede tener alumnos reales del dueño: cada caso se acota con `q` al
 * prefijo de DNI de la corrida, que es lo único que crea este archivo.
 */

const fx = crearFixtures("ALUCAN");
const PREFIJO_DNI = `INT-${fx.corrida}-`;
const NACIMIENTO = dia("2011-04-12");
const PAGINA = { page: 1, size: 50 };

describe.skipIf(!integracionHabilitada)("listAlumnos: filtro por canal de alta", () => {
  let listAlumnos: ListAlumnos;
  let porFormulario: Alumno;
  let porWebhook: Alumno;
  let manual: Alumno;

  const filtros = (valores: Record<string, unknown>) =>
    alumnoFiltersSchema.parse({ q: PREFIJO_DNI, ...valores });

  beforeAll(async () => {
    await fx.iniciar();
    ({ listAlumnos } = await import("./alumnos"));

    porFormulario = await fx.alumno({ fechaNacimiento: NACIMIENTO, canalAlta: "formulario_web" });
    porWebhook = await fx.alumno({ fechaNacimiento: NACIMIENTO, canalAlta: "webhook" });
    manual = await fx.alumno({ fechaNacimiento: NACIMIENTO, canalAlta: "alta_manual" });
  });

  afterAll(async () => {
    await fx.limpiar();
  });

  async function ids(valores: Record<string, unknown>) {
    const { items, total } = await listAlumnos(filtros(valores), PAGINA);
    expect(total).toBe(items.length);
    return items.map((a) => a.id).sort();
  }

  it("devuelve solo los del canal pedido", async () => {
    expect(await ids({ canalAlta: "formulario_web" })).toEqual([porFormulario.id]);
    expect(await ids({ canalAlta: "webhook" })).toEqual([porWebhook.id]);
    expect(await ids({ canalAlta: "alta_manual" })).toEqual([manual.id]);
  });

  it("sin el filtro devuelve los tres canales", async () => {
    expect(await ids({})).toEqual([porFormulario.id, porWebhook.id, manual.id].sort());
  });

  it("un canal inexistente en la URL se descarta y no rompe la consulta", async () => {
    // El filtro llega de la URL: `alumnoFiltersSchema` lo tira solo, así que la
    // query nunca ve un valor que el ENUM `canal_alta` rechazaría.
    expect(filtros({ canalAlta: "telegrama" }).canalAlta).toBeUndefined();
    expect(await ids({ canalAlta: "telegrama" })).toEqual(
      [porFormulario.id, porWebhook.id, manual.id].sort()
    );
  });

  it("se cruza con los otros filtros en la misma consulta", async () => {
    expect(await ids({ canalAlta: "formulario_web", estado: "pre_inscripto" })).toEqual([
      porFormulario.id,
    ]);
    expect(await ids({ canalAlta: "formulario_web", estado: "activo" })).toEqual([]);
    expect(await ids({ canalAlta: "formulario_web", alerta: "pasos_bloqueados" })).toEqual([]);
  });

  it("los tres siguen estando cuando el listado no filtra por nada", async () => {
    const { items } = await listAlumnos(alumnoFiltersSchema.parse({}), { page: 1, size: 1000 });
    const presentes = new Set(items.map((a) => a.id));
    for (const alumno of [porFormulario, porWebhook, manual]) {
      expect(presentes.has(alumno.id), alumno.dni).toBe(true);
    }
  });
});
