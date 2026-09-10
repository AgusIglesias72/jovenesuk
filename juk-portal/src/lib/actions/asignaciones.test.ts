import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminJuk = vi.fn();
const getAlumnoById = vi.fn();
const getViajeById = vi.fn();
const countAsignacionesActivas = vi.fn();
const cancelarAsignacion = vi.fn();
const asignarConTablero = vi.fn();
const safeAudit = vi.fn();
const revalidatePath = vi.fn();
const captureException = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));
vi.mock("@/lib/auth/helpers", () => ({
  requireAdminJuk: (...args: unknown[]) => requireAdminJuk(...args),
}));
vi.mock("@/lib/db/queries/alumnos", () => ({
  getAlumnoById: (...args: unknown[]) => getAlumnoById(...args),
}));
vi.mock("@/lib/db/queries/viajes", () => ({
  getViajeById: (...args: unknown[]) => getViajeById(...args),
}));
vi.mock("@/lib/db/queries/asignaciones", () => ({
  countAsignacionesActivas: (...args: unknown[]) => countAsignacionesActivas(...args),
  cancelarAsignacion: (...args: unknown[]) => cancelarAsignacion(...args),
}));
vi.mock("@/lib/db/queries/asignar-alumno", () => ({
  asignarConTablero: (...args: unknown[]) => asignarConTablero(...args),
}));
vi.mock("@/lib/actions/safe-audit", () => ({
  safeAudit: (...args: unknown[]) => safeAudit(...args),
}));

import { AsignacionNotFoundError } from "@/lib/domain/asignaciones";

import { asignarAlumnoAction, desasignarAlumnoAction } from "./asignaciones";

const SESSION = { user: { id: "11111111-1111-1111-1111-111111111111" } };
const VIAJE_ID = "22222222-2222-2222-2222-222222222222";
const ALUMNO_ID = "33333333-3333-3333-3333-333333333333";
const ASIGNACION_ID = "44444444-4444-4444-4444-444444444444";

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

function revalidoAmbasFichas() {
  expect(revalidatePath).toHaveBeenCalledWith("/viajes/[id]", "page");
  expect(revalidatePath).toHaveBeenCalledWith("/alumnos/[id]", "page");
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminJuk.mockResolvedValue(SESSION);
  getViajeById.mockResolvedValue(viaje);
  getAlumnoById.mockResolvedValue(alumno);
  countAsignacionesActivas.mockResolvedValue(3);
  asignarConTablero.mockResolvedValue({
    asignacionId: ASIGNACION_ID,
    autoConfirmado: false,
    pasosCreados: 11,
  });
  cancelarAsignacion.mockResolvedValue({ id: ASIGNACION_ID });
  safeAudit.mockResolvedValue(undefined);
});

describe("asignarAlumnoAction", () => {
  it("asigna, audita y revalida el viaje Y la ficha del alumno", async () => {
    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r).toEqual({ ok: true, data: { id: ASIGNACION_ID } });
    expect(asignarConTablero).toHaveBeenCalledWith({
      viaje,
      alumno,
      usuarioId: SESSION.user.id,
    });
    expect(safeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "asignar_a_viaje", entidadId: ASIGNACION_ID })
    );
    revalidoAmbasFichas();
  });

  it("audita la auto-confirmación del viaje al quinto inscripto", async () => {
    asignarConTablero.mockResolvedValue({
      asignacionId: ASIGNACION_ID,
      autoConfirmado: true,
      pasosCreados: 11,
    });

    await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(safeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "cambio_estado_viaje", entidadId: VIAJE_ID })
    );
  });

  it("rechaza ids que no son uuid sin tocar la base", async () => {
    const r = await asignarAlumnoAction("UK-2027-FEB-LONDON", ALUMNO_ID);

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(getViajeById).not.toHaveBeenCalled();
  });

  it("con pasaporte vencido pide confirmación y no crea el tablero", async () => {
    getAlumnoById.mockResolvedValue({
      ...alumno,
      fechaVencimientoPasaporte: new Date("2020-01-01T00:00:00.000Z"),
    });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería pedir confirmación");
    expect(r.requiereConfirmacion).toBe(true);
    expect(r.error).toContain("pasaporte");
    expect(asignarConTablero).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("confirmada la advertencia, asigna igual", async () => {
    getAlumnoById.mockResolvedValue({
      ...alumno,
      fechaVencimientoPasaporte: new Date("2020-01-01T00:00:00.000Z"),
    });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID, { confirmar: true });

    expect(r.ok).toBe(true);
    expect(asignarConTablero).toHaveBeenCalledOnce();
  });

  it("con el cupo lleno advierte sobre-capacidad", async () => {
    countAsignacionesActivas.mockResolvedValue(12);

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería pedir confirmación");
    expect(r.requiereConfirmacion).toBe(true);
    expect(r.error).toContain("capacidad máxima");
  });

  it("no inscribe en un viaje que no admite altas", async () => {
    getViajeById.mockResolvedValue({ ...viaje, estado: "en_curso" });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID, { confirmar: true });

    expect(r.ok).toBe(false);
    expect(asignarConTablero).not.toHaveBeenCalled();
  });

  it("no inscribe a un alumno dado de baja", async () => {
    getAlumnoById.mockResolvedValue({ ...alumno, estado: "baja" });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID, { confirmar: true });

    expect(r).toEqual({ ok: false, error: "El alumno está dado de baja." });
  });

  it("traduce el unique (alumno, viaje) a un mensaje claro", async () => {
    asignarConTablero.mockRejectedValue({ message: "Failed query", cause: { code: "23505" } });

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r).toEqual({ ok: false, error: "El alumno ya está asignado a este viaje." });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("un error inesperado va a Sentry y devuelve un mensaje genérico", async () => {
    asignarConTablero.mockRejectedValue(new Error("boom"));

    const r = await asignarAlumnoAction(VIAJE_ID, ALUMNO_ID);

    expect(r).toEqual({ ok: false, error: "No pudimos asignar al alumno." });
    expect(captureException).toHaveBeenCalledOnce();
  });
});

describe("desasignarAlumnoAction", () => {
  it("cancela, audita y revalida las dos fichas", async () => {
    const r = await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID);

    expect(r).toEqual({ ok: true, data: { id: ASIGNACION_ID } });
    expect(cancelarAsignacion).toHaveBeenCalledWith(ASIGNACION_ID, VIAJE_ID, null);
    revalidoAmbasFichas();
  });

  it("en un viaje en curso la baja es extraordinaria y pide confirmación", async () => {
    getViajeById.mockResolvedValue({ ...viaje, estado: "en_curso" });

    const r = await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería pedir confirmación");
    expect(r.requiereConfirmacion).toBe(true);
    expect(cancelarAsignacion).not.toHaveBeenCalled();
  });

  it("confirmada la baja extraordinaria, guarda el motivo", async () => {
    getViajeById.mockResolvedValue({ ...viaje, estado: "en_curso" });

    await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID, {
      confirmar: true,
      motivo: "regreso anticipado",
    });

    expect(cancelarAsignacion).toHaveBeenCalledWith(ASIGNACION_ID, VIAJE_ID, "regreso anticipado");
  });

  it("una asignación inexistente o ya cancelada devuelve un error claro", async () => {
    cancelarAsignacion.mockRejectedValue(new AsignacionNotFoundError(ASIGNACION_ID));

    const r = await desasignarAlumnoAction(ASIGNACION_ID, VIAJE_ID);

    expect(r).toEqual({ ok: false, error: "La asignación no existe o ya fue cancelada." });
  });
});
