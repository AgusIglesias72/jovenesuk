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
  listOrInitPasosViaje: vi.fn(),
  updateEstadoPasoViaje: vi.fn(),
  updateMetadataPasoViaje: vi.fn(),
  listAsignacionesByViaje: vi.fn(),
  getViajeById: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", async () => (await import("@/lib/actions/__tests__/mocks")).authHelpers);
vi.mock("next/cache", async () => (await import("@/lib/actions/__tests__/mocks")).nextCache);
vi.mock("@sentry/nextjs", async () => (await import("@/lib/actions/__tests__/mocks")).sentry);
vi.mock("@/lib/actions/safe-audit", async () => (await import("@/lib/actions/__tests__/mocks")).auditoria);
vi.mock("@/lib/db/queries/pasos-viaje", () => ({
  listOrInitPasosViaje: q.listOrInitPasosViaje,
  updateEstadoPasoViaje: q.updateEstadoPasoViaje,
  updateMetadataPasoViaje: q.updateMetadataPasoViaje,
}));
vi.mock("@/lib/db/queries/asignaciones", () => ({
  listAsignacionesByViaje: q.listAsignacionesByViaje,
}));
vi.mock("@/lib/db/queries/viajes", () => ({ getViajeById: q.getViajeById }));

import {
  PASO_VIAJE_LABELS,
  PASO_VIAJE_TIPOS,
  pasajeSubEstadosDe,
  type PasoViajeEstado,
  type PasoViajeTipo,
} from "@/lib/domain/pasos-viaje";

import {
  cambiarEstadoPasoViajeAction,
  guardarMetadataPasoViajeAction,
  marcarAlumnoPasoViajeAction,
} from "./pasos-actions";

const VIAJE_ID = "cccccccc-0000-4000-8000-000000000001";
const ASIG_A = "cccccccc-0000-4000-8000-00000000000a";
const ASIG_B = "cccccccc-0000-4000-8000-00000000000b";
const ASIG_CANCELADA = "cccccccc-0000-4000-8000-00000000000c";
const ASIG_OTRO_VIAJE = "cccccccc-0000-4000-8000-0000000000ff";

type PasoOverride = { estado?: PasoViajeEstado; metadata?: Record<string, unknown> };

function pasosDelViaje(over: Partial<Record<PasoViajeTipo, PasoOverride>> = {}) {
  return PASO_VIAJE_TIPOS.map((tipo) => ({
    id: `paso-${tipo}`,
    viajeId: VIAJE_ID,
    tipo,
    estado: over[tipo]?.estado ?? "pendiente",
    metadata: over[tipo]?.metadata ?? {},
  }));
}

const roster = [
  { asignacionId: ASIG_A, estado: "activa" },
  { asignacionId: ASIG_B, estado: "activa" },
  { asignacionId: ASIG_CANCELADA, estado: "cancelada" },
];

beforeEach(() => {
  resetearMocks("admin_juk");
  q.listOrInitPasosViaje.mockResolvedValue(pasosDelViaje());
  q.listAsignacionesByViaje.mockResolvedValue(roster);
  q.updateEstadoPasoViaje.mockResolvedValue(undefined);
  q.updateMetadataPasoViaje.mockImplementation(async (_v: string, tipo: string) => ({
    id: `paso-${tipo}`,
  }));
  q.getViajeById.mockResolvedValue({ id: VIAJE_ID, tipo: "grupal" });
});

