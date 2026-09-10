import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cuotas, type Cuota, type NewCuota } from "@/lib/db/schema/cuotas";
import { estadoEfectivoCuota } from "@/lib/domain/cuotas";

import { crearFixtures, dia, integracionHabilitada } from "../../../../tests/integration/fixtures";

type PagosQ = typeof import("./pagos");

const fx = crearFixtures("PAGOS");
const HOY = dia("2031-05-20");

type Linea = Pick<NewCuota, "numero" | "estado" | "moneda"> & { vence: string; monto: string };

describe.skipIf(!integracionHabilitada)("módulo Pagos (listCuotasGlobal / resumenPagosGlobal) contra Postgres", () => {
  let q: PagosQ;
  let viajeId: string;
  let propias: Cuota[];

  beforeAll(async () => {
    await fx.iniciar();
    q = await import("./pagos");

    const colegio = await fx.colegio();
    const viaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: dia("2031-09-01") });
    const otroViaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: dia("2031-09-01") });
    viajeId = viaje.id;

    const inscribir = async (vId: string, estado: "activa" | "cancelada" = "activa") => {
      const alumno = await fx.alumno({ fechaNacimiento: dia("2016-01-01") });
      return (await fx.asignacion(alumno.id, vId, estado)).id;
    };

    const planes: [string, Linea[]][] = [
      [
        await inscribir(viaje.id),
        [
          { numero: 1, vence: "2031-05-19", estado: "pendiente", moneda: "USD", monto: "100.00" },
          { numero: 2, vence: "2031-05-20", estado: "pendiente", moneda: "USD", monto: "100.00" },
          { numero: 3, vence: "2031-05-21", estado: "pendiente", moneda: "USD", monto: "100.00" },
        ],
      ],
      [
        await inscribir(viaje.id),
        [
          { numero: 1, vence: "2031-05-19", estado: "pagada", moneda: "USD", monto: "250.00" },
          // "vencida" persistida no manda: la mora es derivada de la fecha.
          { numero: 2, vence: "2031-05-20", estado: "vencida", moneda: "USD", monto: "250.00" },
          { numero: 3, vence: "2031-06-01", estado: "vencida", moneda: "USD", monto: "250.00" },
        ],
      ],
      [
        await inscribir(viaje.id),
        [
          { numero: 1, vence: "2031-05-19", estado: "pendiente", moneda: "GBP", monto: "300.00" },
          { numero: 2, vence: "2031-05-19", estado: "pagada", moneda: "GBP", monto: "300.00" },
        ],
      ],
      [
        await inscribir(viaje.id),
        [
          { numero: 1, vence: "2031-05-10", estado: "pendiente", moneda: "USD", monto: "100.00" },
          { numero: 2, vence: "2031-05-20", estado: "pendiente", moneda: "USD", monto: "100.00" },
        ],
      ],
      [
        await inscribir(viaje.id, "cancelada"),
        [{ numero: 1, vence: "2031-05-19", estado: "pendiente", moneda: "USD", monto: "999.00" }],
      ],
      [
        await inscribir(otroViaje.id),
        [{ numero: 1, vence: "2031-05-19", estado: "pendiente", moneda: "USD", monto: "777.00" }],
      ],
    ];

    const activas = planes.slice(0, 4).map(([id]) => id);
    const insertadas = await fx
      .db()
      .insert(cuotas)
      .values(
        planes.flatMap(([asignacionId, lineas]) =>
          lineas.map((l, i) => ({
            asignacionId,
            numero: l.numero,
            esUltimaCuota: i === lineas.length - 1 ? 1 : 0,
            monto: l.monto,
            moneda: l.moneda,
            estado: l.estado,
            canal: "agencia" as const,
            fechaVencimiento: dia(l.vence),
          }))
        )
      )
      .returning();
    propias = insertadas.filter((c) => activas.includes(c.asignacionId));
  });

  afterAll(async () => {
    await fx.limpiar();
  });

  async function todasLasPaginas(size: number, filtros: Parameters<PagosQ["listCuotasGlobal"]>[0], hoy = HOY) {
    const primera = await q.listCuotasGlobal(filtros, { page: 1, size }, hoy);
    const items = [...primera.items];
    for (let page = 2; page <= primera.pages; page++) {
      const p = await q.listCuotasGlobal(filtros, { page, size }, hoy);
      expect(p.total).toBe(primera.total);
      items.push(...p.items);
    }
    return { total: primera.total, pages: primera.pages, items };
  }

  const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

  it.each([
    ["medianoche UTC", "2031-05-20T00:00:00.000Z"],
    ["23:30 ART del día anterior (ya es el 20 en UTC)", "2031-05-20T02:30:00.000Z"],
    ["último instante del día UTC", "2031-05-20T23:59:59.999Z"],
  ])("el filtro por estado efectivo en SQL coincide con el dominio (%s)", async (_, instante) => {
    const hoy = new Date(instante);
    for (const estado of ["vencida", "pendiente", "pagada"] as const) {
      const sql = await todasLasPaginas(50, { viajeId, estado }, hoy);
      const dominio = propias.filter((c) => estadoEfectivoCuota(c, hoy) === estado);
      expect(ids(sql.items), estado).toEqual(ids(dominio));
      expect(sql.total, estado).toBe(dominio.length);
    }
  });

  it("el borde del día: vencida es solo lo que venció ANTES de hoy, el día del vencimiento sigue pendiente", async () => {
    const hoy = await todasLasPaginas(50, { viajeId, estado: "vencida" });
    expect(hoy.items.map((c) => c.fechaVencimiento.toISOString().slice(0, 10)).sort()).toEqual([
      "2031-05-10",
      "2031-05-19",
      "2031-05-19",
    ]);

    const ayer = await todasLasPaginas(50, { viajeId, estado: "vencida" }, new Date("2031-05-19T23:59:59.999Z"));
    expect(ayer.items.map((c) => c.fechaVencimiento.toISOString().slice(0, 10))).toEqual(["2031-05-10"]);

    const pendientes = await todasLasPaginas(50, { viajeId, estado: "pendiente" });
    expect(pendientes.total).toBe(5);
    expect(pendientes.items.every((c) => c.estado !== "pagada")).toBe(true);
  });

  it.each([1, 2, 4])(
    "paginar de a %i recorre cada cuota exactamente una vez, en orden de vencimiento, sin las canceladas ni otros viajes",
    async (size) => {
      const { total, pages, items } = await todasLasPaginas(size, { viajeId });

      expect(total).toBe(10);
      expect(pages).toBe(Math.ceil(10 / size));
      expect(items).toHaveLength(10);
      expect(new Set(items.map((c) => c.id)).size).toBe(10);
      expect(ids(items)).toEqual(ids(propias));

      const claves = items.map((c) => `${c.fechaVencimiento.toISOString()}#${c.numero}`);
      expect(claves).toEqual([...claves].sort());
      expect(items.every((c) => c.viajeId === viajeId)).toBe(true);
    }
  );

  it("una página fuera de rango devuelve la última real, y los filtros combinados paginan sobre el universo filtrado", async () => {
    const ultima = await q.listCuotasGlobal({ viajeId }, { page: 5, size: 2 }, HOY);
    const fuera = await q.listCuotasGlobal({ viajeId }, { page: 99, size: 2 }, HOY);
    expect(fuera).toMatchObject({ page: 5, pages: 5, total: 10 });
    expect(ids(fuera.items)).toEqual(ids(ultima.items));

    const vencidasP1 = await q.listCuotasGlobal({ viajeId, estado: "vencida" }, { page: 1, size: 2 }, HOY);
    expect(vencidasP1).toMatchObject({ total: 3, pages: 2 });
    expect(vencidasP1.items).toHaveLength(2);

    const gbp = await todasLasPaginas(50, { viajeId, moneda: "GBP" });
    expect(gbp.items.map((c) => c.moneda)).toEqual(["GBP", "GBP"]);
  });

  it("resumenPagosGlobal agrega sobre todo el universo filtrado, no sobre la página, por moneda", async () => {
    const resumen = await q.resumenPagosGlobal({ viajeId }, HOY);

    expect(resumen).toEqual({
      porMoneda: [
        { moneda: "USD", cobrado: 250, pendiente: 1000, enMora: 200 },
        { moneda: "GBP", cobrado: 300, pendiente: 300, enMora: 300 },
      ],
      cuotasEnMora: 3,
    });

    const { items } = await todasLasPaginas(2, { viajeId });
    for (const r of resumen.porMoneda) {
      const deMoneda = items.filter((c) => c.moneda === r.moneda);
      const suma = (xs: typeof items) => xs.reduce((acc, c) => acc + Number(c.monto), 0);
      expect(r.cobrado).toBe(suma(deMoneda.filter((c) => c.estado === "pagada")));
      expect(r.pendiente).toBe(suma(deMoneda.filter((c) => c.estado !== "pagada")));
      expect(r.enMora).toBe(suma(deMoneda.filter((c) => estadoEfectivoCuota(c, HOY) === "vencida")));
    }

    const soloUsd = await q.resumenPagosGlobal({ viajeId, moneda: "USD" }, HOY);
    expect(soloUsd).toEqual({
      porMoneda: [{ moneda: "USD", cobrado: 250, pendiente: 1000, enMora: 200 }],
      cuotasEnMora: 2,
    });
  });
});
