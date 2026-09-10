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
  getAlumnoById: vi.fn(),
  getViajeById: vi.fn(),
  countAsignacionesActivas: vi.fn(),
  cancelarAsignacion: vi.fn(),
  asignarConTablero: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/alumnos", () => ({ getAlumnoById: q.getAlumnoById }));
vi.mock("@/lib/db/queries/viajes", () => ({ getViajeById: q.getViajeById }));
vi.mock("@/lib/db/queries/asignaciones", () => ({
  countAsignacionesActivas: q.countAsignacionesActivas,
  cancelarAsignacion: q.cancelarAsignacion,
}));
vi.mock("@/lib/db/queries/asignar-alumno", () => ({ asignarConTablero: q.asignarConTablero }));

import { AsignacionNotFoundError, ViajeNoInscribibleError } from "@/lib/domain/asignaciones";

import { asignarAlumnoAction, desasignarAlumnoAction } from "./asignaciones";

const VIAJE_ID = "22222222-2222-4222-8222-222222222222";
const ALUMNO_ID = "33333333-3333-4333-8333-333333333333";
const ASIGNACION_ID = "44444444-4444-4444-8444-444444444444";

const viaje = {
  id: VIAJE_ID,
  estado: "inscripcion_abierta",
  fechaFin: new Date("2027-02-20T00:00:00.000Z"),
  paisDestino: "reino_unido",
  capacidadMaxima: 12,
};

const alumno = {
  id: ALUMNO_ID,
  estado: "pre_inscripto",
  fechaVencimientoPasaporte: new Date("2032-12-31T00:00:00.000Z"),
};

const PASAPORTE_VENCIDO = new Date("2020-01-01T00:00:00.000Z");

function revalidoAmbasFichas() {
  expect(nextCache.revalidatePath).toHaveBeenCalledWith("/viajes/[id]", "page");
  expect(nextCache.revalidatePath).toHaveBeenCalledWith("/alumnos/[id]", "page");
}

beforeEach(() => {
  resetearMocks("admin_juk");
  q.getViajeById.mockResolvedValue(viaje);
  q.getAlumnoById.mockResolvedValue(alumno);
  q.countAsignacionesActivas.mockResolvedValue(3);
  q.asignarConTablero.mockResolvedValue({
    asignacionId: ASIGNACION_ID,
    autoConfirmado: false,
    pasosCreados: 11,
  });
  q.cancelarAsignacion.mockResolvedValue({ id: ASIGNACION_ID });
});

describe("asignarAlumnoAction", () => {
  it("sin sesión redirige a /login sin leer viaje ni alumno", async () => {
    sinSesion();

    expect(await urlDeRedirect(() => asignarAlumnoAction(VIAJE_ID, ALUMNO_ID))).toBe("/login");
    expect(q.getViajeById).not.toHaveBeenCalled();
    expect(q.asignarConTablero).not.toHaveBeenCalled();
  });

  it("una familia no puede inscribir alumnos (ni el suyo)", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => asignarAlumnoAction(VIAJE_ID, ALUMNO_ID, { confirmar: true }))).toBe(
      "/familias"
    );
    expect(q.asignarConTablero).not.toHaveBeenCalled();
  });

  it("super_admin también asigna", async () => {
    loguearComo("super_admin");

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r.ok).toBe(true);
    expect(q.asignarConTablero).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: IDS.superAdmin })
    );
  });

  it("asigna con el usuario de la sesión, audita y revalida el viaje Y la ficha del alumno", async () => {
    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r).toEqual({ ok: true, data: { id: ASIGNACION_ID } });
    expect(q.asignarConTablero).toHaveBeenCalledWith({ viaje, alumno, usuarioId: IDS.admin });
    expect(auditoriasDe("asignar_a_viaje")).toEqual([
      expect.objectContaining({
        entidadTipo: "asignacion",
        entidadId: ASIGNACION_ID,
        usuarioId: IDS.admin,
        metadata: { viajeId: VIAJE_ID, alumnoId: ALUMNO_ID, pasosCreados: 11 },
      }),
    ]);
    expect(auditoriasDe("cambio_estado_viaje")).toHaveLength(0);
    revalidoAmbasFichas();
  });

  it("al quinto inscripto audita la auto-confirmación del viaje con su motivo", async () => {
    q.asignarConTablero.mockResolvedValue({
      asignacionId: ASIGNACION_ID,
      autoConfirmado: true,
      pasosCreados: 11,
    });

    await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(auditoriasDe("cambio_estado_viaje")).toEqual([
      expect.objectContaining({
        entidadTipo: "viaje",
        entidadId: VIAJE_ID,
        metadata: { estadoAnterior: "inscripcion_abierta", estado: "confirmado", motivo: "auto_5_alumnos" },
      }),
    ]);
  });

  it("rechaza ids que no son uuid sin tocar la base", async () => {
    const r = await asignarAlumnoAction("UK-2027-FEB-LONDON", ALUMNO_ID);

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(q.getViajeById).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("viaje o alumno inexistente no crea tablero", async () => {
    q.getAlumnoById.mockResolvedValue(null);

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID, { confirmar: true });

    expect(r).toEqual({ ok: false, error: "Viaje o alumno inexistente." });
    expect(q.asignarConTablero).not.toHaveBeenCalled();
  });

  it("con pasaporte vencido pide confirmación y no crea el tablero", async () => {
    q.getAlumnoById.mockResolvedValue({ ...alumno, fechaVencimientoPasaporte: PASAPORTE_VENCIDO });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería pedir confirmación");
    expect(r.requiereConfirmacion).toBe(true);
    expect(r.error).toContain("pasaporte");
    expect(q.asignarConTablero).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("confirmada la advertencia, asigna igual", async () => {
    q.getAlumnoById.mockResolvedValue({ ...alumno, fechaVencimientoPasaporte: PASAPORTE_VENCIDO });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID, { confirmar: true });

    expect(r.ok).toBe(true);
    expect(q.asignarConTablero).toHaveBeenCalledOnce();
  });

  it("con el cupo lleno advierte sobre-capacidad (no bloquea)", async () => {
    q.countAsignacionesActivas.mockResolvedValue(12);

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería pedir confirmación");
    expect(r.requiereConfirmacion).toBe(true);
    expect(r.error).toContain("capacidad máxima");
    expect(q.asignarConTablero).not.toHaveBeenCalled();
  });

  it("con un lugar libre no advierte", async () => {
    q.countAsignacionesActivas.mockResolvedValue(11);

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r.ok).toBe(true);
  });

  it("pasaporte y cupo juntos se advierten en un solo mensaje", async () => {
    q.getAlumnoById.mockResolvedValue({ ...alumno, fechaVencimientoPasaporte: PASAPORTE_VENCIDO });
    q.countAsignacionesActivas.mockResolvedValue(20);

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería pedir confirmación");
    expect(r.error).toContain("pasaporte");
    expect(r.error).toContain("capacidad máxima");
  });

  it.each(["en_curso", "finalizado", "cancelado"])(
    "no inscribe en un viaje %s aunque se confirme",
    async (estado) => {
      q.getViajeById.mockResolvedValue({ ...viaje, estado });

      const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID, { confirmar: true });

      expect(r.ok).toBe(false);
      expect(q.asignarConTablero).not.toHaveBeenCalled();
    }
  );

  it("no inscribe a un alumno dado de baja", async () => {
    q.getAlumnoById.mockResolvedValue({ ...alumno, estado: "baja" });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID, { confirmar: true });

    expect(r).toEqual({ ok: false, error: "El alumno está dado de baja." });
    expect(q.asignarConTablero).not.toHaveBeenCalled();
  });

  it("traduce el unique (alumno, viaje) a un mensaje claro", async () => {
    q.asignarConTablero.mockRejectedValue({ message: "Failed query", cause: { code: "23505" } });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r).toEqual({ ok: false, error: "El alumno ya está asignado a este viaje." });
    expect(sentry.captureException).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("si el viaje dejó de admitir altas entre la lectura y el trigger, devuelve el motivo", async () => {
    const err = new ViajeNoInscribibleError("finalizado");
    q.asignarConTablero.mockRejectedValue(err);

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r).toEqual({ ok: false, error: err.message });
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("un error inesperado va a Sentry y devuelve un mensaje genérico", async () => {
    q.asignarConTablero.mockRejectedValue(new Error("boom"));

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r).toEqual({ ok: false, error: "No pudimos asignar al alumno." });
    expect(sentry.captureException).toHaveBeenCalledOnce();
  });
});

