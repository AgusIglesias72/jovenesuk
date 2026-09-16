import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Alumno } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { viajes } from "@/lib/db/schema/viajes";
import { ViajeNoInscribibleError } from "@/lib/domain/asignaciones";

import { crearFixtures, dia, integracionHabilitada } from "../../../../tests/integration/fixtures";
import { esViolacionUnique } from "./errors";

type Asignar = (typeof import("./asignar-alumno"))["asignarConTablero"];
type Cancelar = (typeof import("./asignaciones"))["cancelarAsignacion"];

const fx = crearFixtures("ASIG");
const INICIO = dia("2030-07-10");

describe.skipIf(!integracionHabilitada)("asignarConTablero contra Postgres", () => {
  let asignar: Asignar;
  let cancelar: Cancelar;

  beforeAll(async () => {
    await fx.iniciar();
    ({ asignarConTablero: asignar } = await import("./asignar-alumno"));
    ({ cancelarAsignacion: cancelar } = await import("./asignaciones"));
  });

  afterAll(async () => {
    await fx.limpiar();
  });

  async function tablero(asignacionId: string) {
    const pasos = await fx.pasos(asignacionId);
    return Object.fromEntries(
      [...pasos].map(([codigo, p]) => [codigo, { estado: p.estado, metadata: p.metadata }])
    );
  }

  it("grupal con representante independiente, ETA y config propia: 11 pasos con A3 por edad y C2 bloqueado", async () => {
    const colegio = await fx.colegio({
      tipoEntradaRequerida: "eta",
      config: { test_nivel: "requerido", parental_consent: "requerido" },
    });
    const viaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO });
    const alumno = await fx.alumno({ fechaNacimiento: dia("2015-03-10"), canalAlta: "webhook" });
    const usuarioId = randomUUID();

    const r = await asignar({ viaje, alumno, usuarioId });

    expect(r).toEqual({ asignacionId: expect.any(String), autoConfirmado: false, pasosCreados: 11 });
    expect(await tablero(r.asignacionId)).toEqual({
      paso_0: { estado: "completado", metadata: { canal: "webhook" } },
      a1: { estado: "pendiente", metadata: {} },
      a2: { estado: "pendiente", metadata: {} },
      a3: { estado: "pendiente", metadata: { version: "menor_16" } },
      b1: { estado: "pendiente", metadata: {} },
      b2: { estado: "pendiente", metadata: {} },
      c1: { estado: "pendiente", metadata: {} },
      c2: { estado: "bloqueado", metadata: { bloqueadoPor: "b1" } },
      c3: { estado: "pendiente", metadata: {} },
      d1: { estado: "pendiente", metadata: {} },
      d2: { estado: "pendiente", metadata: {} },
    });

    const pasos = await fx.pasos(r.asignacionId);
    expect(pasos.get("a1")?.fechaLimite?.toISOString()).toBe("2030-06-10T00:00:00.000Z");
    expect([...pasos.values()].filter((p) => p.fechaLimite !== null).map((p) => p.codigo)).toEqual(["a1"]);
    expect(pasos.get("paso_0")?.fechaCompletado?.getTime()).toBe(alumno.fechaAlta.getTime());
    expect([...pasos.values()].every((p) => p.updatedBy === usuarioId)).toBe(true);

    expect(await fx.asignacionPorId(r.asignacionId)).toMatchObject({
      alumnoId: alumno.id,
      viajeId: viaje.id,
      estado: "activa",
    });
    expect((await fx.alumnoPorId(alumno.id)).estado).toBe("inscripto");
    expect((await fx.viajePorId(viaje.id)).estado).toBe("inscripcion_abierta");
  });

  it("individual de colegio cliente con VISA y config N/A/opcional: los N/A salen de la config, del representante, del país y del tipo", async () => {
    const colegio = await fx.colegio({
      tipoEntradaRequerida: "visa",
      config: { application_form: "na", parental_consent: "opcional" },
    });
    const viaje = await fx.viaje({
      colegioDestinoId: colegio.id,
      fechaInicio: INICIO,
      tipo: "individual",
      origen: "colegio_cliente",
    });
    const alumno = await fx.alumno({ fechaNacimiento: dia("2012-12-10"), estado: "activo" });

    const r = await asignar({ viaje, alumno, usuarioId: null });

    expect(await tablero(r.asignacionId)).toEqual({
      paso_0: { estado: "completado", metadata: { canal: "alta_manual" } },
      a1: { estado: "na", metadata: { motivo: "config_colegio" } },
      a2: { estado: "na", metadata: { motivo: "config_colegio" } },
      a3: { estado: "pendiente", metadata: { opcional: true, version: "16_17" } },
      b1: { estado: "pendiente", metadata: {} },
      b2: { estado: "na", metadata: { motivo: "flujo_via_agencia_o_directo" } },
      c1: { estado: "na", metadata: { motivo: "entrada_visa" } },
      c2: { estado: "bloqueado", metadata: { bloqueadoPor: "b1" } },
      c3: { estado: "pendiente", metadata: {} },
      d1: { estado: "pendiente", metadata: {} },
      d2: { estado: "na", metadata: { motivo: "viaje_individual" } },
    });
    expect(r.autoConfirmado).toBe(false);
    expect((await fx.alumnoPorId(alumno.id)).estado).toBe("activo");
    expect((await fx.viajePorId(viaje.id)).estado).toBe("confirmado");
  });

  it("el alumno que cumple 18 el día que arranca el viaje ya es mayor: A3 y D1 N/A", async () => {
    const colegio = await fx.colegio();
    const viaje = await fx.viaje({
      colegioDestinoId: colegio.id,
      fechaInicio: INICIO,
      origen: "juk_directo",
    });
    const alumno = await fx.alumno({ fechaNacimiento: dia("2012-07-10") });

    const r = await asignar({ viaje, alumno, usuarioId: null });
    const t = await tablero(r.asignacionId);

    expect(t.a3).toEqual({ estado: "na", metadata: { motivo: "mayor_de_edad" } });
    expect(t.d1).toEqual({ estado: "na", metadata: { motivo: "mayor_de_edad" } });
    expect(t.a2).toEqual({ estado: "na", metadata: { motivo: "config_colegio" } });
    expect(t.b2).toEqual({ estado: "na", metadata: { motivo: "flujo_via_agencia_o_directo" } });
    expect(t.c1?.estado).toBe("pendiente");
    expect(t.d2?.estado).toBe("pendiente");
  });

  it("reasignar una asignación cancelada reusa la fila, la reactiva y resetea el tablero", async () => {
    const colegio = await fx.colegio();
    const viaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO });
    const alumno = await fx.alumno({ fechaNacimiento: dia("2014-01-20") });

    const primera = await asignar({ viaje, alumno, usuarioId: null });
    const idsAntes = [...(await fx.pasos(primera.asignacionId)).values()].map((p) => p.id);
    await fx.actualizarPaso(primera.asignacionId, "a1", {
      estado: "completado",
      metadata: { archivoUrl: "r2://int/a1.pdf" },
      fechaCompletado: new Date(),
    });
    await fx.actualizarPaso(primera.asignacionId, "c2", { estado: "en_progreso", metadata: {} });

    await cancelar(primera.asignacionId, viaje.id, "[INT] baja del viaje");
    const cancelada = await fx.asignacionPorId(primera.asignacionId);
    expect(cancelada.estado).toBe("cancelada");
    expect(cancelada.fechaCancelacion).not.toBeNull();

    const segunda = await asignar({
      viaje: await fx.viajePorId(viaje.id),
      alumno: await fx.alumnoPorId(alumno.id),
      usuarioId: null,
    });

    expect(segunda.asignacionId).toBe(primera.asignacionId);
    const reactivada = await fx.asignacionPorId(segunda.asignacionId);
    expect(reactivada).toMatchObject({ estado: "activa", fechaCancelacion: null, motivoCancelacion: null });
    // Las tres fechas salen del reloj de Postgres (defaultNow / now()), así que
    // el orden se sostiene aunque el reloj de la máquina esté desfasado.
    expect(reactivada.fechaAsignacion.getTime()).toBeGreaterThan(cancelada.fechaAsignacion.getTime());
    expect(reactivada.fechaAsignacion.getTime()).toBeGreaterThanOrEqual(
      cancelada.fechaCancelacion!.getTime()
    );

    const filasDelPar = await fx
      .db()
      .select({ id: asignaciones.id })
      .from(asignaciones)
      .where(and(eq(asignaciones.alumnoId, alumno.id), eq(asignaciones.viajeId, viaje.id)));
    expect(filasDelPar).toHaveLength(1);

    const pasos = await fx.pasos(segunda.asignacionId);
    expect(pasos.size).toBe(11);
    expect(pasos.get("a1")).toMatchObject({ estado: "pendiente", metadata: {}, fechaCompletado: null });
    expect(pasos.get("c2")).toMatchObject({ estado: "bloqueado", metadata: { bloqueadoPor: "b1" } });
    expect([...pasos.values()].some((p) => idsAntes.includes(p.id))).toBe(false);
  });

  it("asignar dos veces el mismo par activo choca con la unique y el batch no toca el tablero existente", async () => {
    const colegio = await fx.colegio();
    const viaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO });
    const alumno = await fx.alumno({ fechaNacimiento: dia("2014-05-02") });

    const r = await asignar({ viaje, alumno, usuarioId: null });
    await fx.actualizarPaso(r.asignacionId, "a1", { estado: "en_progreso" });
    const idsAntes = [...(await fx.pasos(r.asignacionId)).values()].map((p) => p.id).sort();

    const error: unknown = await asignar({
      viaje: await fx.viajePorId(viaje.id),
      alumno: await fx.alumnoPorId(alumno.id),
      usuarioId: null,
    }).then(
      () => null,
      (e: unknown) => e
    );

    expect(esViolacionUnique(error)).toBe(true);
    const despues = await fx.pasos(r.asignacionId);
    expect([...despues.values()].map((p) => p.id).sort()).toEqual(idsAntes);
    expect(despues.get("a1")?.estado).toBe("en_progreso");
  });

  it("no inscribe en un viaje que no admite altas, aunque el llamador traiga el viaje desactualizado", async () => {
    const colegio = await fx.colegio();
    const enCurso = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO, estado: "en_curso" });
    const abierto = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO });
    const alumno = await fx.alumno({ fechaNacimiento: dia("2014-05-02") });

    await expect(asignar({ viaje: enCurso, alumno, usuarioId: null })).rejects.toBeInstanceOf(
      ViajeNoInscribibleError
    );

    await fx.db().update(viajes).set({ estado: "cancelado" }).where(eq(viajes.id, abierto.id));
    await expect(asignar({ viaje: abierto, alumno, usuarioId: null })).rejects.toBeInstanceOf(
      ViajeNoInscribibleError
    );

    const filas = await fx
      .db()
      .select({ id: asignaciones.id })
      .from(asignaciones)
      .where(eq(asignaciones.alumnoId, alumno.id));
    expect(filas).toHaveLength(0);
    expect((await fx.alumnoPorId(alumno.id)).estado).toBe("pre_inscripto");
  });

  it("auto-confirma el grupal al 5to inscripto activo: las canceladas no cuentan", async () => {
    const colegio = await fx.colegio();
    const viaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO });
    const inscriptos: Alumno[] = [];
    for (let i = 0; i < 6; i++) inscriptos.push(await fx.alumno({ fechaNacimiento: dia("2014-05-02") }));

    const asignarN = async (i: number) =>
      asignar({
        viaje: await fx.viajePorId(viaje.id),
        alumno: await fx.alumnoPorId(inscriptos[i]!.id),
        usuarioId: null,
      });

    const primeras: Awaited<ReturnType<Asignar>>[] = [];
    for (let i = 0; i < 4; i++) primeras.push(await asignarN(i));
    expect(primeras.map((r) => r.autoConfirmado)).toEqual([false, false, false, false]);
    expect((await fx.viajePorId(viaje.id)).estado).toBe("inscripcion_abierta");

    await cancelar(primeras[0]!.asignacionId, viaje.id, null);

    const quinta = await asignarN(4);
    expect(quinta.autoConfirmado).toBe(false);
    expect((await fx.viajePorId(viaje.id)).estado).toBe("inscripcion_abierta");

    const sexta = await asignarN(5);
    expect(sexta.autoConfirmado).toBe(true);
    expect((await fx.viajePorId(viaje.id)).estado).toBe("confirmado");
  });

  it("la auto-confirmación decide con el estado releído de la DB, no con el del objeto que trae el llamador", async () => {
    const colegio = await fx.colegio();
    const viaje = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: INICIO });
    for (let i = 0; i < 4; i++) {
      await fx.asignacion((await fx.alumno({ fechaNacimiento: dia("2014-05-02") })).id, viaje.id);
    }
    const quinto = await fx.alumno({ fechaNacimiento: dia("2014-05-02") });

    const r = await asignar({ viaje: { ...viaje, estado: "confirmado" }, alumno: quinto, usuarioId: null });

    expect(r.autoConfirmado).toBe(true);
    expect((await fx.viajePorId(viaje.id)).estado).toBe("confirmado");

    const otro = await fx.alumno({ fechaNacimiento: dia("2014-05-02") });
    const sexto = await asignar({ viaje, alumno: otro, usuarioId: null });
    expect(sexto.autoConfirmado).toBe(false);
  });
});