describe("cambiarEstadoPasoViajeAction", () => {
  it("sin sesión redirige sin leer los pasos", async () => {
    sinSesion();

    expect(
      await urlDeRedirect(() => cambiarEstadoPasoViajeAction(VIAJE_ID, "pasajes", "completado"))
    ).toBe("/login");
    expect(q.listOrInitPasosViaje).not.toHaveBeenCalled();
  });

  it("una familia no puede tocar el M7", async () => {
    loguearComo("familia");

    expect(
      await urlDeRedirect(() => cambiarEstadoPasoViajeAction(VIAJE_ID, "pasajes", "completado"))
    ).toBe("/familias");
    expect(q.updateEstadoPasoViaje).not.toHaveBeenCalled();
  });

  it("rechaza tipo o estado fuera del catálogo sin leer la base", async () => {
    const tipoTrucho = "hotel" as PasoViajeTipo;
    const estadoTrucho = "archivado" as PasoViajeEstado;

    expect(await cambiarEstadoPasoViajeAction(VIAJE_ID, tipoTrucho, "completado")).toEqual({
      ok: false,
      error: "Datos inválidos.",
    });
    expect(await cambiarEstadoPasoViajeAction(VIAJE_ID, "pasajes", estadoTrucho)).toEqual({
      ok: false,
      error: "Datos inválidos.",
    });
    expect(await cambiarEstadoPasoViajeAction("UK-2027-JUL-LONDON", "pasajes", "completado")).toEqual({
      ok: false,
      error: "Datos inválidos.",
    });
    expect(q.listOrInitPasosViaje).not.toHaveBeenCalled();
  });

  it("Police Checks no se setea a mano (se deriva de los Group Leaders)", async () => {
    const r = await cambiarEstadoPasoViajeAction(VIAJE_ID, "police_checks", "completado");

    expect(r.ok).toBe(false);
    expect(q.updateEstadoPasoViaje).not.toHaveBeenCalled();
  });

  it("rechaza una transición que la máquina de estados no permite", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(pasosDelViaje({ excursiones: { estado: "completado" } }));

    const r = await cambiarEstadoPasoViajeAction(VIAJE_ID, "excursiones", "bloqueado");

    expect(r).toEqual({ ok: false, error: "Esa transición de estado no está permitida." });
    expect(q.updateEstadoPasoViaje).not.toHaveBeenCalled();
    sinEfectos();
  });

  it.each(["en_progreso", "completado"] as const)(
    "Transfers no avanza a %s con Pasajes sin completar",
    async (destino) => {
      q.listOrInitPasosViaje.mockResolvedValue(pasosDelViaje({ pasajes: { estado: "en_progreso" } }));

      const r = await cambiarEstadoPasoViajeAction(VIAJE_ID, "transfers", destino);

      expect(r).toEqual({
        ok: false,
        error: `No podés avanzar ${PASO_VIAJE_LABELS.transfers} hasta completar ${PASO_VIAJE_LABELS.pasajes}.`,
      });
      expect(q.updateEstadoPasoViaje).not.toHaveBeenCalled();
      sinEfectos();
    }
  );

  it("con Pasajes pendiente, Transfers igual se puede bloquear", async () => {
    const r = await cambiarEstadoPasoViajeAction(VIAJE_ID, "transfers", "bloqueado");

    expect(r).toEqual({ ok: true, data: { estado: "bloqueado" } });
    expect(q.updateEstadoPasoViaje).toHaveBeenCalledWith(VIAJE_ID, "transfers", "bloqueado", IDS.admin);
  });

  it("con Pasajes completado, Transfers avanza, audita el antes/después y revalida el detalle", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(pasosDelViaje({ pasajes: { estado: "completado" } }));

    const r = await cambiarEstadoPasoViajeAction(VIAJE_ID, "transfers", "completado");

    expect(r).toEqual({ ok: true, data: { estado: "completado" } });
    expect(q.updateEstadoPasoViaje).toHaveBeenCalledWith(VIAJE_ID, "transfers", "completado", IDS.admin);
    expect(auditoriasDe("cambio_estado_paso")).toEqual([
      expect.objectContaining({
        entidadTipo: "paso_viaje",
        entidadId: "paso-transfers",
        usuarioId: IDS.admin,
        cambios: { before: { estado: "pendiente" }, after: { estado: "completado" } },
        metadata: { viajeId: VIAJE_ID, tipo: "transfers" },
      }),
    ]);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/viajes/[id]", "page");
  });

  it("un error de la query va a Sentry y no audita", async () => {
    q.updateEstadoPasoViaje.mockRejectedValue(new Error("neon caído"));

    const r = await cambiarEstadoPasoViajeAction(VIAJE_ID, "pasajes", "en_progreso");

    expect(r.ok).toBe(false);
    expect(sentry.captureException).toHaveBeenCalledOnce();
    sinEfectos();
  });
});