describe("desasignarAlumnoAction", () => {
  it("una familia no puede quitar alumnos de un viaje", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID))).toBe("/familias");
    expect(q.cancelarAsignacion).not.toHaveBeenCalled();
  });

  it("valida los ids antes de leer el viaje", async () => {
    const r = await desasignarAlumnoAction("x", VIAJE_ID);

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(q.getViajeById).not.toHaveBeenCalled();
    expect(q.cancelarAsignacion).not.toHaveBeenCalled();
  });

  it("cancela filtrando por viaje, audita y revalida las dos fichas", async () => {
    const r = await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID);

    expect(r).toEqual({ ok: true, data: { id: ASIGNACION_ID } });
    expect(q.cancelarAsignacion).toHaveBeenCalledWith(ASIGNACION_ID, VIAJE_ID, null);
    expect(auditoriasDe("desasignar_de_viaje")).toEqual([
      expect.objectContaining({ entidadId: ASIGNACION_ID, usuarioId: IDS.admin }),
    ]);
    revalidoAmbasFichas();
  });

  it.each(["en_curso", "finalizado"])(
    "en un viaje %s la baja es extraordinaria y pide confirmación",
    async (estado) => {
      q.getViajeById.mockResolvedValue({ ...viaje, estado });

      const r = await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID);

      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("debería pedir confirmación");
      expect(r.requiereConfirmacion).toBe(true);
      expect(q.cancelarAsignacion).not.toHaveBeenCalled();
      sinEfectos();
    }
  );

  it("confirmada la baja extraordinaria, guarda el motivo", async () => {
    q.getViajeById.mockResolvedValue({ ...viaje, estado: "en_curso" });

    await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID, {
      confirmar: true,
      motivo: "regreso anticipado",
    });

    expect(q.cancelarAsignacion).toHaveBeenCalledWith(ASIGNACION_ID, VIAJE_ID, "regreso anticipado");
  });

  it("un viaje inexistente no cancela nada", async () => {
    q.getViajeById.mockResolvedValue(null);

    const r = await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID, { confirmar: true });

    expect(r).toEqual({ ok: false, error: "El viaje no existe." });
    expect(q.cancelarAsignacion).not.toHaveBeenCalled();
  });

  it("una asignación inexistente o ya cancelada devuelve un error claro", async () => {
    q.cancelarAsignacion.mockRejectedValue(new AsignacionNotFoundError(ASIGNACION_ID));

    const r = await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID);

    expect(r).toEqual({ ok: false, error: "La asignación no existe o ya fue cancelada." });
    sinEfectos();
  });
});
