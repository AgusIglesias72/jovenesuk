import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Del barril y no de `schema/inscripciones` directo: ese módulo y
// `schema/prospectos` se importan mutuamente, y `prospectos` llama a
// `varianteFormulario()` al evaluarse. Entrar por `inscripciones` deja el enum
// sin definir ("varianteFormulario is not a function"); el barril los carga en
// un orden que funciona. Las queries no lo sufren porque importan `@/lib/db`
// —que evalúa el barril— antes que cualquier tabla.
import { inscripciones, type Inscripcion, type NewInscripcion } from "@/lib/db/schema";
import {
  CAMPOS_NIVEL_1,
  CAMPOS_NIVEL_2,
  type CampoInscripcion,
} from "@/lib/domain/inscripciones/niveles";
import {
  codigoInscripcion,
  inscripcionFiltersSchema,
  type InscripcionEstado,
  type Variante,
} from "@/lib/domain/inscripciones/schema";
import {
  TEXTO_CONSENTIMIENTO,
  VERSION_CONSENTIMIENTO,
} from "@/lib/domain/privacidad/politica";
import { hashTexto } from "@/lib/utils/hash-texto";

import { crearFixtures, dia, integracionHabilitada } from "../../../../tests/integration/fixtures";

type InscripcionesQ = typeof import("./inscripciones");

/*
 * La bandeja del back-office contra Postgres: paginación con empate de
 * `created_at`, filtros y los conteos agregados en SQL.
 *
 * Las fichas se insertan directo (no por `crearInscripcion`) para poder fijar
 * `created_at` a mano: el caso que importa es justamente el de varias fichas
 * con el MISMO instante, que es lo que pasa cuando una tanda de invitaciones se
 * responde junta. Se borran antes de `fx.limpiar()` porque `viaje_id` no
 * cascadea.
 */

const fx = crearFixtures("INSBO");
const PREFIJO = `[INT] ${fx.corrida} `;
const EMAIL = `int+${fx.corrida.toLowerCase()}-bandeja@int.jovenesenuk.com`;

/**
 * Documentos de nueve dígitos SIN ningún cero, con una base aleatoria por
 * corrida: el índice único parcial de DNI es global sobre las fichas vivas (dos
 * corridas no pueden compartir documento) y la búsqueda por código
 * ("INS-000123" → dígitos "000123") no puede cruzarse con un DNI de la corrida.
 */
const BASE_DNI = Array.from({ length: 6 }, () => 1 + Math.floor(Math.random() * 9)).join("");
let secuenciaDni = 110;
const proximoDni = () => `${BASE_DNI}${(secuenciaDni += 1)}`;

/** Tres instantes: el del medio lo comparten cinco fichas. */
const T_VIEJO = new Date("2026-09-08T09:00:00.000Z");
const T_EMPATE = new Date("2026-09-10T12:00:00.000Z");
const T_NUEVO = new Date("2026-09-12T18:30:00.000Z");

const APELLIDO_BUSCABLE = "Zarrandia";

