import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { auditoria } from "@/lib/db/schema/auditoria";
import type { Viaje } from "@/lib/db/schema/viajes";
import { transicionAutomaticaPorFecha } from "@/lib/domain/viajes";

import {
  crearFixtures,
  dia,
  FixtureError,
  integracionHabilitada,
} from "../../../tests/integration/fixtures";

type Job = (typeof import("./transiciones-viajes"))["transicionarViajesPorFecha"];
type ListarPorEstado = (typeof import("@/lib/db/queries/viajes"))["listViajesPorEstado"];

const fx = crearFixtures("TRANS");

/*
 * El job recorre TODOS los viajes confirmados/en curso de la base. Para no
 * mover un viaje ajeno (datos reales o [DEMO]), los viajes propios viven en
 * 2001 y, antes de cada corrida, se verifica con la misma regla de dominio que
 * ningún viaje ajeno cambiaría de estado con ese `hoy`; si alguno cambiaría,
 * el test aborta sin correr el job.
 */
describe.skipIf(!integracionHabilitada)("transicionarViajesPorFecha contra Postgres", () => {
  let job: Job;
  let listViajesPorEstado: ListarPorEstado;
  let v: Record<"aEnCurso" | "aFinalizar" | "terminaHoy" | "empiezaManana" | "abierto" | "cancelado", Viaje>;

  beforeAll(async () => {
    await fx.iniciar();
    ({ transicionarViajesPorFecha: job } = await import("./transiciones-viajes"));
    ({ listViajesPorEstado } = await import("@/lib/db/queries/viajes"));

    const colegio = await fx.colegio();
    const crear = (estado: Viaje["estado"], inicio: string, fin: string) =>
      fx.viaje({ colegioDestinoId: colegio.id, estado, fechaInicio: dia(inicio), fechaFin: dia(fin) });

    v = {
      aEnCurso: await crear("confirmado", "2001-03-15", "2001-03-25"),
      aFinalizar: await crear("en_curso", "2001-03-01", "2001-03-14"),
      terminaHoy: await crear("en_curso", "2001-03-05", "2001-03-15"),
      empiezaManana: await crear("confirmado", "2001-03-16", "2001-03-30"),
      abierto: await crear("inscripcion_abierta", "2001-03-10", "2001-03-20"),
      cancelado: await crear("cancelado", "2001-03-10", "2001-03-20"),
    };
  });

  afterAll(async () => {
    await fx.limpiar();
  });

  async function correrSeguro(hoy: Date) {
    const propios = new Set(fx.propios.viajes);
    const ajenosAfectados = (await listViajesPorEstado(["confirmado", "en_curso"])).filter(
      (x) => !propios.has(x.id) && transicionAutomaticaPorFecha(x.estado, x.fechaInicio, x.fechaFin, hoy)
    );
    if (ajenosAfectados.length > 0) {
      throw new FixtureError(
        `el job movería viajes ajenos con hoy=${hoy.toISOString()}: ${ajenosAfectados.map((x) => x.codigo).join(", ")}`
      );
    }
    return job(hoy);
  }

  async function estados() {
    return Object.fromEntries(
      await Promise.all(Object.entries(v).map(async ([k, x]) => [k, (await fx.viajePorId(x.id)).estado]))
    );
  }

  async function auditoriaPropia() {
    return fx
      .db()
      .select()
      .from(auditoria)
      .where(inArray(auditoria.entidadId, fx.propios.viajes))
      .orderBy(auditoria.createdAt);
  }

  it("confirmado → en curso el día de inicio y en curso → finalizado pasado el fin, por día calendario UTC, con auditoría", async () => {
    const r = await correrSeguro(new Date("2001-03-15T23:59:59.000Z"));

    expect(r).toEqual({ enCurso: 1, finalizados: 1 });
    expect(await estados()).toEqual({
      aEnCurso: "en_curso",
      aFinalizar: "finalizado",
      terminaHoy: "en_curso",
      empiezaManana: "confirmado",
      abierto: "inscripcion_abierta",
      cancelado: "cancelado",
    });

    const filas = await auditoriaPropia();
    expect(
      filas.map((a) => ({
        accion: a.accion,
        entidadTipo: a.entidadTipo,
        entidadId: a.entidadId,
        usuarioId: a.usuarioId,
        metadata: a.metadata,
      }))
    ).toEqual(
      expect.arrayContaining([
        {
          accion: "cambio_estado_viaje",
          entidadTipo: "viaje",
          entidadId: v.aEnCurso.id,
          usuarioId: null,
          metadata: { estadoAnterior: "confirmado", estado: "en_curso", motivo: "auto_fecha" },
        },
        {
          accion: "cambio_estado_viaje",
          entidadTipo: "viaje",
          entidadId: v.aFinalizar.id,
          usuarioId: null,
          metadata: { estadoAnterior: "en_curso", estado: "finalizado", motivo: "auto_fecha" },
        },
      ])
    );
    expect(filas).toHaveLength(2);
  });

  it("correrlo otra vez el mismo día no transiciona ni audita de nuevo", async () => {
    const r = await correrSeguro(new Date("2001-03-15T11:00:00.000Z"));

    expect(r).toEqual({ enCurso: 0, finalizados: 0 });
    expect(await auditoriaPropia()).toHaveLength(2);
  });

  it("días después avanza lo que quedaba pendiente, un paso por viaje", async () => {
    const r = await correrSeguro(new Date("2001-03-26T11:00:00.000Z"));

    expect(r).toEqual({ enCurso: 1, finalizados: 2 });
    expect(await estados()).toEqual({
      aEnCurso: "finalizado",
      aFinalizar: "finalizado",
      terminaHoy: "finalizado",
      empiezaManana: "en_curso",
      abierto: "inscripcion_abierta",
      cancelado: "cancelado",
    });

    const filas = await auditoriaPropia();
    expect(filas).toHaveLength(5);
    expect(filas.filter((a) => a.entidadId === v.aEnCurso.id).map((a) => a.metadata.estado)).toEqual([
      "en_curso",
      "finalizado",
    ]);
  });
});
