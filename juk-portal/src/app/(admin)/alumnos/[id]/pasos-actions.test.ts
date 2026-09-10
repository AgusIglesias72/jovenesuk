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
  getPasoAlumnoById: vi.fn(),
  updatePasoAlumno: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/asignaciones", () => ({ alumnoIdDeAsignacion: q.alumnoIdDeAsignacion }));
vi.mock("@/lib/db/queries/pasos-alumno", () => ({
  getPasoAlumnoById: q.getPasoAlumnoById,
  updatePasoAlumno: q.updatePasoAlumno,
}));

import {
  actualizarFechaLimiteA1Action,
  actualizarSubEstadoPasoAction,
  transicionarPasoAlumnoAction,
} from "./pasos-actions";

const PASO_ID = "eeeeeeee-0000-4000-8000-000000000001";
const ASIG_ID = "eeeeeeee-0000-4000-8000-000000000002";
const ALUMNO_ID = "eeeeeeee-0000-4000-8000-000000000003";

type PasoFake = {
  id: string;
  asignacionId: string;
  codigo: string;
  estado: string;
  metadata: Record<string, unknown>;
  fechaLimite: Date | null;
};

function paso(over: Partial<PasoFake> = {}): PasoFake {
  return {
    id: PASO_ID,
    asignacionId: ASIG_ID,
    codigo: "a2",
    estado: "pendiente",
    metadata: {},
    fechaLimite: null,
    ...over,
  };
}

function sinEscritura() {
  expect(q.updatePasoAlumno).not.toHaveBeenCalled();
  sinEfectos();
}

beforeEach(() => {
  resetearMocks("admin_juk");
  q.getPasoAlumnoById.mockResolvedValue(paso());
  q.alumnoIdDeAsignacion.mockResolvedValue(ALUMNO_ID);
  q.updatePasoAlumno.mockResolvedValue(undefined);
});

describe("transicionarPasoAlumnoAction", () => {
  it("sin sesión redirige sin leer el paso", async () => {
    sinSesion();

    expect(
      await urlDeRedirect(() => transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "completado" }))
    ).toBe("/login");
    expect(q.getPasoAlumnoById).not.toHaveBeenCalled();
  });

  it("una familia no puede mover pasos del tablero interno", async () => {
    loguearComo("familia");

    expect(
      await urlDeRedirect(() => transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "completado" }))
    ).toBe("/familias");
    sinEscritura();
  });

  it.each([undefined, "", "    "])("bloquear exige nota (nota=%j)", async (nota) => {
    const r = await transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "bloqueado", nota });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería exigir la nota");
    expect(r.error).toBe("Contá el motivo del bloqueo.");
    expect(r.fieldErrors?.nota?.[0]).toBe("Contá el motivo del bloqueo.");
    expect(q.getPasoAlumnoById).not.toHaveBeenCalled();
    sinEscritura();
  });

  it("un estado fuera del catálogo devuelve fieldErrors", async () => {
    const r = await transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "aprobado" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.nuevoEstado).toBeDefined();
    sinEscritura();
  });

  it("un paso inexistente no se escribe", async () => {
    q.getPasoAlumnoById.mockResolvedValue(null);

    const r = await transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "completado" });

    expect(r).toEqual({ ok: false, error: "El paso no existe." });
    sinEscritura();
  });

  it("el Paso 0 es de solo lectura", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "paso_0" }));

    const r = await transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "completado" });

    expect(r).toEqual({ ok: false, error: "El Paso 0 es de solo lectura." });
    sinEscritura();
  });

  it("B1 se deriva del plan de cuotas: no se mueve a mano", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "b1" }));

    const r = await transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "completado" });

    expect(r.ok).toBe(false);
    sinEscritura();
  });

  it.each([
    ["completado", "bloqueado", "a2"],
    ["bloqueado", "completado", "a2"],
    ["pendiente", "vencido", "c2"],
  ])("rechaza %s → %s en %s", async (actual, nuevoEstado, codigo) => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo, estado: actual }));

    const r = await transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado, nota: "motivo" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería rechazar la transición");
    expect(r.error).toContain(codigo.toUpperCase());
    sinEscritura();
  });

  it("completar fija la fecha de completado, audita el antes/después y revalida la ficha", async () => {
    const r = await transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "completado" });

    expect(r).toEqual({ ok: true, data: { id: PASO_ID, estado: "completado" } });
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      { estado: "completado", fechaCompletado: expect.any(Date) },
      IDS.admin
    );
    expect(auditoriasDe("cambio_estado_paso")).toEqual([
      expect.objectContaining({
        entidadTipo: "paso_alumno",
        entidadId: PASO_ID,
        usuarioId: IDS.admin,
        metadata: { codigo: "a2", estadoAnterior: "pendiente", estado: "completado" },
      }),
    ]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/alumnos/[id]", "page");
  });

  it("bloquear con nota la guarda en el paso y en la auditoría, y limpia la fecha de completado", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ estado: "en_progreso" }));

    const r = await transicionarPasoAlumnoAction({
      pasoId: PASO_ID,
      nuevoEstado: "bloqueado",
      nota: "  Falta la firma del tutor  ",
    });

    expect(r.ok).toBe(true);
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      { estado: "bloqueado", fechaCompletado: null, notas: "Falta la firma del tutor" },
      IDS.admin
    );
    expect(auditoriasDe("cambio_estado_paso")[0]?.metadata).toEqual(
      expect.objectContaining({ nota: "Falta la firma del tutor" })
    );
  });

  it("un error de la query va a Sentry y no audita", async () => {
    q.updatePasoAlumno.mockRejectedValue(new Error("neon caído"));

    const r = await transicionarPasoAlumnoAction({ pasoId: PASO_ID, nuevoEstado: "en_progreso" });

    expect(r).toEqual({ ok: false, error: "No pudimos actualizar el paso." });
    expect(sentry.captureException).toHaveBeenCalledOnce();
    sinEfectos();
  });
});

