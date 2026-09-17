import { like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Del barril y no de `schema/inscripciones` directo: ese módulo y
// `schema/prospectos` se importan mutuamente, y `prospectos` llama a
// `varianteFormulario()` al evaluarse. Entrar por `inscripciones` deja el enum
// sin definir ("varianteFormulario is not a function"); el barril los carga en
// un orden que funciona. Las queries no lo sufren porque importan `@/lib/db`
// —que evalúa el barril— antes que cualquier tabla.
import { inscripciones, type Inscripcion, type NewInscripcion } from "@/lib/db/schema";
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
    let filas: Inscripcion[];
    let deA: Inscripcion[];
    let borrada: Inscripcion;

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
        ])
        .returning();

      const propia = (n: number) => {
        const row = filas.find((f) => f.nombre === `${PREFIJO}Nombre ${n}`);
        if (!row) throw new Error(`falta la fila ${n}`);
        return row;
      };
      deA = [1, 2, 3, 4, 5, 6, 7, 8].map(propia);
      borrada = propia(9);
    });

    afterAll(async () => {
      await fx.db().delete(inscripciones).where(like(inscripciones.nombre, `${PREFIJO}%`));
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
  }
);
