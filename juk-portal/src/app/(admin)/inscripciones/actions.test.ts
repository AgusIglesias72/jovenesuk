import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IDS,
  auditoriasDe,
  loguearComo,
  nextCache,
  resetearMocks,
  sinEfectos,
  sinSesion,
  urlDeRedirect,
} from "@/lib/actions/__tests__/mocks";

const q = vi.hoisted(() => ({
  getInscripcionByNumero: vi.fn(),
  procesarAltaInscripcion: vi.fn(),
  prepararEnvioAcceso: vi.fn(),
  registrarResolucionAlta: vi.fn(),
  anularInscripcion: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/inscripciones", () => ({
  getInscripcionByNumero: q.getInscripcionByNumero,
}));
vi.mock("@/lib/actions/alta-inscripcion", () => ({
  procesarAltaInscripcion: q.procesarAltaInscripcion,
}));
vi.mock("@/lib/db/queries/familias", () => ({ prepararEnvioAcceso: q.prepararEnvioAcceso }));
vi.mock("@/lib/db/queries/resolucion-inscripcion", () => ({
  registrarResolucionAlta: q.registrarResolucionAlta,
}));
vi.mock("@/lib/db/queries/anular-inscripcion", () => ({ anularInscripcion: q.anularInscripcion }));

import type { InscripcionEstado } from "@/lib/domain/inscripciones/schema";

import {
  anularInscripcionAction,
  procesarInscripcionAction,
  reintentarAltaAction,
  resolverVinculoAction,
} from "./actions";

const INSCRIPCION_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const ALUMNO_ID = "bbbbbbbb-0000-4000-8000-000000000002";
const FAMILIA_ID = "bbbbbbbb-0000-4000-8000-000000000003";
const CODIGO = "INS-000123";

function fichaEnBase(estado: InscripcionEstado, extra: Record<string, unknown> = {}) {
  return {
    id: INSCRIPCION_ID,
    numero: 123,
    estado,
    motivo: null,
    alumnoId: null,
    dni: "45102338",
    nombre: "Mora",
    apellido: "Pérez",
    tutor1Email: "tutora@example.com",
    tutor1Nombre: "Ana Pérez",
    ...extra,
  };
}

/** Ninguna escritura: ni alta, ni vínculo, ni anulación, ni auditoría. */
function sinEscritura() {
  expect(q.procesarAltaInscripcion).not.toHaveBeenCalled();
  expect(q.prepararEnvioAcceso).not.toHaveBeenCalled();
  expect(q.anularInscripcion).not.toHaveBeenCalled();
  expect(q.registrarResolucionAlta).not.toHaveBeenCalled();
  sinEfectos();
}

beforeEach(() => {
  resetearMocks("admin_juk");
  q.getInscripcionByNumero.mockResolvedValue(fichaEnBase("recibida"));
  q.procesarAltaInscripcion.mockResolvedValue({
    estado: "procesada",
    motivo: null,
    alumnoId: ALUMNO_ID,
    altaEjecutada: true,
  });
  q.prepararEnvioAcceso.mockResolvedValue({
    estado: "listo",
    userId: FAMILIA_ID,
    email: "tutora@example.com",
    nombre: "Ana Pérez",
  });
  q.registrarResolucionAlta.mockResolvedValue(true);
  q.anularInscripcion.mockResolvedValue(true);
});

