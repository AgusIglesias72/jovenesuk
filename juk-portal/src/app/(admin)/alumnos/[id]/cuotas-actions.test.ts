import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IDS,
  auditoriasDe,
  loguearComo,
  nextCache,
  resetearMocks,
  sentry,
  sinEfectos,
  urlDeRedirect,
} from "@/lib/actions/__tests__/mocks";

const q = vi.hoisted(() => ({
  alumnoIdDeAsignacion: vi.fn(),
  origenDeAsignacion: vi.fn(),
  advertenciaPagoFueraDeOrden: vi.fn(),
  crearPlanCuotas: vi.fn(),
  listCuotasByAsignacion: vi.fn(),
  registrarPagoCuota: vi.fn(),
  sincronizarPasosPago: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/asignaciones", () => ({
  alumnoIdDeAsignacion: q.alumnoIdDeAsignacion,
  origenDeAsignacion: q.origenDeAsignacion,
}));
vi.mock("@/lib/db/queries/cuotas", () => ({
  advertenciaPagoFueraDeOrden: q.advertenciaPagoFueraDeOrden,
  crearPlanCuotas: q.crearPlanCuotas,
  listCuotasByAsignacion: q.listCuotasByAsignacion,
  registrarPagoCuota: q.registrarPagoCuota,
  sincronizarPasosPago: q.sincronizarPasosPago,
}));

import { CuotaNotFoundError, OBSERVACIONES_PAGO_MAX, PlanConPagosError } from "@/lib/domain/cuotas";

import {
  confirmarUltimoPagoPresencialAction,
  crearPlanCuotasAction,
  registrarPagoCuotaAction,
} from "./cuotas-actions";

const ASIG_ID = "ffffffff-0000-4000-8000-000000000001";
const ASIG_AJENA = "ffffffff-0000-4000-8000-0000000000ff";
const CUOTA_ID = "ffffffff-0000-4000-8000-000000000002";
const ULTIMA_ID = "ffffffff-0000-4000-8000-000000000003";
const ALUMNO_ID = "ffffffff-0000-4000-8000-000000000004";

const cuotaPagada = { id: CUOTA_ID, asignacionId: ASIG_ID, numero: 2, canal: "agencia" };

const planValido = {
  asignacionId: ASIG_ID,
  cantidadCuotas: "3",
  montoPorCuota: "450.5",
  primerVencimiento: "2026-10-10",
};

function sinEscrituraDePago() {
  expect(q.registrarPagoCuota).not.toHaveBeenCalled();
  expect(q.sincronizarPasosPago).not.toHaveBeenCalled();
  sinEfectos();
}

beforeEach(() => {
  resetearMocks("admin_juk");
  q.origenDeAsignacion.mockResolvedValue({ origen: "agencia", alumnoId: ALUMNO_ID });
  q.alumnoIdDeAsignacion.mockResolvedValue(ALUMNO_ID);
  q.crearPlanCuotas.mockResolvedValue([{ id: "c1" }, { id: "c2" }, { id: "c3" }]);
  q.sincronizarPasosPago.mockResolvedValue(undefined);
  q.advertenciaPagoFueraDeOrden.mockResolvedValue(null);
  q.registrarPagoCuota.mockResolvedValue(cuotaPagada);
});

