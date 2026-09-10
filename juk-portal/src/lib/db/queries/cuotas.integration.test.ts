import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Viaje } from "@/lib/db/schema/viajes";
import { CuotaNotFoundError, PlanConPagosError } from "@/lib/domain/cuotas";

import { crearFixtures, dia, integracionHabilitada, isoDia } from "../../../../tests/integration/fixtures";

type CuotasQ = typeof import("./cuotas");
type Asignar = (typeof import("./asignar-alumno"))["asignarConTablero"];

const fx = crearFixtures("CUOTAS");
const REGISTRA = randomUUID();

describe.skipIf(!integracionHabilitada)("plan de cuotas y pasos B1/B2/C2 contra Postgres", () => {
  let q: CuotasQ;
  let asignar: Asignar;
  let independiente: Viaje;
  let colegioCliente: Viaje;

  beforeAll(async () => {
    await fx.iniciar();
    q = await import("./cuotas");
    ({ asignarConTablero: asignar } = await import("./asignar-alumno"));
    const colegio = await fx.colegio();
    independiente = await fx.viaje({ colegioDestinoId: colegio.id, fechaInicio: dia("2030-08-01") });
    colegioCliente = await fx.viaje({
      colegioDestinoId: colegio.id,
      fechaInicio: dia("2030-08-01"),
      origen: "colegio_cliente",
    });
  });

  afterAll(async () => {
    await fx.limpiar();
  });

  async function inscripto(viaje: Viaje): Promise<string> {
    const alumno = await fx.alumno({ fechaNacimiento: dia("2014-02-14") });
    const r = await asignar({ viaje, alumno, usuarioId: null });
    return r.asignacionId;
  }

  function plan(asignacionId: string, viaje: Viaje, cantidadCuotas: number, primerVencimiento = dia("2030-01-31")) {
    return q.crearPlanCuotas({
      asignacionId,
      cantidadCuotas,
      montoPorCuota: 150,
      moneda: "GBP",
      primerVencimiento,
      origenViaje: viaje.origen,
      registradoPor: REGISTRA,
    });
  }

  it("crea el plan con vencimientos mensuales ajustados a fin de mes, una sola última cuota y el canal del representante", async () => {
    const asignacionId = await inscripto(independiente);

    const creadas = await plan(asignacionId, independiente, 3);
    const enDb = await fx.cuotasDe(asignacionId);

    expect(creadas.map((c) => c.id).sort()).toEqual(enDb.map((c) => c.id).sort());
    expect(
      enDb.map((c) => ({
        numero: c.numero,
        esUltimaCuota: c.esUltimaCuota,
        monto: c.monto,
        moneda: c.moneda,
        canal: c.canal,
        estado: c.estado,
        vence: isoDia(c.fechaVencimiento),
      }))
    ).toEqual([
      { numero: 1, esUltimaCuota: 0, monto: "150.00", moneda: "GBP", canal: "agencia", estado: "pendiente", vence: "2030-01-31" },
      { numero: 2, esUltimaCuota: 0, monto: "150.00", moneda: "GBP", canal: "agencia", estado: "pendiente", vence: "2030-02-28" },
      { numero: 3, esUltimaCuota: 1, monto: "150.00", moneda: "GBP", canal: "presencial", estado: "pendiente", vence: "2030-03-31" },
    ]);
    expect(enDb[0]?.fechaVencimiento.toISOString()).toBe("2030-01-31T00:00:00.000Z");

    const deCliente = await inscripto(colegioCliente);
    await plan(deCliente, colegioCliente, 2);
    expect((await fx.cuotasDe(deCliente)).map((c) => [c.esUltimaCuota, c.canal])).toEqual([
      [0, "agencia"],
      [1, "agencia"],
    ]);
  });

  it("regenerar un plan sin pagos lo reemplaza entero y conserva una única última cuota", async () => {
    const asignacionId = await inscripto(independiente);
    const viejo = await plan(asignacionId, independiente, 3);

    await plan(asignacionId, independiente, 5, dia("2030-02-10"));
    const enDb = await fx.cuotasDe(asignacionId);

    expect(enDb.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(enDb.some((c) => viejo.some((v) => v.id === c.id))).toBe(false);
    expect(enDb.filter((c) => c.esUltimaCuota === 1).map((c) => c.numero)).toEqual([5]);
    expect(isoDia(enDb[0]!.fechaVencimiento)).toBe("2030-02-10");
  });

  it("registra el pago con la fecha efectiva exacta y, con pagos, no deja regenerar ni toca el plan", async () => {
    const asignacionId = await inscripto(independiente);
    const [primera] = await plan(asignacionId, independiente, 3);
    const fechaPago = new Date("2030-01-15T13:45:00.000Z");

    const pagada = await q.registrarPagoCuota({
      cuotaId: primera!.id,
      fechaPagoEfectivo: fechaPago,
      observaciones: "[INT] transferencia",
      registradoPor: REGISTRA,
    });

    expect(pagada).toMatchObject({ estado: "pagada", observaciones: "[INT] transferencia", canal: "agencia" });
    expect(pagada.fechaPagoEfectivo?.toISOString()).toBe(fechaPago.toISOString());
    const releida = await q.getCuotaById(primera!.id);
    expect(releida?.fechaPagoEfectivo?.toISOString()).toBe(fechaPago.toISOString());

    const antes = (await fx.cuotasDe(asignacionId)).map((c) => c.id);
    await expect(plan(asignacionId, independiente, 6)).rejects.toBeInstanceOf(PlanConPagosError);
    expect((await fx.cuotasDe(asignacionId)).map((c) => c.id)).toEqual(antes);
  });

  it("sin fecha efectiva usa el momento del registro; canalPresencial fuerza el canal de la cuota", async () => {
    const asignacionId = await inscripto(independiente);
    const [, segunda] = await plan(asignacionId, independiente, 3);
    const desde = Date.now();

    const pagada = await q.registrarPagoCuota({
      cuotaId: segunda!.id,
      registradoPor: REGISTRA,
      canalPresencial: true,
    });

    expect(pagada.canal).toBe("presencial");
    const instante = pagada.fechaPagoEfectivo?.getTime() ?? 0;
    expect(instante).toBeGreaterThanOrEqual(desde - 1000);
    expect(instante).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("pagar una cuota inexistente lanza CuotaNotFoundError", async () => {
    await expect(
      q.registrarPagoCuota({ cuotaId: randomUUID(), registradoPor: REGISTRA })
    ).rejects.toBeInstanceOf(CuotaNotFoundError);
  });

  it("advierte cuando se paga con cuotas anteriores impagas y deja de advertir al ponerse al día", async () => {
    const asignacionId = await inscripto(independiente);
    const [c1, c2, c3] = await plan(asignacionId, independiente, 3);

    expect(await q.advertenciaPagoFueraDeOrden(c3!.id)).toContain("cuotas anteriores impagas (n° 1, 2)");
    expect(await q.advertenciaPagoFueraDeOrden(c1!.id)).toBeNull();

    await q.registrarPagoCuota({ cuotaId: c1!.id, registradoPor: REGISTRA });
    expect(await q.advertenciaPagoFueraDeOrden(c3!.id)).toContain("una cuota anterior impaga (n° 2)");
    expect(await q.advertenciaPagoFueraDeOrden(c1!.id)).toBeNull();

    await q.registrarPagoCuota({ cuotaId: c2!.id, registradoPor: REGISTRA });
    expect(await q.advertenciaPagoFueraDeOrden(c3!.id)).toBeNull();
  });

  it("sincronizarPasosPago: B1 sigue al plan, C2 se destraba al completarse B1 conservando su metadata y B2 se completa con la última presencial", async () => {
    const asignacionId = await inscripto(independiente);
    const [c1, c2, c3] = await plan(asignacionId, independiente, 3);

    await q.sincronizarPasosPago(asignacionId, REGISTRA);
    let pasos = await fx.pasos(asignacionId);
    expect(pasos.get("b1")).toMatchObject({
      estado: "pendiente",
      metadata: { cuotasPagadas: 0, cuotasTotales: 3 },
      fechaCompletado: null,
    });
    expect(pasos.get("c2")?.estado).toBe("bloqueado");
    expect(pasos.get("b2")?.estado).toBe("pendiente");

    await fx.actualizarPaso(asignacionId, "c2", {
      metadata: { bloqueadoPor: "b1", archivoUrl: "r2://int/c2.pdf" },
    });

    await q.registrarPagoCuota({ cuotaId: c1!.id, registradoPor: REGISTRA });
    await q.sincronizarPasosPago(asignacionId, REGISTRA);
    pasos = await fx.pasos(asignacionId);
    expect(pasos.get("b1")).toMatchObject({
      estado: "en_progreso",
      metadata: { cuotasPagadas: 1, cuotasTotales: 3 },
      fechaCompletado: null,
    });
    expect(pasos.get("c2")).toMatchObject({
      estado: "bloqueado",
      metadata: { bloqueadoPor: "b1", archivoUrl: "r2://int/c2.pdf" },
    });
    expect(pasos.get("b2")?.estado).toBe("pendiente");

    await q.registrarPagoCuota({ cuotaId: c2!.id, registradoPor: REGISTRA });
    await q.registrarPagoCuota({ cuotaId: c3!.id, registradoPor: REGISTRA, canalPresencial: true });
    await q.sincronizarPasosPago(asignacionId, REGISTRA);
    pasos = await fx.pasos(asignacionId);

    expect(pasos.get("b1")).toMatchObject({
      estado: "completado",
      metadata: { cuotasPagadas: 3, cuotasTotales: 3 },
      updatedBy: REGISTRA,
    });
    expect(pasos.get("b1")?.fechaCompletado).not.toBeNull();
    expect(pasos.get("c2")?.estado).toBe("pendiente");
    expect(pasos.get("c2")?.metadata).toEqual({ archivoUrl: "r2://int/c2.pdf" });
    expect(pasos.get("c2")?.updatedBy).toBe(REGISTRA);
    expect(pasos.get("b2")?.estado).toBe("completado");
    expect(pasos.get("b2")?.fechaCompletado).not.toBeNull();
  });

  it("un C2 que ya avanzó no se pisa cuando B1 se completa", async () => {
    const asignacionId = await inscripto(independiente);
    const [unica] = await plan(asignacionId, independiente, 1);
    await fx.actualizarPaso(asignacionId, "c2", {
      estado: "en_progreso",
      metadata: { archivoUrl: "r2://int/c2-avanzado.pdf" },
    });

    await q.registrarPagoCuota({ cuotaId: unica!.id, registradoPor: REGISTRA });
    await q.sincronizarPasosPago(asignacionId, REGISTRA);

    const pasos = await fx.pasos(asignacionId);
    expect(pasos.get("b1")?.estado).toBe("completado");
    expect(pasos.get("c2")).toMatchObject({
      estado: "en_progreso",
      metadata: { archivoUrl: "r2://int/c2-avanzado.pdf" },
    });
  });

  it("B2 N/A (viaje de colegio cliente) sigue N/A aunque el plan quede pago", async () => {
    const asignacionId = await inscripto(colegioCliente);
    const cuotas = await plan(asignacionId, colegioCliente, 2);
    for (const c of cuotas) await q.registrarPagoCuota({ cuotaId: c.id, registradoPor: REGISTRA });

    await q.sincronizarPasosPago(asignacionId, REGISTRA);

    const pasos = await fx.pasos(asignacionId);
    expect(pasos.get("b1")?.estado).toBe("completado");
    expect(pasos.get("b2")).toMatchObject({
      estado: "na",
      metadata: { motivo: "flujo_via_agencia_o_directo" },
      fechaCompletado: null,
    });
    expect(pasos.get("c2")?.estado).toBe("pendiente");
  });
});
