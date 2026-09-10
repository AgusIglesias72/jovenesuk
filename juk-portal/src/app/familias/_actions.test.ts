import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IDS,
  auditoriasDe,
  formDataConArchivo,
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
  getAlumnoByDni: vi.fn(),
  alumnoIdDeAsignacion: vi.fn(),
  insertDocumento: vi.fn(),
  getPasoAlumnoById: vi.fn(),
  updatePasoAlumno: vi.fn(),
  sendReporteDatoEmail: vi.fn(),
  putDocumento: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/alumnos", () => ({
  getAlumnoById: q.getAlumnoById,
  getAlumnoByDni: q.getAlumnoByDni,
}));
vi.mock("@/lib/db/queries/asignaciones", () => ({ alumnoIdDeAsignacion: q.alumnoIdDeAsignacion }));
vi.mock("@/lib/db/queries/documentos", () => ({ insertDocumento: q.insertDocumento }));
vi.mock("@/lib/db/queries/pasos-alumno", () => ({
  getPasoAlumnoById: q.getPasoAlumnoById,
  updatePasoAlumno: q.updatePasoAlumno,
}));
vi.mock("@/lib/email/send-reporte-dato", () => ({ sendReporteDatoEmail: q.sendReporteDatoEmail }));
vi.mock("@/lib/storage", () => ({ putDocumento: q.putDocumento }));

import {
  confirmarPasoFamiliaAction,
  reportarDatoFamiliaAction,
  reportarEtaFamiliaAction,
  subirDocumentoFamiliaAction,
} from "./_actions";

const PASO_ID = "dddddddd-0000-4000-8000-000000000001";
const ASIG_ID = "dddddddd-0000-4000-8000-000000000002";
const ALUMNO_ID = "dddddddd-0000-4000-8000-000000000003";
const URL_DOC = "/api/uploads/paso_alumno/doc.pdf";

const alumnoPropio = {
  id: ALUMNO_ID,
  dni: "INT-40111222",
  nombre: "[INT] Sofía",
  apellido: "[INT] Pérez",
  familiaUserId: IDS.familia,
};

function paso(over: Partial<{ codigo: string; estado: string; metadata: Record<string, unknown> }> = {}) {
  return {
    id: PASO_ID,
    asignacionId: ASIG_ID,
    codigo: over.codigo ?? "a1",
    estado: over.estado ?? "pendiente",
    metadata: over.metadata ?? { notaPrevia: "se conserva" },
  };
}

const PDF = { nombre: "application form.pdf", mime: "application/pdf", bytes: 2048 };

/** `null` = el form llega sin el campo "archivo". */
function subir(archivo: { nombre: string; mime: string; bytes: number } | null = PDF) {
  return subirDocumentoFamiliaAction(formDataConArchivo({ pasoId: PASO_ID }, archivo ?? undefined));
}

/** Ninguna escritura de ninguna tabla ni del storage. */
function sinEscrituras() {
  expect(q.putDocumento).not.toHaveBeenCalled();
  expect(q.insertDocumento).not.toHaveBeenCalled();
  expect(q.updatePasoAlumno).not.toHaveBeenCalled();
  sinEfectos();
}

beforeEach(() => {
  resetearMocks("familia");
  q.getPasoAlumnoById.mockResolvedValue(paso());
  q.alumnoIdDeAsignacion.mockResolvedValue(ALUMNO_ID);
  q.getAlumnoById.mockResolvedValue(alumnoPropio);
  q.getAlumnoByDni.mockResolvedValue(alumnoPropio);
  q.putDocumento.mockImplementation(async (key: string) => ({ key, url: URL_DOC }));
  q.insertDocumento.mockResolvedValue({ id: "doc-1" });
  q.updatePasoAlumno.mockResolvedValue(undefined);
  q.sendReporteDatoEmail.mockResolvedValue(undefined);
});

