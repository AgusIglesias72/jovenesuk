import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  auditoria,
  auditoriasDe,
  nextCache,
  resetearMocks,
  sentry,
  sinEfectos,
  sinSesion,
  loguearComo,
  urlDeRedirect,
} from "@/lib/actions/__tests__/mocks";

const q = vi.hoisted(() => ({
  createViaje: vi.fn(),
  getViajeById: vi.fn(),
  setViajeEstado: vi.fn(),
  updateViaje: vi.fn(),
  listAsignacionesByViaje: vi.fn(),
  trigger: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/viajes", () => ({
  createViaje: q.createViaje,
  getViajeById: q.getViajeById,
  setViajeEstado: q.setViajeEstado,
  updateViaje: q.updateViaje,
}));
vi.mock("@/lib/db/queries/asignaciones", () => ({
  listAsignacionesByViaje: q.listAsignacionesByViaje,
}));
vi.mock("@trigger.dev/sdk/v3", () => ({ tasks: { trigger: q.trigger } }));
vi.mock("@/trigger/viajes", () => ({ notificarCancelacionViaje: {} }));

import { ViajeNotFoundError } from "@/lib/domain/viajes";

import { cancelarViajeAction, createViajeAction, updateViajeAction } from "./actions";

const VIAJE_ID = "bbbbbbbb-0000-4000-8000-000000000001";

const viajeActual = {
  id: VIAJE_ID,
  codigo: "UK-2027-JUL-LONDON",
  estado: "inscripcion_abierta",
  tipo: "grupal",
  fechaInicio: new Date("2027-07-01T00:00:00.000Z"),
  fechaFin: new Date("2027-07-20T00:00:00.000Z"),
};

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetearMocks("admin_juk");
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  q.getViajeById.mockResolvedValue(viajeActual);
  q.setViajeEstado.mockImplementation(async (id: string, estado: string) => ({
    ...viajeActual,
    id,
    estado,
  }));
  q.trigger.mockResolvedValue({ id: "run_1" });
});

describe("cancelarViajeAction", () => {
  it("sin sesión redirige a /login sin tocar el viaje", async () => {
    sinSesion();

    expect(await urlDeRedirect(() => cancelarViajeAction(VIAJE_ID))).toBe("/login");
    expect(q.getViajeById).not.toHaveBeenCalled();
    expect(q.setViajeEstado).not.toHaveBeenCalled();
  });

  it("una familia no puede cancelar viajes: la manda a su portal", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => cancelarViajeAction(VIAJE_ID))).toBe("/familias");
    expect(q.setViajeEstado).not.toHaveBeenCalled();
  });

  it("rechaza un id que no es uuid (ej. el código del viaje) sin consultar la base", async () => {
    const r = await cancelarViajeAction("UK-2027-JUL-LONDON");

    expect(r).toEqual({ ok: false, error: "Viaje inválido." });
    expect(q.getViajeById).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("cancela, audita el estado anterior y revalida listado, detalle y edición", async () => {
    const r = await cancelarViajeAction(VIAJE_ID);

    expect(r.ok).toBe(true);
    expect(q.setViajeEstado).toHaveBeenCalledWith(VIAJE_ID, "cancelado");
    expect(auditoriasDe("cambio_estado_viaje")).toEqual([
      expect.objectContaining({
        entidadTipo: "viaje",
        entidadId: VIAJE_ID,
        usuarioId: expect.any(String),
        metadata: {
          estadoAnterior: "inscripcion_abierta",
          estado: "cancelado",
          notificarInscriptos: false,
        },
      }),
    ]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/viajes");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/viajes/[id]", "page");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/viajes/[id]/editar", "page");
    expect(q.trigger).not.toHaveBeenCalled();
  });

  it("con notificarInscriptos encola el job de avisos en vez de mandar mails en la action", async () => {
    const r = await cancelarViajeAction(VIAJE_ID, { notificarInscriptos: true });

    expect(r.ok).toBe(true);
    expect(q.trigger).toHaveBeenCalledWith("notificar-cancelacion-viaje", { viajeId: VIAJE_ID });
  });

  it("si Trigger.dev no está disponible, la cancelación igual queda hecha", async () => {
    q.trigger.mockRejectedValue(new Error("TRIGGER_SECRET_KEY missing"));

    const r = await cancelarViajeAction(VIAJE_ID, { notificarInscriptos: true });

    expect(r.ok).toBe(true);
    expect(sentry.captureException).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalled();
  });

  it.each(["finalizado", "cancelado"] as const)(
    "no cancela un viaje %s (estado terminal) ni re-notifica",
    async (estado) => {
      q.getViajeById.mockResolvedValue({ ...viajeActual, estado });

      const r = await cancelarViajeAction(VIAJE_ID, { notificarInscriptos: true });

      expect(r.ok).toBe(false);
      expect(q.setViajeEstado).not.toHaveBeenCalled();
      expect(q.trigger).not.toHaveBeenCalled();
      sinEfectos();
    }
  );

  it.each(["confirmado", "en_curso"] as const)("cancela un viaje %s", async (estado) => {
    q.getViajeById.mockResolvedValue({ ...viajeActual, estado });

    const r = await cancelarViajeAction(VIAJE_ID);

    expect(r.ok).toBe(true);
    expect(q.setViajeEstado).toHaveBeenCalledWith(VIAJE_ID, "cancelado");
  });

  it("un viaje inexistente devuelve error claro", async () => {
    q.getViajeById.mockResolvedValue(null);

    const r = await cancelarViajeAction(VIAJE_ID);

    expect(r).toEqual({ ok: false, error: "El viaje no existe." });
    expect(q.setViajeEstado).not.toHaveBeenCalled();
  });

  it("si el viaje desaparece entre la lectura y el update, no reporta a Sentry", async () => {
    q.setViajeEstado.mockRejectedValue(new ViajeNotFoundError(VIAJE_ID));

    const r = await cancelarViajeAction(VIAJE_ID);

    expect(r).toEqual({ ok: false, error: "El viaje no existe." });
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(auditoria.safeAudit).not.toHaveBeenCalled();
  });
});

describe("createViajeAction", () => {
  it("una familia no puede crear viajes", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => createViajeAction({}))).toBe("/familias");
    expect(q.createViaje).not.toHaveBeenCalled();
  });

  it("input inválido → fieldErrors y sin escritura", async () => {
    const r = await createViajeAction({ codigo: "", nombre: "" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors).toBeDefined();
    expect(Object.keys(r.fieldErrors ?? {}).length).toBeGreaterThan(0);
    expect(q.createViaje).not.toHaveBeenCalled();
    sinEfectos();
  });
});

describe("updateViajeAction", () => {
  it("una familia no puede editar viajes", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => updateViajeAction({ id: VIAJE_ID }))).toBe("/familias");
    expect(q.getViajeById).not.toHaveBeenCalled();
    expect(q.updateViaje).not.toHaveBeenCalled();
  });

  it("input inválido → fieldErrors y sin escritura", async () => {
    const r = await updateViajeAction({ id: "no-es-uuid" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.id).toBeDefined();
    expect(q.updateViaje).not.toHaveBeenCalled();
  });
});