describe("guardarMetadataPasoViajeAction", () => {
  it("rechaza police_checks (no editable) sin escribir", async () => {
    const r = await guardarMetadataPasoViajeAction(
      VIAJE_ID,
      "police_checks" as "pasajes",
      { proveedor: "x" }
    );

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(q.updateMetadataPasoViaje).not.toHaveBeenCalled();
  });

  it("metadata que no respeta el schema → error y sin escritura", async () => {
    const r = await guardarMetadataPasoViajeAction(VIAJE_ID, "transfers", {
      costoPorAlumnoGbp: -10,
    });

    expect(r.ok).toBe(false);
    expect(q.updateMetadataPasoViaje).not.toHaveBeenCalled();
  });

  it("un sub-estado de Pasajes de viaje individual no entra en un viaje grupal", async () => {
    const grupal = new Set<string>(pasajeSubEstadosDe("grupal"));
    const soloIndividual = pasajeSubEstadosDe("individual").find((s) => !grupal.has(s));
    if (!soloIndividual) throw new Error("el catálogo debería tener sub-estados propios de individual");

    const r = await guardarMetadataPasoViajeAction(VIAJE_ID, "pasajes", { subEstado: soloIndividual });

    expect(r.ok).toBe(false);
    expect(q.updateMetadataPasoViaje).not.toHaveBeenCalled();
  });

  it("guardar datos del proveedor conserva la cobertura por alumno ya marcada", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(
      pasosDelViaje({ transfers: { metadata: { porAlumno: { [ASIG_A]: true }, proveedor: "Viejo" } } })
    );

    const r = await guardarMetadataPasoViajeAction(VIAJE_ID, "transfers", { proveedor: "Nuevo SRL" });

    expect(r).toEqual({ ok: true, data: { tipo: "transfers" } });
    expect(q.updateMetadataPasoViaje).toHaveBeenCalledWith(
      VIAJE_ID,
      "transfers",
      expect.objectContaining({ porAlumno: { [ASIG_A]: true }, proveedor: "Nuevo SRL" }),
      IDS.admin
    );
    expect(auditoriasDe("update")).toHaveLength(1);
  });
});