describe("ownership del portal de familias", () => {
  it("una familia NO puede subir un documento al paso de un alumno de otra familia", async () => {
    q.getAlumnoById.mockResolvedValue({ ...alumnoPropio, familiaUserId: IDS.otraFamilia });

    const r = await subir();

    expect(r).toEqual({ ok: false, error: "No tenés acceso a este paso." });
    sinEscrituras();
  });

  it("el dueño se deriva server-side del paso: paso → asignación → alumno", async () => {
    await subir();

    expect(q.getPasoAlumnoById).toHaveBeenCalledWith(PASO_ID);
    expect(q.alumnoIdDeAsignacion).toHaveBeenCalledWith(ASIG_ID);
    expect(q.getAlumnoById).toHaveBeenCalledWith(ALUMNO_ID);
  });

  it("una familia NO puede reportar el ETA de un alumno ajeno", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "c1" }));
    q.getAlumnoById.mockResolvedValue({ ...alumnoPropio, familiaUserId: IDS.otraFamilia });

    const r = await reportarEtaFamiliaAction({ pasoId: PASO_ID, subEstado: "aprobado" });

    expect(r).toEqual({ ok: false, error: "No tenés acceso a este paso." });
    sinEscrituras();
  });

  it("una familia NO puede confirmar un paso de un alumno ajeno", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "d1" }));
    q.getAlumnoById.mockResolvedValue({ ...alumnoPropio, familiaUserId: IDS.otraFamilia });

    const r = await confirmarPasoFamiliaAction({ pasoId: PASO_ID });

    expect(r).toEqual({ ok: false, error: "No tenés acceso a este paso." });
    sinEscrituras();
  });

  it("un alumno sin familia vinculada no es de nadie", async () => {
    q.getAlumnoById.mockResolvedValue({ ...alumnoPropio, familiaUserId: null });

    const r = await subir();

    expect(r).toEqual({ ok: false, error: "No tenés acceso a este paso." });
    sinEscrituras();
  });

  it("una familia NO puede reportar datos de un alumno ajeno (ni se avisa al equipo)", async () => {
    q.getAlumnoByDni.mockResolvedValue({ ...alumnoPropio, familiaUserId: IDS.otraFamilia });

    const r = await reportarDatoFamiliaAction({ alumnoDni: alumnoPropio.dni, campo: "Pasaporte" });

    expect(r).toEqual({ ok: false, error: "No tenés acceso a este alumno." });
    expect(q.sendReporteDatoEmail).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("un paso inexistente o sin asignación no filtra nada", async () => {
    q.getPasoAlumnoById.mockResolvedValueOnce(null);
    expect(await subir()).toEqual({ ok: false, error: "El paso no existe." });

    q.alumnoIdDeAsignacion.mockResolvedValueOnce(null);
    expect(await subir()).toEqual({ ok: false, error: "La asignación del paso no existe." });

    sinEscrituras();
  });

  it("sin sesión redirige a /login antes de leer el paso", async () => {
    sinSesion();

    expect(await urlDeRedirect(() => subir())).toBe("/login");
    expect(q.getPasoAlumnoById).not.toHaveBeenCalled();
  });

  it("un admin del back-office no opera el portal de familias con su sesión", async () => {
    loguearComo("admin_juk");

    expect(await urlDeRedirect(() => confirmarPasoFamiliaAction({ pasoId: PASO_ID }))).toBe(
      "/dashboard"
    );
    expect(q.updatePasoAlumno).not.toHaveBeenCalled();
  });
});