describe("autorización", () => {
  it("sin sesión ninguna acción de la bandeja toca la base", async () => {
    sinSesion();

    expect(await urlDeRedirect(() => procesarInscripcionAction({ codigo: CODIGO }))).toBe("/login");
    expect(await urlDeRedirect(() => reintentarAltaAction({ codigo: CODIGO }))).toBe("/login");
    expect(await urlDeRedirect(() => resolverVinculoAction({ codigo: CODIGO }))).toBe("/login");
    expect(await urlDeRedirect(() => anularInscripcionAction({ codigo: CODIGO }))).toBe("/login");

    expect(q.getInscripcionByNumero).not.toHaveBeenCalled();
    sinEscritura();
  });

  it("una familia no da de alta fichas del back-office", async () => {
    loguearComo("familia");

    expect(await urlDeRedirect(() => procesarInscripcionAction({ codigo: CODIGO }))).toBe(
      "/familias"
    );
    sinEscritura();
  });

  it("un representante tampoco anula", async () => {
    loguearComo("representante");

    expect(await urlDeRedirect(() => anularInscripcionAction({ codigo: CODIGO }))).toBe(
      "/dashboard"
    );
    sinEscritura();
  });
});

describe("procesarInscripcionAction", () => {
  it("el código es lo único que llega del cliente y se valida", async () => {
    const r = await procesarInscripcionAction({ codigo: "no-es-un-codigo" });

    expect(r).toEqual({
      ok: false,
      error: "Ese no es un código de inscripción válido.",
      fieldErrors: { codigo: ["Ese no es un código de inscripción válido."] },
    });
    expect(q.getInscripcionByNumero).not.toHaveBeenCalled();
    sinEscritura();
  });

  it("una ficha que no existe no rompe la pantalla", async () => {
    q.getInscripcionByNumero.mockResolvedValue(null);

    const r = await procesarInscripcionAction({ codigo: CODIGO });

    expect(r).toEqual({ ok: false, error: "No encontramos esa ficha." });
    sinEscritura();
  });

  it("dispara el alta con la capacidad del equipo, audita y revalida", async () => {
    const r = await procesarInscripcionAction({ codigo: CODIGO });

    expect(r).toEqual({
      ok: true,
      data: { estado: "procesada", motivo: null, alumnoId: ALUMNO_ID, ejecutada: true },
    });
    // La ficha que se procesa es la que se releyó de la base, no la del cliente.
    expect(q.procesarAltaInscripcion).toHaveBeenCalledWith(fichaEnBase("recibida"), {
      via: "equipo",
      usuarioId: IDS.admin,
    });
    expect(auditoriasDe("update")[0]).toMatchObject({
      entidadTipo: "inscripcion",
      entidadId: INSCRIPCION_ID,
      usuarioId: IDS.admin,
      metadata: {
        origen: "bandeja_inscripciones",
        decision: "procesar",
        estado: "procesada",
        alumnoId: ALUMNO_ID,
      },
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/inscripciones");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/inscripciones/[id]", "page");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/alumnos/[id]", "page");
  });

  it("la ficha sin invitación (requiere_revision, sin alumno) sí se procesa a mano", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaEnBase("requiere_revision"));

    const r = await procesarInscripcionAction({ codigo: CODIGO });

    expect(r.ok).toBe(true);
    expect(q.procesarAltaInscripcion).toHaveBeenCalledTimes(1);
  });

  it("con el alumno ya creado NO vuelve a correr el alta", async () => {
    // Correrla otra vez caería en `duplicada` por el unique de DNI y le borraría
    // a la ficha el motivo real: que se colgó de una cuenta que ya existía.
    q.getInscripcionByNumero.mockResolvedValue(
      fichaEnBase("requiere_revision", { alumnoId: ALUMNO_ID })
    );

    const r = await procesarInscripcionAction({ codigo: CODIGO });

    expect(r).toEqual({
      ok: false,
      error:
        "Esta ficha ya creó al alumno: lo que queda es confirmar la cuenta de familia, no volver a darla de alta.",
    });
    sinEscritura();
  });

  it("sobre una anulada no hace nada y lo dice", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaEnBase("anulada"));

    const r = await procesarInscripcionAction({ codigo: CODIGO });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.error).toContain("anulada");
    sinEscritura();
  });
});