describe("marcarAlumnoPasoViajeAction", () => {
  it("una familia no puede marcar cobertura", async () => {
    loguearComo("familia");

    expect(
      await urlDeRedirect(() => marcarAlumnoPasoViajeAction(VIAJE_ID, "tarjeta_transporte", ASIG_A, true))
    ).toBe("/familias");
    expect(q.updateMetadataPasoViaje).not.toHaveBeenCalled();
  });

  it("solo transfers y tarjeta se marcan por alumno", async () => {
    const r = await marcarAlumnoPasoViajeAction(VIAJE_ID, "pasajes", ASIG_A, true);

    expect(r).toEqual({ ok: false, error: "Datos inválidos." });
    expect(q.listOrInitPasosViaje).not.toHaveBeenCalled();
  });

  it("una asignación de OTRO viaje no se puede marcar (ids cruzados)", async () => {
    const r = await marcarAlumnoPasoViajeAction(VIAJE_ID, "tarjeta_transporte", ASIG_OTRO_VIAJE, true);

    expect(r).toEqual({ ok: false, error: "La asignación no pertenece a este viaje." });
    expect(q.updateMetadataPasoViaje).not.toHaveBeenCalled();
    expect(q.updateEstadoPasoViaje).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("no marca un transfer mientras Pasajes no esté completado (la cobertura auto-avanza el paso)", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(pasosDelViaje({ pasajes: { estado: "en_progreso" } }));

    const r = await marcarAlumnoPasoViajeAction(VIAJE_ID, "transfers", ASIG_A, true);

    expect(r).toEqual({
      ok: false,
      error: `No podés avanzar ${PASO_VIAJE_LABELS.transfers} hasta completar ${PASO_VIAJE_LABELS.pasajes}.`,
    });
    expect(q.updateMetadataPasoViaje).not.toHaveBeenCalled();
    expect(q.updateEstadoPasoViaje).not.toHaveBeenCalled();
    sinEfectos();
  });

  it("desmarcar un transfer siempre se puede, aunque Pasajes esté pendiente", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(
      pasosDelViaje({ transfers: { metadata: { porAlumno: { [ASIG_A]: true } } } })
    );

    const r = await marcarAlumnoPasoViajeAction(VIAJE_ID, "transfers", ASIG_A, false);

    expect(r.ok).toBe(true);
    expect(q.updateMetadataPasoViaje).toHaveBeenCalledOnce();
  });

  it("con Pasajes completado, marcar el último transfer completa el paso", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(
      pasosDelViaje({
        pasajes: { estado: "completado" },
        transfers: { estado: "en_progreso", metadata: { porAlumno: { [ASIG_A]: true } } },
      })
    );

    const r = await marcarAlumnoPasoViajeAction(VIAJE_ID, "transfers", ASIG_B, true);

    expect(r).toEqual({
      ok: true,
      data: expect.objectContaining({ marcados: 2, total: 2, estado: "completado" }),
    });
    expect(q.updateEstadoPasoViaje).toHaveBeenCalledWith(VIAJE_ID, "transfers", "completado", IDS.admin);
  });

  it("la asignación cancelada no cuenta: con los dos activos marcados la tarjeta queda completa", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(
      pasosDelViaje({ tarjeta_transporte: { metadata: { porAlumno: { [ASIG_A]: true }, tipo: "Oyster" } } })
    );

    const r = await marcarAlumnoPasoViajeAction(VIAJE_ID, "tarjeta_transporte", ASIG_B, true);

    expect(r.ok && r.data).toEqual(
      expect.objectContaining({ marcados: 2, total: 2, estado: "completado" })
    );
    expect(q.updateMetadataPasoViaje).toHaveBeenCalledWith(
      VIAJE_ID,
      "tarjeta_transporte",
      { tipo: "Oyster", porAlumno: { [ASIG_A]: true, [ASIG_B]: true } },
      IDS.admin
    );
    expect(q.updateEstadoPasoViaje).toHaveBeenCalledWith(
      VIAJE_ID,
      "tarjeta_transporte",
      "completado",
      IDS.admin
    );
  });

  it("desmarcar a un alumno reabre un paso completado", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(
      pasosDelViaje({
        tarjeta_transporte: {
          estado: "completado",
          metadata: { porAlumno: { [ASIG_A]: true, [ASIG_B]: true } },
        },
      })
    );

    const r = await marcarAlumnoPasoViajeAction(VIAJE_ID, "tarjeta_transporte", ASIG_B, false);

    expect(r.ok && r.data.estado).toBe("en_progreso");
    expect(q.updateEstadoPasoViaje).toHaveBeenCalledWith(
      VIAJE_ID,
      "tarjeta_transporte",
      "en_progreso",
      IDS.admin
    );
  });

  it("no pisa un bloqueo manual al marcar cobertura parcial", async () => {
    q.listOrInitPasosViaje.mockResolvedValue(
      pasosDelViaje({ tarjeta_transporte: { estado: "bloqueado" } })
    );

    const r = await marcarAlumnoPasoViajeAction(VIAJE_ID, "tarjeta_transporte", ASIG_A, true);

    expect(r.ok && r.data.estado).toBe("bloqueado");
    expect(q.updateEstadoPasoViaje).not.toHaveBeenCalled();
  });
});