describe("subirDocumentoFamiliaAction", () => {
  it("valida el pasoId y exige un archivo", async () => {
    expect(
      await subirDocumentoFamiliaAction(formDataConArchivo({ pasoId: "../../otro" }, PDF))
    ).toEqual({ ok: false, error: "Datos inválidos." });
    expect(await subir(null)).toEqual({ ok: false, error: "Adjuntá un archivo." });

    expect(q.getPasoAlumnoById).not.toHaveBeenCalled();
    sinEscrituras();
  });

  it("un paso N/A no acepta documentos", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ estado: "na" }));

    const r = await subir();

    expect(r).toEqual({ ok: false, error: "Este trámite no aplica para tu viaje." });
    sinEscrituras();
  });

  it("un paso que no lleva adjunto (B1) no acepta documentos", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "b1" }));

    const r = await subir();

    expect(r).toEqual({ ok: false, error: "Este paso no lleva documento adjunto." });
    sinEscrituras();
  });

  it.each([
    ["un formato no permitido", { nombre: "virus.html", mime: "text/html", bytes: 100 }],
    ["un archivo de más de 10 MB", { nombre: "enorme.pdf", mime: "application/pdf", bytes: 10 * 1024 * 1024 + 1 }],
    ["un archivo vacío", { nombre: "vacio.pdf", mime: "application/pdf", bytes: 0 }],
  ])("rechaza %s sin subirlo al storage", async (_caso, archivo) => {
    const r = await subir(archivo);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería rechazar el archivo");
    expect(r.error.length).toBeGreaterThan(0);
    expect(sentry.captureException).not.toHaveBeenCalled();
    sinEscrituras();
  });

  it("sube al storage, registra el documento, pasa el paso a revisión y audita", async () => {
    const r = await subir();

    expect(r).toEqual({ ok: true, data: { url: URL_DOC } });
    expect(q.putDocumento).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^paso_alumno/${PASO_ID}/.+\\.pdf$`)),
      expect.any(Buffer),
      "application/pdf"
    );
    expect(q.insertDocumento).toHaveBeenCalledWith(
      expect.objectContaining({
        entidadTipo: "paso_alumno",
        entidadId: PASO_ID,
        categoria: "application_form",
        mimeType: "application/pdf",
        tamanoBytes: PDF.bytes,
        uploadedBy: IDS.familia,
      })
    );
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      { metadata: { notaPrevia: "se conserva", archivoUrl: URL_DOC }, estado: "en_progreso" },
      IDS.familia
    );
    expect(auditoriasDe("subir_documento")).toEqual([
      expect.objectContaining({
        entidadId: PASO_ID,
        usuarioId: IDS.familia,
        metadata: expect.objectContaining({ categoria: "application_form", origen: "familia" }),
      }),
    ]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/familias/[dni]", "page");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/familias/[dni]/documentacion", "page");
  });

  it("re-subir sobre un paso ya completado no lo reabre", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ estado: "completado" }));

    await subir();

    const patch = q.updatePasoAlumno.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("estado");
  });

  it("si el storage falla, no registra el documento y reporta a Sentry", async () => {
    q.putDocumento.mockRejectedValue(new Error("R2 caído"));

    const r = await subir();

    expect(r).toEqual({ ok: false, error: "No pudimos subir el documento. Probá de nuevo." });
    expect(sentry.captureException).toHaveBeenCalledOnce();
    expect(q.insertDocumento).not.toHaveBeenCalled();
    expect(q.updatePasoAlumno).not.toHaveBeenCalled();
  });
});

describe("reportarEtaFamiliaAction", () => {
  beforeEach(() => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "c1", metadata: {} }));
  });

  it("rechaza un sub-estado fuera del catálogo sin leer el paso", async () => {
    const r = await reportarEtaFamiliaAction({ pasoId: PASO_ID, subEstado: "hackeado" });

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(q.getPasoAlumnoById).not.toHaveBeenCalled();
  });

  it("solo aplica al paso C1", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "d2" }));

    const r = await reportarEtaFamiliaAction({ pasoId: PASO_ID, subEstado: "en_tramite" });

    expect(r).toEqual({ ok: false, error: "Este paso no admite reporte de ETA." });
    sinEscrituras();
  });

  it("'en trámite' deja el paso en progreso y audita con origen familia", async () => {
    const r = await reportarEtaFamiliaAction({ pasoId: PASO_ID, subEstado: "en_tramite" });

    expect(r).toEqual({ ok: true, data: {} });
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      { estado: "en_progreso", metadata: { subEstado: "en_tramite" } },
      IDS.familia
    );
    expect(auditoriasDe("cambio_estado_paso")[0]?.metadata).toEqual(
      expect.objectContaining({ codigo: "c1", subEstado: "en_tramite", origen: "familia" })
    );
  });

  it("el problema del ETA bloquea el paso y guarda tipo y comentario", async () => {
    await reportarEtaFamiliaAction({
      pasoId: PASO_ID,
      subEstado: "rechazado",
      tipoProblema: "error_datos",
      comentario: "  Me equivoqué en el pasaporte  ",
    });

    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      {
        estado: "bloqueado",
        metadata: {
          subEstado: "rechazado",
          tipoProblema: "error_datos",
          comentarioProblema: "Me equivoqué en el pasaporte",
        },
      },
      IDS.familia
    );
  });

  it("el tipo de problema solo se guarda junto al rechazo", async () => {
    await reportarEtaFamiliaAction({ pasoId: PASO_ID, subEstado: "aprobado", tipoProblema: "problema_app" });

    const patch = q.updatePasoAlumno.mock.calls[0]?.[1] as { metadata: Record<string, unknown> };
    expect(patch.metadata).not.toHaveProperty("tipoProblema");
  });

  it("rechaza un tipo de problema desconocido", async () => {
    const r = await reportarEtaFamiliaAction({
      pasoId: PASO_ID,
      subEstado: "rechazado",
      tipoProblema: "otro",
    });

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(q.updatePasoAlumno).not.toHaveBeenCalled();
  });
});

describe("confirmarPasoFamiliaAction", () => {
  it("solo D1 se confirma desde el portal", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "a1" }));

    const r = await confirmarPasoFamiliaAction({ pasoId: PASO_ID });

    expect(r).toEqual({ ok: false, error: "Este paso no se confirma desde el portal." });
    sinEscrituras();
  });

  it("confirmar D1 pendiente lo pasa a revisión y marca la confirmación", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "d1", metadata: {} }));

    const r = await confirmarPasoFamiliaAction({ pasoId: PASO_ID });

    expect(r).toEqual({ ok: true, data: {} });
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      { estado: "en_progreso", metadata: { confirmadoFamilia: true } },
      IDS.familia
    );
    expect(auditoriasDe("cambio_estado_paso")).toHaveLength(1);
  });

  it("confirmar un D1 que JUK ya completó NO lo reabre", async () => {
    q.getPasoAlumnoById.mockResolvedValue(paso({ codigo: "d1", estado: "completado", metadata: {} }));

    const r = await confirmarPasoFamiliaAction({ pasoId: PASO_ID });

    expect(r.ok).toBe(true);
    expect(q.updatePasoAlumno).toHaveBeenCalledWith(
      PASO_ID,
      { metadata: { confirmadoFamilia: true } },
      IDS.familia
    );
  });

  it("un pasoId inválido no llega a la base", async () => {
    const r = await confirmarPasoFamiliaAction({ pasoId: "1 OR 1=1" });

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(q.getPasoAlumnoById).not.toHaveBeenCalled();
  });
});

describe("reportarDatoFamiliaAction", () => {
  it("valida el campo antes de buscar al alumno", async () => {
    const r = await reportarDatoFamiliaAction({ alumnoDni: alumnoPropio.dni, campo: "   " });

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(q.getAlumnoByDni).not.toHaveBeenCalled();
  });

  it("sin sesión redirige sin buscar al alumno", async () => {
    sinSesion();

    expect(
      await urlDeRedirect(() => reportarDatoFamiliaAction({ alumnoDni: alumnoPropio.dni, campo: "Email" }))
    ).toBe("/login");
    expect(q.getAlumnoByDni).not.toHaveBeenCalled();
  });

  it("registra el reporte en auditoría y avisa al equipo con el email de la familia", async () => {
    const r = await reportarDatoFamiliaAction({
      alumnoDni: alumnoPropio.dni,
      campo: "Fecha de nacimiento",
      comentario: "Es 12/03, no 13/03",
    });

    expect(r).toEqual({ ok: true, data: {} });
    expect(auditoriasDe("update")).toEqual([
      expect.objectContaining({
        entidadTipo: "alumno",
        entidadId: ALUMNO_ID,
        usuarioId: IDS.familia,
        metadata: {
          reporteDato: "Fecha de nacimiento",
          comentario: "Es 12/03, no 13/03",
          origen: "familia",
        },
      }),
    ]);
    expect(q.sendReporteDatoEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        alumnoDni: alumnoPropio.dni,
        campo: "Fecha de nacimiento",
        reportadoPor: "int+familia@int.jovenesenuk.com",
      })
    );
  });

  it("si el email falla, el reporte igual queda registrado y la familia no ve un error", async () => {
    q.sendReporteDatoEmail.mockRejectedValue(new Error("Resend caído"));

    const r = await reportarDatoFamiliaAction({ alumnoDni: alumnoPropio.dni, campo: "Email" });

    expect(r.ok).toBe(true);
    expect(auditoriasDe("update")).toHaveLength(1);
    expect(sentry.captureException).toHaveBeenCalledOnce();
  });
});