describe("reintentarAltaAction", () => {
  it("reintenta la que falló", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaEnBase("error", { motivo: "Se cayó Neon" }));
    q.procesarAltaInscripcion.mockResolvedValue({
      estado: "procesada",
      motivo: null,
      alumnoId: ALUMNO_ID,
      altaEjecutada: true,
    });

    const r = await reintentarAltaAction({ codigo: CODIGO });

    expect(r.ok).toBe(true);
    expect(q.procesarAltaInscripcion).toHaveBeenCalledTimes(1);
    expect(auditoriasDe("update")[0]?.metadata).toMatchObject({ decision: "reintentar" });
  });

  it("sobre una ya procesada es no-op: contesta ok sin tocar nada", async () => {
    const ficha = fichaEnBase("procesada", { alumnoId: ALUMNO_ID, motivo: null });
    q.getInscripcionByNumero.mockResolvedValue(ficha);

    const r = await reintentarAltaAction({ codigo: CODIGO });

    expect(r).toEqual({
      ok: true,
      data: { estado: "procesada", motivo: null, alumnoId: ALUMNO_ID, ejecutada: false },
    });
    sinEscritura();
  });

  it("sobre una duplicada también es no-op", async () => {
    q.getInscripcionByNumero.mockResolvedValue(
      fichaEnBase("duplicada", { alumnoId: ALUMNO_ID, motivo: "Ese DNI ya estaba cargado" })
    );

    const r = await reintentarAltaAction({ codigo: CODIGO });

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debería ser no-op exitoso");
    expect(r.data.ejecutada).toBe(false);
    sinEscritura();
  });

  it("sobre una que todavía no falló no reintenta nada", async () => {
    const r = await reintentarAltaAction({ codigo: CODIGO });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.error).toContain("Reintentar es para las fichas que fallaron");
    sinEscritura();
  });
});

describe("resolverVinculoAction", () => {
  const fichaConVinculo = () =>
    fichaEnBase("requiere_revision", {
      alumnoId: ALUMNO_ID,
      motivo: "El email del tutor ya tiene una cuenta con alumnos de otro apellido",
    });

  it("la primera llamada NO vincula: pide confirmación con los alumnos de esa cuenta", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaConVinculo());
    q.prepararEnvioAcceso.mockResolvedValue({
      estado: "requiere_confirmacion",
      alumnos: [
        { id: "otro", dni: "30111222", nombre: "Juan", apellido: "Gómez" },
      ],
    });

    const r = await resolverVinculoAction({ codigo: CODIGO });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería pedir confirmación");
    expect(r.requiereConfirmacion).toBe(true);
    expect(r.error).toContain("Gómez, Juan (DNI 30111222)");
    expect(r.error).toContain("Mora Pérez");
    // Sin confirmar no se vincula ni se cierra la ficha.
    expect(q.prepararEnvioAcceso).toHaveBeenCalledWith(ALUMNO_ID, {});
    expect(q.registrarResolucionAlta).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("con la confirmación explícita vincula, cierra la ficha y audita el vínculo", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaConVinculo());

    const r = await resolverVinculoAction({ codigo: CODIGO }, { confirmar: true });

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debería vincular");
    expect(r.data.estado).toBe("procesada");
    expect(r.data.familiaUserId).toBe(FAMILIA_ID);

    expect(q.prepararEnvioAcceso).toHaveBeenCalledWith(ALUMNO_ID, { confirmarVinculo: true });
    expect(q.registrarResolucionAlta).toHaveBeenCalledWith(INSCRIPCION_ID, {
      estado: "procesada",
      motivo: "Un admin confirmó colgar al alumno de una cuenta de familia que ya existía.",
      alumnoId: ALUMNO_ID,
    });

    // La entrada sobre el ALUMNO es la que tiene que poder buscarse sola:
    // colgarlo de una cuenta que ya existía es la operación sensible del flujo.
    const sobreElAlumno = auditoriasDe("update").find((e) => e.entidadTipo === "alumno");
    expect(sobreElAlumno).toMatchObject({
      entidadId: ALUMNO_ID,
      usuarioId: IDS.admin,
      metadata: {
        vinculo: "cuenta_existente",
        familiaUserId: FAMILIA_ID,
        inscripcionId: INSCRIPCION_ID,
        confirmado: true,
      },
    });
    expect(
      auditoriasDe("update").find((e) => e.entidadTipo === "inscripcion")
    ).toMatchObject({ metadata: { decision: "confirmar_vinculo" } });
  });

  it("el email de alguien del equipo nunca se vincula, ni confirmado", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaConVinculo());
    q.prepararEnvioAcceso.mockResolvedValue({
      estado: "sin_cuenta",
      motivo: "email_del_equipo",
    });

    const r = await resolverVinculoAction({ codigo: CODIGO }, { confirmar: true });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.error).toContain("usuario del equipo");
    expect(q.registrarResolucionAlta).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("sobre una ficha sin alumno no hay vínculo que confirmar", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaEnBase("requiere_revision"));

    const r = await resolverVinculoAction({ codigo: CODIGO });

    expect(r.ok).toBe(false);
    sinEscritura();
  });
});

