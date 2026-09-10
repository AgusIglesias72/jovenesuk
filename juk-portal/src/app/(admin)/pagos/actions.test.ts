import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IDS,
  auditoriasDe,
  loguearComo,
  nextCache,
  resetearMocks,
  sentry,
  sinEfectos,
  sinSesion,
  urlDeRedirect,
} from "@/lib/actions/__tests__/mocks";

const q = vi.hoisted(() => ({
  alumnoIdDeAsignacion: vi.fn(),
  advertenciaPagoFueraDeOrden: vi.fn(),
  registrarPagoCuota: vi.fn(),
  sincronizarPasosPago: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/asignaciones", () => ({ alumnoIdDeAsignacion: q.alumnoIdDeAsignacion }));
vi.mock("@/lib/db/queries/cuotas", () => ({
  advertenciaPagoFueraDeOrden: q.advertenciaPagoFueraDeOrden,
  registrarPagoCuota: q.registrarPagoCuota,
  sincronizarPasosPago: q.sincronizarPasosPago,
}));

import { CuotaNotFoundError } from "@/lib/domain/cuotas";

import { registrarPagoDesdePagosAction } from "./actions";

const CUOTA_ID = "abababab-0000-4000-8000-000000000001";
const ASIG_ID = "abababab-0000-4000-8000-000000000002";

function sinEscritura() {
  expect(q.registrarPagoCuota).not.toHaveBeenCalled();
  expect(q.sincronizarPasosPago).not.toHaveBeenCalled();
  sinEfectos();
}

beforeEach(() => {
  resetearMocks("admin_juk");
  q.advertenciaPagoFueraDeOrden.mockResolvedValue(null);
  q.registrarPagoCuota.mockResolvedValue({ id: CUOTA_ID, asignacionId: ASIG_ID, numero: 1, canal: "agencia" });
  q.sincronizarPasosPago.mockResolvedValue(undefined);
  q.alumnoIdDeAsignacion.mockResolvedValue("alumno-1");
});

describe("registrarPagoDesdePagosAction", () => {
  it("sin sesión redirige sin registrar", async () => {
    sinSesion();

    expect(await urlDeRedirect(() => registrarPagoDesdePagosAction({ cuotaId: CUOTA_ID }))).toBe("/login");
    sinEscritura();
  });

  it("una familia no registra pagos desde el módulo Pagos", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => registrarPagoDesdePagosAction({ cuotaId: CUOTA_ID }))).toBe("/familias");
    sinEscritura();
  });

  it("valida cuota, fecha futura y largo de observaciones con fieldErrors", async () => {
    const r = await registrarPagoDesdePagosAction({
      cuotaId: "no-uuid",
      fechaPago: "2099-06-01",
      observaciones: "y".repeat(600),
    });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.cuotaId).toBeDefined();
    expect(r.fieldErrors?.fechaPago?.[0]).toBe("La fecha del pago no puede ser futura");
    expect(r.fieldErrors?.observaciones).toBeDefined();
    sinEscritura();
  });

  it("una fecha ilegible es un error de campo, no una excepción", async () => {
    const r = await registrarPagoDesdePagosAction({ cuotaId: CUOTA_ID, fechaPago: "31/02/2026" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.fechaPago).toBeDefined();
    sinEscritura();
  });

  it("pagar fuera de orden pide confirmación", async () => {
    q.advertenciaPagoFueraDeOrden.mockResolvedValue("Hay cuotas anteriores impagas.");

    const r = await registrarPagoDesdePagosAction({ cuotaId: CUOTA_ID });

    expect(r).toEqual({ ok: false, requiereConfirmacion: true, error: "Hay cuotas anteriores impagas." });
    sinEscritura();
  });

  it("registra, sincroniza, audita con origen módulo Pagos y revalida Pagos y la ficha", async () => {
    const r = await registrarPagoDesdePagosAction({
      cuotaId: CUOTA_ID,
      fechaPago: "2026-03-02",
      observaciones: "Efectivo en oficina",
    });

    expect(r).toEqual({ ok: true, data: { id: CUOTA_ID } });
    expect(q.registrarPagoCuota).toHaveBeenCalledWith({
      cuotaId: CUOTA_ID,
      fechaPagoEfectivo: new Date("2026-03-02T00:00:00.000Z"),
      observaciones: "Efectivo en oficina",
      registradoPor: IDS.admin,
    });
    expect(q.sincronizarPasosPago).toHaveBeenCalledWith(ASIG_ID, IDS.admin);
    expect(auditoriasDe("registrar_pago")[0]?.metadata).toEqual({
      numero: 1,
      canal: "agencia",
      desde: "modulo_pagos",
      fechaPago: "2026-03-02",
      observaciones: "Efectivo en oficina",
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/pagos");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/alumnos/[id]", "page");
  });

  it("una cuota inexistente devuelve error claro", async () => {
    q.registrarPagoCuota.mockRejectedValue(new CuotaNotFoundError(CUOTA_ID));

    const r = await registrarPagoDesdePagosAction({ cuotaId: CUOTA_ID });

    expect(r).toEqual({ ok: false, error: "La cuota no existe." });
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("si la sincronización de pasos falla, lo reporta y no audita un pago a medias", async () => {
    q.sincronizarPasosPago.mockRejectedValue(new Error("neon caído"));

    const r = await registrarPagoDesdePagosAction({ cuotaId: CUOTA_ID });

    expect(r).toEqual({ ok: false, error: "No pudimos registrar el pago." });
    expect(sentry.captureException).toHaveBeenCalledOnce();
    sinEfectos();
  });
});