describe.skipIf(!integracionHabilitada)(
  "bandeja de inscripciones (listInscripciones / getInscripcionByNumero / resumenInscripciones) contra Postgres",
  () => {
    let q: InscripcionesQ;
    let viajeA: { id: string; codigo: string };
    let viajeB: { id: string };
    let viajeC: { id: string };
    let filas: Inscripcion[];
    let deA: Inscripcion[];
    let borrada: Inscripcion;
    /** Las dos del viaje C, reservadas para el borrado a pedido. */
    let aBorrar: Inscripcion;
    let testigo: Inscripcion;

    const filtros = (valores: Record<string, unknown>) => inscripcionFiltersSchema.parse(valores);

    type FilaOpts = {
      estado: InscripcionEstado;
      variante: Variante;
      createdAt: Date;
      viajeId: string | null;
      apellido?: string;
      borradoEl?: Date;
      alergiasSalud?: string;
    };

    function fila(n: number, opts: FilaOpts): NewInscripcion {
      return {
        nombre: `${PREFIJO}Nombre ${n}`,
        apellido: `${PREFIJO}${opts.apellido ?? `Apellido ${n}`}`,
        fechaNacimiento: "2010-05-04",
        dni: proximoDni(),
        numeroPasaporte: `INTP${n}`,
        fechaVencimientoPasaporte: "2035-01-01",
        tutor1Nombre: `${PREFIJO}Tutor ${n}`,
        tutor1Celular: "+540000000000",
        tutor1Email: EMAIL,
        alergiasSalud: opts.alergiasSalud ?? null,
        estado: opts.estado,
        variante: opts.variante,
        viajeId: opts.viajeId,
        createdAt: opts.createdAt,
        borradoEl: opts.borradoEl ?? null,
        consentimientoVersion: VERSION_CONSENTIMIENTO,
        consentimientoTextoHash: hashTexto(TEXTO_CONSENTIMIENTO),
        consentimientoEl: opts.createdAt,
      };
    }

    beforeAll(async () => {
      await fx.iniciar();
      q = await import("./inscripciones");

      const colegio = await fx.colegio();
      viajeA = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: dia("2031-07-01") });
      viajeB = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: dia("2031-08-01") });
      // El viaje C existe para que el borrado a pedido no le mueva los conteos a
      // nadie: los casos de arriba fijan totales exactos sobre A y B.
      viajeC = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: dia("2031-09-01") });

      const A = viajeA.id;
      filas = await fx
        .db()
        .insert(inscripciones)
        .values([
          // Las cinco del empate: mismo created_at exacto.
          fila(1, {
            estado: "recibida",
            variante: "a",
            createdAt: T_EMPATE,
            viajeId: A,
            apellido: APELLIDO_BUSCABLE,
            alergiasSalud: "[INT] alergia al maní",
          }),
          fila(2, { estado: "recibida", variante: "b", createdAt: T_EMPATE, viajeId: A }),
          fila(3, { estado: "recibida", variante: "c", createdAt: T_EMPATE, viajeId: A }),
          fila(4, { estado: "requiere_revision", variante: "a", createdAt: T_EMPATE, viajeId: A }),
          fila(5, { estado: "requiere_revision", variante: "b", createdAt: T_EMPATE, viajeId: A }),
          // Las tres de los otros dos instantes.
          fila(6, { estado: "procesada", variante: "c", createdAt: T_NUEVO, viajeId: A }),
          fila(7, { estado: "error", variante: "a", createdAt: T_VIEJO, viajeId: A }),
          fila(8, { estado: "anulada", variante: "b", createdAt: T_VIEJO, viajeId: A }),
          // Borrada por privacidad: no se lista ni suma en los conteos.
          fila(9, {
            estado: "recibida",
            variante: "a",
            createdAt: T_NUEVO,
            viajeId: A,
            borradoEl: new Date("2026-09-13T10:00:00.000Z"),
          }),
          // Otro viaje: el universo de los conteos no se le puede escapar.
          fila(10, { estado: "recibida", variante: "a", createdAt: T_NUEVO, viajeId: viajeB.id }),
          fila(11, { estado: "duplicada", variante: "c", createdAt: T_EMPATE, viajeId: viajeB.id }),
          // Las dos del viaje C. La 12 se borra a pedido y viene con TODOS los
          // campos opcionales completos: un campo que llega vacío no prueba nada
          // sobre si el borrado lo vacía.
          {
            ...fila(12, {
              estado: "recibida",
              variante: "b",
              createdAt: T_NUEVO,
              viajeId: viajeC.id,
              alergiasSalud: "[INT] celiaquía y asma",
            }),
            telefonoAlumno: "+5491133334444",
            emailAlumno: `int+${fx.corrida.toLowerCase()}-alumno12@int.jovenesenuk.com`,
            preferenciasAlojamiento: "[INT] casa sin gatos, comparte con una amiga",
            nivelInglesAutoevaluacion: "[INT] intermedio",
          },
          // La testigo: el borrado de al lado no la puede tocar.
          {
            ...fila(13, {
              estado: "recibida",
              variante: "c",
              createdAt: T_NUEVO,
              viajeId: viajeC.id,
              alergiasSalud: "[INT] ninguna",
            }),
            telefonoAlumno: "+5491155556666",
          },
        ])
        .returning();

      const propia = (n: number) => {
        const row = filas.find((f) => f.nombre === `${PREFIJO}Nombre ${n}`);
        if (!row) throw new Error(`falta la fila ${n}`);
        return row;
      };
      deA = [1, 2, 3, 4, 5, 6, 7, 8].map(propia);
      borrada = propia(9);
      aBorrar = propia(12);
      testigo = propia(13);
    });

    afterAll(async () => {
      // Por id y no por el prefijo del nombre: el borrado a pedido deja el
      // nombre en "", y una fila que el cleanup no encuentra bloquea el DELETE
      // del viaje (viaje_id no cascadea).
      if (filas?.length) {
        await fx.db().delete(inscripciones).where(
          inArray(
            inscripciones.id,
            filas.map((f) => f.id)
          )
        );
      }
      await fx.limpiar();
    });

    async function todasLasPaginas(size: number, valores: Record<string, unknown>) {
      const primera = await q.listInscripciones(filtros(valores), { page: 1, size });
      const items = [...primera.items];
      for (let page = 2; page <= primera.pages; page++) {
        const p = await q.listInscripciones(filtros(valores), { page, size });
        expect(p.total).toBe(primera.total);
        items.push(...p.items);
      }
      return { total: primera.total, pages: primera.pages, items };
    }

    it.each([1, 2, 3, 5, 50])(
      "paginar de a %i recorre cada ficha exactamente una vez: cinco fichas con el mismo created_at no se repiten ni se saltean",
      async (size) => {
        const { total, pages, items } = await todasLasPaginas(size, { viajeId: viajeA.id });

        expect(total).toBe(deA.length);
        expect(pages).toBe(Math.ceil(deA.length / size));
        expect(items).toHaveLength(deA.length);
        expect(new Set(items.map((i) => i.id)).size).toBe(deA.length);
        expect(items.map((i) => i.id).sort()).toEqual(deA.map((i) => i.id).sort());

        // El orden es el mismo sin importar el tamaño de página, y es el que
        // pide el contrato: lo último arriba, con `numero` como desempate y
        // TAMBIÉN descendente — dentro del mismo instante, la última cargada es
        // la de número más alto, así que ascendente daría vuelta el criterio
        // justo en el caso que el desempate viene a resolver.
        const claves = items.map((i) => `${i.createdAt.toISOString()}#${i.numero}`);
        expect(claves).toEqual(
          [...claves].sort((x, y) => {
            const [fechaX = "", numX = ""] = x.split("#");
            const [fechaY = "", numY = ""] = y.split("#");
            if (fechaX !== fechaY) return fechaY.localeCompare(fechaX);
            return Number(numY) - Number(numX);
          })
        );
      }
    );

    it("la ficha borrada no aparece nunca, y una página fuera de rango devuelve la última real", async () => {
      const { items } = await todasLasPaginas(50, { viajeId: viajeA.id });
      expect(items.some((i) => i.id === borrada.id)).toBe(false);
      expect(await q.getInscripcionByNumero(borrada.numero)).toBeNull();

      const ultima = await q.listInscripciones(filtros({ viajeId: viajeA.id }), { page: 4, size: 2 });
      const fuera = await q.listInscripciones(filtros({ viajeId: viajeA.id }), { page: 99, size: 2 });
      expect(fuera).toMatchObject({ page: 4, pages: 4, total: 8 });
      expect(fuera.items.map((i) => i.id)).toEqual(ultima.items.map((i) => i.id));
    });

    it("filtra por estado, por variante y por viaje sobre el universo, no sobre la página", async () => {
      const recibidas = await todasLasPaginas(2, { viajeId: viajeA.id, estado: "recibida" });
      expect(recibidas.total).toBe(3);
      expect(recibidas.items.every((i) => i.estado === "recibida")).toBe(true);

      const variante = await todasLasPaginas(50, { viajeId: viajeA.id, variante: "b" });
      expect(variante.items.map((i) => i.nombre).sort()).toEqual([
        `${PREFIJO}Nombre 2`,
        `${PREFIJO}Nombre 5`,
        `${PREFIJO}Nombre 8`,
      ]);

      const delB = await todasLasPaginas(50, { viajeId: viajeB.id });
      expect(delB.total).toBe(2);

      const cruce = await todasLasPaginas(50, {
        viajeId: viajeA.id,
        estado: "requiere_revision",
        variante: "a",
      });
      expect(cruce.items.map((i) => i.nombre)).toEqual([`${PREFIJO}Nombre 4`]);
    });

    it("busca por apellido, por DNI con puntos y por el código INS-000123", async () => {
      const ficha1 = deA[0]!;

      const porApellido = await todasLasPaginas(50, {
        viajeId: viajeA.id,
        q: APELLIDO_BUSCABLE.toLowerCase(),
      });
      expect(porApellido.items.map((i) => i.id)).toEqual([ficha1.id]);

      // El equipo tipea el documento como lo lee: con puntos.
      const conPuntos = ficha1.dni.replace(/(\d{3})(?=\d)/g, "$1.");
      expect(conPuntos).toContain(".");
      const porDni = await todasLasPaginas(50, { viajeId: viajeA.id, q: conPuntos });
      expect(porDni.items.map((i) => i.id)).toEqual([ficha1.id]);

      const porCodigo = await todasLasPaginas(50, {
        viajeId: viajeA.id,
        q: codigoInscripcion(deA[5]!.numero),
      });
      expect(porCodigo.items.map((i) => i.id)).toEqual([deA[5]!.id]);

      const sinResultados = await todasLasPaginas(50, {
        viajeId: viajeA.id,
        q: "no-existe-este-apellido",
      });
      expect(sinResultados).toMatchObject({ total: 0, pages: 1, items: [] });
    });

    it("el detalle sale por el correlativo del código y trae los datos que la lista no mueve", async () => {
      const ficha1 = deA[0]!;
      const detalle = await q.getInscripcionByNumero(ficha1.numero);

      expect(detalle).toMatchObject({
        id: ficha1.id,
        dni: ficha1.dni,
        // Nivel 2: el listado no lo selecciona, el detalle sí.
        alergiasSalud: "[INT] alergia al maní",
        numeroPasaporte: ficha1.numeroPasaporte,
        consentimientoVersion: VERSION_CONSENTIMIENTO,
        viajeCodigo: viajeA.codigo,
      });
      expect(codigoInscripcion(detalle!.numero)).toMatch(/^INS-\d{6,}$/);

      expect(await q.getInscripcionByNumero(2_000_000_000)).toBeNull();
    });

    it("el resumen agrega sobre el universo filtrado, no sobre la página visible", async () => {
      const resumen = await q.resumenInscripciones(filtros({ viajeId: viajeA.id }));

      expect(resumen).toEqual({
        total: 8,
        porEstado: {
          recibida: 3,
          procesada: 1,
          duplicada: 0,
          requiere_revision: 2,
          error: 1,
          anulada: 1,
        },
        porVariante: { a: 3, b: 3, c: 2 },
      });

      // La página trae 2 de 8 y el resumen no se entera: es el punto de
      // agregarlo en SQL.
      const pagina = await q.listInscripciones(filtros({ viajeId: viajeA.id }), {
        page: 1,
        size: 2,
      });
      expect(pagina.items).toHaveLength(2);
      expect(pagina.total).toBe(resumen.total);

      const { items } = await todasLasPaginas(2, { viajeId: viajeA.id });
      for (const estado of Object.keys(resumen.porEstado) as InscripcionEstado[]) {
        expect(resumen.porEstado[estado], estado).toBe(
          items.filter((i) => i.estado === estado).length
        );
      }
      for (const variante of Object.keys(resumen.porVariante) as Variante[]) {
        expect(resumen.porVariante[variante], variante).toBe(
          items.filter((i) => i.variante === variante).length
        );
      }
    });

    it("el resumen respeta variante, viaje y búsqueda, y deja fuera la ficha borrada", async () => {
      const soloB = await q.resumenInscripciones(filtros({ viajeId: viajeA.id, variante: "b" }));
      expect(soloB).toEqual({
        total: 3,
        porEstado: {
          recibida: 1,
          procesada: 0,
          duplicada: 0,
          requiere_revision: 1,
          error: 0,
          anulada: 1,
        },
        porVariante: { a: 0, b: 3, c: 0 },
      });

      const delB = await q.resumenInscripciones(filtros({ viajeId: viajeB.id }));
      expect(delB.total).toBe(2);
      expect(delB.porEstado.recibida).toBe(1);
      expect(delB.porEstado.duplicada).toBe(1);

      const porBusqueda = await q.resumenInscripciones(
        filtros({ viajeId: viajeA.id, q: APELLIDO_BUSCABLE })
      );
      expect(porBusqueda.total).toBe(1);

      // La borrada es la única `recibida` con ese created_at en el viaje A:
      // si entrara en los conteos, el total del filtro daría 4.
      const recibidasDelA = await q.resumenInscripciones(filtros({ viajeId: viajeA.id }));
      expect(recibidasDelA.porEstado.recibida).toBe(3);
    });

    /*
     * El borrado a pedido: lo que la Política de Privacidad promete cumplir.
     *
     * Corre sobre el viaje C y en este orden: los casos de arriba fijan totales
     * exactos sobre A y B, y el último caso de acá borra también la testigo.
     */
    describe("borrado a pedido (anonimizarInscripcion)", () => {
      const USUARIO_BORRA = "dddddddd-0000-4000-8000-000000000001";
      const OTRO_USUARIO = "dddddddd-0000-4000-8000-000000000002";
      const MOTIVO = "[INT] La familia pidió el borrado por mail el 12/09.";

      /** Los campos del formulario que SÍ son columnas de la ficha. */
      const CLASIFICADOS: readonly CampoInscripcion[] = [...CAMPOS_NIVEL_1, ...CAMPOS_NIVEL_2];
      const SIN_COLUMNA: readonly string[] = ["acepta", "website"];
      const PERSONALES = CLASIFICADOS.filter((campo) => !SIN_COLUMNA.includes(campo));

      /** La fila cruda: el borrado la saca de la bandeja, no de la tabla. */
      async function leerCruda(id: string): Promise<Inscripcion> {
        const [row] = await fx
          .db()
          .select()
          .from(inscripciones)
          .where(eq(inscripciones.id, id));
        if (!row) throw new Error("la ficha borrada desapareció de la tabla");
        return row;
      }

      let despues: Inscripcion;
      let ejecutado: boolean;

      beforeAll(async () => {
        ejecutado = await q.anonimizarInscripcion(aBorrar.id, {
          usuarioId: USUARIO_BORRA,
          motivo: MOTIVO,
        });
        despues = await leerCruda(aBorrar.id);
      });

      it("no queda ningún dato personal: se revisa cada campo del formulario, no uno elegido a dedo", () => {
        expect(ejecutado).toBe(true);

        // La lista sale del dominio (`niveles.ts`), así que un campo nuevo del
        // formulario entra solo a este test y tiene que aparecer vacío igual.
        // Los dos que no son columnas se nombran acá para que sumar un tercero
        // sea una decisión y no un descuido.
        expect(PERSONALES).toHaveLength(CLASIFICADOS.length - 2);

        const vacios: unknown[] = [null, "", "1900-01-01", `borrado-${aBorrar.id}`];
        for (const campo of PERSONALES) {
          const clave = campo as keyof Inscripcion;
          expect(aBorrar[clave], `${campo}: el fixture tiene que traerlo cargado`).toBeTruthy();
          expect(despues[clave], campo).not.toBe(aBorrar[clave]);
          expect(vacios, campo).toContain(despues[clave]);
        }

        // Y ningún valor original sobrevive mudado a otra columna.
        const rastro = JSON.stringify(despues);
        for (const campo of PERSONALES) {
          expect(rastro, campo).not.toContain(String(aBorrar[campo as keyof Inscripcion]));
        }
      });

      it("el talón queda intacto y el borrado queda sellado", () => {
        expect(despues).toMatchObject({
          id: aBorrar.id,
          numero: aBorrar.numero,
          estado: "recibida",
          variante: "b",
          viajeId: viajeC.id,
          comunicacionId: aBorrar.comunicacionId,
          // El consentimiento no se toca: es la prueba de a qué aceptó esa
          // familia, y sin él no se puede demostrar que el borrado correspondía.
          consentimientoVersion: aBorrar.consentimientoVersion,
          consentimientoTextoHash: aBorrar.consentimientoTextoHash,
          borradoPor: USUARIO_BORRA,
          motivoBorrado: MOTIVO,
        });
        expect(despues.createdAt.toISOString()).toBe(aBorrar.createdAt.toISOString());
        expect(despues.consentimientoEl.toISOString()).toBe(
          aBorrar.consentimientoEl.toISOString()
        );

        // Los datos personales se vaciaron en el mismo acto del borrado: la
        // retención no tiene nada que purgar después.
        expect(despues.borradoEl).toBeInstanceOf(Date);
        expect(despues.datosPurgadosEl?.toISOString()).toBe(despues.borradoEl?.toISOString());
      });

      it("la fila sigue en la tabla, pero el listado, el detalle y el resumen dejan de verla", async () => {
        const enLaTabla = await fx
          .db()
          .select({ id: inscripciones.id })
          .from(inscripciones)
          .where(eq(inscripciones.viajeId, viajeC.id));
        expect(enLaTabla).toHaveLength(2);

        // Ese es el criterio de HOY y es deliberado (`condicionesInscripciones`):
        // la bandeja es la lista de trabajo del equipo y una ficha borrada no da
        // trabajo. El talón sobrevive igual en la tabla, que es lo que deja que
        // una métrica del universo la siga contando hacia atrás.
        const lista = await q.listInscripciones(filtros({ viajeId: viajeC.id }), {
          page: 1,
          size: 50,
        });
        expect(lista.items.map((i) => i.id)).toEqual([testigo.id]);
        expect(await q.getInscripcionByNumero(aBorrar.numero)).toBeNull();

        const resumen = await q.resumenInscripciones(filtros({ viajeId: viajeC.id }));
        expect(resumen.total).toBe(1);
        expect(resumen.porEstado.recibida).toBe(1);
      });

      it("es idempotente: sobre una ya borrada no vuelve a sellar", async () => {
        const otraVez = await q.anonimizarInscripcion(aBorrar.id, {
          usuarioId: OTRO_USUARIO,
          motivo: "[INT] el mismo pedido, dos veces",
        });
        expect(otraVez).toBe(false);

        // Lo que prueba cuándo se cumplió el pedido es el primer sello: un
        // segundo clic no puede pisarle la fecha, el autor ni el motivo.
        const igual = await leerCruda(aBorrar.id);
        expect(igual.borradoEl?.toISOString()).toBe(despues.borradoEl?.toISOString());
        expect(igual.borradoPor).toBe(USUARIO_BORRA);
        expect(igual.motivoBorrado).toBe(MOTIVO);
      });

      it("no toca ninguna otra ficha", async () => {
        const otra = await leerCruda(testigo.id);
        expect(otra).toMatchObject({
          nombre: testigo.nombre,
          dni: testigo.dni,
          telefonoAlumno: "+5491155556666",
          borradoEl: null,
          datosPurgadosEl: null,
        });
      });

      it("una segunda ficha viva también se puede borrar: el DNI vaciado no choca con el índice único", async () => {
        // Las dos quedan en `recibida` —el estado es parte del talón— y
        // `uniq_inscripcion_dni_viva` mira justo ese estado: con el DNI en ""
        // este segundo borrado moriría con una violación de unique.
        await expect(
          q.anonimizarInscripcion(testigo.id, { usuarioId: USUARIO_BORRA, motivo: MOTIVO })
        ).resolves.toBe(true);

        const fila = await leerCruda(testigo.id);
        expect(fila.dni).toBe(`borrado-${testigo.id}`);
        expect(fila.dni).not.toBe(despues.dni);
      });
    });
  }
);