describe("anularInscripcionAction", () => {
  it("anula con el motivo del equipo, audita el descarte y revalida", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaEnBase("requiere_revision"));

    const r = await anularInscripcionAction({ codigo: CODIGO, motivo: "La familia se arrepintió" });

    expect(r).toEqual({
      ok: true,
      data: {
        estado: "anulada",
        motivo: "Anulada por el equipo: La familia se arrepintió",
        alumnoId: null,
        ejecutada: true,
      },
    });
    expect(q.anularInscripcion).toHaveBeenCalledWith(
      INSCRIPCION_ID,
      "Anulada por el equipo: La familia se arrepintió"
    );
    expect(auditoriasDe("soft_delete")[0]).toMatchObject({
      entidadTipo: "inscripcion",
      entidadId: INSCRIPCION_ID,
      usuarioId: IDS.admin,
      metadata: {
        decision: "anular",
        estadoAnterior: "requiere_revision",
        estado: "anulada",
        motivo: "La familia se arrepintió",
      },
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/inscripciones");
  });

  it("sin motivo igual anula, con una nota genérica", async () => {
    const r = await anularInscripcionAction({ codigo: CODIGO, motivo: "   " });

    expect(r.ok).toBe(true);
    expect(q.anularInscripcion).toHaveBeenCalledWith(INSCRIPCION_ID, "Anulada por el equipo.");
  });

  it("un motivo interminable es un error de campo, no una excepción", async () => {
    const r = await anularInscripcionAction({ codigo: CODIGO, motivo: "y".repeat(600) });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.fieldErrors?.motivo).toBeDefined();
    sinEscritura();
  });

  it("una ficha ya procesada no se anula: no desharía al alumno", async () => {
    q.getInscripcionByNumero.mockResolvedValue(fichaEnBase("procesada", { alumnoId: ALUMNO_ID }));

    const r = await anularInscripcionAction({ codigo: CODIGO });

    expect(r.ok).toBe(false);
    sinEscritura();
  });

  it("anular dos veces es no-op", async () => {
    q.getInscripcionByNumero.mockResolvedValue(
      fichaEnBase("anulada", { motivo: "Anulada por el equipo." })
    );

    const r = await anularInscripcionAction({ codigo: CODIGO });

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("debería ser no-op exitoso");
    expect(r.data.ejecutada).toBe(false);
    sinEscritura();
  });

  it("si la ficha cambió mientras tanto, lo dice en vez de mentir", async () => {
    q.anularInscripcion.mockResolvedValue(false);

    const r = await anularInscripcionAction({ codigo: CODIGO });

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("debería fallar");
    expect(r.error).toContain("cambió mientras");
    sinEfectos();
  });
});