describe("actualizarFechaLimiteA1Action", () => {
  it("una familia no puede tocar fechas límite", async () => {
    loguearComo("familia");

    expect(
      await urlDeRedirect(() => actualizarFechaLimiteA1Action({ pasoId: PASO_ID, fechaLimite: "2027-06-01" }))
    ).toBe("/familias");
    sinEscritura();
  });

  it("exige la fecha", async () => {
    const r = await actualizarFechaLimiteA1Action({ pasoId: PASO_ID, fechaLimite: "" });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.fechaLimite?.[0]).toBe("Elegí la fecha límite");
    sinEscritura();
  });

  it("solo A1 tiene fecha límite", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "c2" }));

    const r = await actualizarFechaLimiteA1Action({ pasoId: PASO_ID, fechaLimite: "2027-06-01" });

    expect(r).toEqual({ ok: false, error: "Este paso no tiene fecha límite." });
    sinEscritura();
  });

  it("actualiza A1 y audita la fecha anterior y la nueva", async () => {
    q.getPasoAlumnoById.mockResolvedValue(
      paso({ codigo: "a1", fechaLimite: new Date("2027-05-01T00:00:00.000Z") })
    );

    const r = await actualizarFechaLimiteA1Action({ pasoId: PASO_ID, fechaLimite: "2027-06-01" });

    expect(r).toEqual({ ok: true, data: { id: PASO_ID, fechaLimite: "2027-06-01" } });
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      { fechaLimite: new Date("2027-06-01T00:00:00.000Z") },
      IDS.admin
    );
    expect(auditoriasDe("update")[0]?.cambios).toEqual({
      before: { fechaLimite: "2027-05-01" },
      after: { fechaLimite: "2027-06-01" },
    });
  });
});

describe("actualizarSubEstadoPasoAction", () => {
  it("ETA aprobado completa C1 y conserva el resto de la metadata", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "c1", metadata: { archivoUrl: "/x.pdf" } }));

    const r = await actualizarSubEstadoPasoAction({ pasoId: PASO_ID, subEstado: "aprobado" });

    expect(r).toEqual({ ok: true, data: { id: PASO_ID, estado: "completado", subEstado: "aprobado" } });
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      {
        estado: "completado",
        metadata: { archivoUrl: "/x.pdf", subEstado: "aprobado" },
        fechaCompletado: expect.any(Date),
      },
      IDS.admin
    );
  });

  it("un sub-estado de Parental Consent no vale para el ETA", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "c1" }));

    const r = await actualizarSubEstadoPasoAction({ pasoId: PASO_ID, subEstado: "firmado" });

    expect(r).toEqual({ ok: false, error: "Sub-estado de ETA desconocido." });
    sinEscritura();
  });

  it("Parental Consent firmado queda en progreso; un número de autorización vacío se borra", async () => {
    q.getPasoAlumnoById.mockResolvedValue(
      paso({ codigo: "a3", metadata: { numeroAutorizacion: "ABC-1" } })
    );

    const r = await actualizarSubEstadoPasoAction({
      pasoId: PASO_ID,
      subEstado: "firmado",
      numeroAutorizacion: "",
    });

    expect(r.ok && r.data.estado).toBe("en_progreso");
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      { estado: "en_progreso", metadata: { subEstado: "firmado" }, fechaCompletado: null },
      IDS.admin
    );
  });

  it("un paso sin sub-estados lo rechaza", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "d1" }));

    const r = await actualizarSubEstadoPasoAction({ pasoId: PASO_ID, subEstado: "aprobado" });

    expect(r).toEqual({ ok: false, error: "Este paso no maneja sub-estados." });
    sinEscritura();
  });

  it("una familia no puede fijar sub-estados desde el back-office", async () => {
    loguearComo("familia");

    expect(
      await urlDeRedirect(() => actualizarSubEstadoPasoAction({ pasoId: PASO_ID, subEstado: "aprobado" }))
    ).toBe("/familias");
    sinEscritura();
  });
});