describe("crearPlanCuotasAction", () => {
  it("una familia no puede crear planes de cuotas", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => crearPlanCuotasAction(planValido))).toBe("/familias");
    expect(q.crearPlanCuotas).not.toHaveBeenCalled();
  });

  it("valida cantidad y monto con fieldErrors, sin escribir", async () => {
    const r = await crearPlanCuotasAction({ ...planValido, cantidadCuotas: "0", montoPorCuota: "-1" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.cantidadCuotas?.[0]).toBe("Mínimo 1 cuota");
    expect(r.fieldErrors?.montoPorCuota?.[0]).toBe("El monto tiene que ser mayor a 0");
    expect(q.origenDeAsignacion).not.toHaveBeenCalled();
    expect(q.crearPlanCuotas).not.toHaveBeenCalled();
  });

  it("una asignación inexistente no genera cuotas", async () => {
    q.origenDeAsignacion.mockResolvedValue(null);

    const r = await crearPlanCuotasAction(planValido);

    expect(r).toEqual({ ok: false, error: "La asignación no existe." });
    expect(q.crearPlanCuotas).not.toHaveBeenCalled();
  });

  it("crea el plan con el origen del viaje (no del cliente), sincroniza B1/B2/C2 y audita", async () => {
    const r = await crearPlanCuotasAction({ ...planValido, origenViaje: "directo" });

    expect(r).toEqual({ ok: true, data: { cuotas: 3 } });
    expect(q.crearPlanCuotas).toHaveBeenCalledWith({
      asignacionId: ASIG_ID,
      cantidadCuotas: 3,
      montoPorCuota: 450.5,
      moneda: "USD",
      primerVencimiento: expect.any(Date),
      origenViaje: "agencia",
      registradoPor: IDS.admin,
    });
    expect(q.sincronizarPasosPago).toHaveBeenCalledWith(ASIG_ID, IDS.admin);
    const [orderCrear] = q.crearPlanCuotas.mock.invocationCallOrder;
    const [orderSync] = q.sincronizarPasosPago.mock.invocationCallOrder;
    expect(orderCrear).toBeLessThan(orderSync ?? 0);
    expect(auditoriasDe("create")).toEqual([
      expect.objectContaining({
        entidadTipo: "plan_cuotas",
        entidadId: ASIG_ID,
        metadata: { cuotas: 3, moneda: "USD" },
      }),
    ]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/alumnos/[id]", "page");
  });

  it("un plan con pagos no se regenera y no va a Sentry (es una regla, no un error)", async () => {
    q.crearPlanCuotas.mockRejectedValue(new PlanConPagosError());

    const r = await crearPlanCuotasAction(planValido);

    expect(r).toEqual({ ok: false, error: new PlanConPagosError().message });
    expect(q.sincronizarPasosPago).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("registrarPagoCuotaAction", () => {
  it("una familia no puede registrar pagos", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => registrarPagoCuotaAction({ cuotaId: CUOTA_ID }))).toBe("/familias");
    sinEscrituraDePago();
  });

  it("rechaza una fecha de pago futura", async () => {
    const r = await registrarPagoCuotaAction({ cuotaId: CUOTA_ID, fechaPago: "2099-01-01" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería rechazar la fecha");
    expect(r.fieldErrors?.fechaPago?.[0]).toBe("La fecha del pago no puede ser futura");
    expect(q.advertenciaPagoFueraDeOrden).not.toHaveBeenCalled();
    sinEscrituraDePago();
  });

  it("rechaza observaciones de más del máximo", async () => {
    const r = await registrarPagoCuotaAction({
      cuotaId: CUOTA_ID,
      observaciones: "x".repeat(OBSERVACIONES_PAGO_MAX + 1),
    });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería rechazar las observaciones");
    expect(r.fieldErrors?.observaciones).toBeDefined();
    sinEscrituraDePago();
  });

  it("pagar fuera de orden pide confirmación y no registra nada", async () => {
    q.advertenciaPagoFueraDeOrden.mockResolvedValue("La cuota 1 sigue pendiente. ¿Registrar igual?");

    const r = await registrarPagoCuotaAction({ cuotaId: CUOTA_ID });

    expect(r).toEqual({
      ok: false,
      requiereConfirmacion: true,
      error: "La cuota 1 sigue pendiente. ¿Registrar igual?",
    });
    sinEscrituraDePago();
  });

  it("confirmado, registra sin volver a advertir", async () => {
    q.advertenciaPagoFueraDeOrden.mockResolvedValue("fuera de orden");

    const r = await registrarPagoCuotaAction({ cuotaId: CUOTA_ID }, { confirmar: true });

    expect(r.ok).toBe(true);
    expect(q.advertenciaPagoFueraDeOrden).not.toHaveBeenCalled();
    expect(q.registrarPagoCuota).toHaveBeenCalledOnce();
  });

  it("registra con fecha retroactiva y observaciones, sincroniza la asignación DE LA CUOTA y audita", async () => {
    const r = await registrarPagoCuotaAction({
      cuotaId: CUOTA_ID,
      fechaPago: "2026-01-15",
      observaciones: "  Transferencia Galicia  ",
      asignacionId: ASIG_AJENA,
    });

    expect(r).toEqual({ ok: true, data: { id: CUOTA_ID } });
    expect(q.registrarPagoCuota).toHaveBeenCalledWith({
      cuotaId: CUOTA_ID,
      fechaPagoEfectivo: new Date("2026-01-15T00:00:00.000Z"),
      observaciones: "Transferencia Galicia",
      registradoPor: IDS.admin,
    });
    expect(q.sincronizarPasosPago).toHaveBeenCalledWith(ASIG_ID, IDS.admin);
    expect(auditoriasDe("registrar_pago")).toEqual([
      expect.objectContaining({
        entidadTipo: "cuota",
        entidadId: CUOTA_ID,
        metadata: {
          numero: 2,
          canal: "agencia",
          fechaPago: "2026-01-15",
          observaciones: "Transferencia Galicia",
        },
      }),
    ]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/alumnos/[id]", "page");
  });

  it("observaciones en blanco no se guardan ni se auditan", async () => {
    await registrarPagoCuotaAction({ cuotaId: CUOTA_ID, observaciones: "   " });

    expect(q.registrarPagoCuota).toHaveBeenCalledWith(
      expect.objectContaining({ observaciones: undefined, fechaPagoEfectivo: undefined })
    );
    expect(auditoriasDe("registrar_pago")[0]?.metadata).toEqual({ numero: 2, canal: "agencia" });
  });

  it("una cuota inexistente devuelve error claro sin sincronizar", async () => {
    q.registrarPagoCuota.mockRejectedValue(new CuotaNotFoundError(CUOTA_ID));

    const r = await registrarPagoCuotaAction({ cuotaId: CUOTA_ID });

    expect(r).toEqual({ ok: false, error: "La cuota no existe." });
    expect(q.sincronizarPasosPago).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("confirmarUltimoPagoPresencialAction", () => {
  const planPresencial = [
    { id: "cuota-1", numero: 1, esUltimaCuota: 0, canal: "agencia" },
    { id: ULTIMA_ID, numero: 2, esUltimaCuota: 1, canal: "presencial" },
  ];

  beforeEach(() => {
    q.listCuotasByAsignacion.mockResolvedValue(planPresencial);
    q.registrarPagoCuota.mockResolvedValue({ id: ULTIMA_ID, asignacionId: ASIG_ID, numero: 2, canal: "presencial" });
  });

  it("una asignación inexistente no confirma nada", async () => {
    q.alumnoIdDeAsignacion.mockResolvedValue(null);

    const r = await confirmarUltimoPagoPresencialAction({ asignacionId: ASIG_ID });

    expect(r).toEqual({ ok: false, error: "La asignación no existe." });
    sinEscrituraDePago();
  });

  it("un viaje sin excepción presencial no admite B2", async () => {
    q.listCuotasByAsignacion.mockResolvedValue([
      { id: ULTIMA_ID, numero: 1, esUltimaCuota: 1, canal: "agencia" },
    ]);

    const r = await confirmarUltimoPagoPresencialAction({ asignacionId: ASIG_ID });

    expect(r.ok).toBe(false);
    sinEscrituraDePago();
  });

  it("un plan sin última cuota no admite B2", async () => {
    q.listCuotasByAsignacion.mockResolvedValue([{ id: "cuota-1", numero: 1, esUltimaCuota: 0, canal: "agencia" }]);

    const r = await confirmarUltimoPagoPresencialAction({ asignacionId: ASIG_ID });

    expect(r).toEqual({ ok: false, error: "El plan no tiene última cuota definida." });
    sinEscrituraDePago();
  });

  it("registra la ÚLTIMA cuota como presencial, sincroniza y audita como B2", async () => {
    const r = await confirmarUltimoPagoPresencialAction({ asignacionId: ASIG_ID, fechaPago: "2026-02-01" });

    expect(r).toEqual({ ok: true, data: { id: ULTIMA_ID } });
    expect(q.registrarPagoCuota).toHaveBeenCalledWith(
      expect.objectContaining({ cuotaId: ULTIMA_ID, canalPresencial: true, registradoPor: IDS.admin })
    );
    expect(q.sincronizarPasosPago).toHaveBeenCalledWith(ASIG_ID, IDS.admin);
    expect(auditoriasDe("registrar_pago")[0]?.metadata).toEqual(
      expect.objectContaining({ canal: "presencial", b2: true, fechaPago: "2026-02-01" })
    );
  });

  it("rechaza una fecha futura también en B2", async () => {
    const r = await confirmarUltimoPagoPresencialAction({ asignacionId: ASIG_ID, fechaPago: "2099-12-31" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería rechazar la fecha");
    expect(r.fieldErrors?.fechaPago).toBeDefined();
    expect(q.listCuotasByAsignacion).not.toHaveBeenCalled();
    sinEscrituraDePago();
  });
});
