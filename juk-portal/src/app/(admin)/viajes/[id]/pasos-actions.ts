"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk } from "@/lib/auth/helpers";
import { listAsignacionesByViaje } from "@/lib/db/queries/asignaciones";
import {
  listOrInitPasosViaje,
  updateEstadoPasoViaje,
  updateMetadataPasoViaje,
} from "@/lib/db/queries/pasos-viaje";
import { getViajeById } from "@/lib/db/queries/viajes";
import {
  METADATA_SCHEMAS,
  PASO_VIAJE_ESTADOS,
  PASO_VIAJE_LABELS,
  PASO_VIAJE_TIPOS,
  PASOS_POR_ALUMNO,
  coberturaPorAlumno,
  dependenciaPendiente,
  esPasajeSubEstadoDe,
  esPasoDerivado,
  normalizarPasajeSubEstado,
  puedeAvanzarConDependencias,
  puedeTransicionarPaso,
  type EditablePasoTipo,
  type EstadosPorTipo,
  type PasoPorAlumno,
  type PasoViajeEstado,
  type PasoViajeTipo,
} from "@/lib/domain/pasos-viaje";

function tipoValido(tipo: string): tipo is PasoViajeTipo {
  return (PASO_VIAJE_TIPOS as readonly string[]).includes(tipo);
}

function estadoValido(estado: string): estado is PasoViajeEstado {
  return (PASO_VIAJE_ESTADOS as readonly string[]).includes(estado);
}

function tipoEditableValido(tipo: string): tipo is EditablePasoTipo {
  return Object.prototype.hasOwnProperty.call(METADATA_SCHEMAS, tipo);
}

function estadosPorTipo(pasos: ReadonlyArray<{ tipo: string; estado: string }>): EstadosPorTipo {
  const estados: EstadosPorTipo = {};
  for (const p of pasos) estados[p.tipo as PasoViajeTipo] = p.estado as PasoViajeEstado;
  return estados;
}

function errorDependencia(tipo: PasoViajeTipo, requiere: PasoViajeTipo | null): string {
  return `No podés avanzar ${PASO_VIAJE_LABELS[tipo]} hasta completar ${
    requiere ? PASO_VIAJE_LABELS[requiere] : "el paso previo"
  }.`;
}

export async function cambiarEstadoPasoViajeAction(
  viajeId: string,
  tipo: PasoViajeTipo,
  estado: PasoViajeEstado
): Promise<ActionResult<{ estado: PasoViajeEstado }>> {
  const session = await requireAdminJuk();

  if (!z.string().uuid().safeParse(viajeId).success || !tipoValido(tipo) || !estadoValido(estado)) {
    return { ok: false, error: "Datos inválidos." };
  }

  if (esPasoDerivado(tipo)) {
    return {
      ok: false,
      error: "El estado de Police Checks se deriva de los Group Leaders del viaje.",
    };
  }

  const pasos = await listOrInitPasosViaje(viajeId);
  const actual = pasos.find((p) => p.tipo === tipo);
  if (!actual) return { ok: false, error: "El paso no existe." };

  if (!puedeTransicionarPaso(actual.estado, estado)) {
    return { ok: false, error: "Esa transición de estado no está permitida." };
  }

  // Dependencia (PRD M7): la misma regla que filtra el selector del panel.
  const estados = estadosPorTipo(pasos);
  if (!puedeAvanzarConDependencias(tipo, estado, estados)) {
    return { ok: false, error: errorDependencia(tipo, dependenciaPendiente(tipo, estados)) };
  }

  try {
    await updateEstadoPasoViaje(viajeId, tipo, estado, session.user.id);
    await safeAudit({
      accion: "cambio_estado_paso",
      entidadTipo: "paso_viaje",
      entidadId: actual.id,
      usuarioId: session.user.id,
      cambios: { before: { estado: actual.estado }, after: { estado } },
      metadata: { viajeId, tipo },
    });
    revalidatePath("/viajes/[id]", "page");
    return { ok: true, data: { estado } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos actualizar el estado del paso." };
  }
}

export async function guardarMetadataPasoViajeAction(
  viajeId: string,
  tipo: EditablePasoTipo,
  metadata: unknown
): Promise<ActionResult<{ tipo: EditablePasoTipo }>> {
  const session = await requireAdminJuk();

  if (!z.string().uuid().safeParse(viajeId).success || !tipoEditableValido(tipo)) {
    return { ok: false, error: "Datos inválidos." };
  }

  const schema = METADATA_SCHEMAS[tipo];
  const parsed = schema.safeParse(metadata);
  if (!parsed.success) {
    return { ok: false, error: "Hay datos inválidos en el formulario." };
  }
  const datos = parsed.data as Record<string, unknown>;

  // Pasajes: Grupal e Individual tienen sub-estados distintos (PRD M7 P1).
  if (tipo === "pasajes") {
    const subEstado = normalizarPasajeSubEstado(datos.subEstado);
    if (subEstado) {
      const viaje = await getViajeById(viajeId);
      if (!viaje) return { ok: false, error: "El viaje no existe." };
      if (!esPasajeSubEstadoDe(subEstado, viaje.tipo)) {
        return {
          ok: false,
          error: `Ese sub-estado de Pasajes no corresponde a un viaje ${viaje.tipo}.`,
        };
      }
    }
  }

  const pasos = await listOrInitPasosViaje(viajeId);
  const pasoActual = pasos.find((p) => p.tipo === tipo);

  try {
    // Merge sobre la metadata existente: los schemas de proveedor/costo no
    // incluyen `porAlumno` (cobertura por alumno), y updateMetadataPasoViaje
    // reemplaza toda la columna. Sin el merge, "Guardar datos" borraría la
    // cobertura marcada por alumno.
    const metadataMerged = {
      ...(pasoActual?.metadata ?? {}),
      ...datos,
    };
    const row = await updateMetadataPasoViaje(
      viajeId,
      tipo,
      metadataMerged,
      session.user.id
    );
    await safeAudit({
      accion: "update",
      entidadTipo: "paso_viaje",
      entidadId: row.id,
      usuarioId: session.user.id,
      cambios: { after: datos },
      metadata: { viajeId, tipo },
    });
    revalidatePath("/viajes/[id]", "page");
    return { ok: true, data: { tipo } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar los datos del paso." };
  }
}

/**
 * M7 P3/P4: marca/desmarca la cobertura de un alumno (transfer asignado o
 * tarjeta entregada). El paso se completa solo cuando TODOS los alumnos
 * activos del viaje están cubiertos, y se reabre si deja de estarlo.
 */
export async function marcarAlumnoPasoViajeAction(
  viajeId: string,
  tipo: string,
  asignacionId: string,
  cubierto: boolean
): Promise<ActionResult<{ marcados: number; total: number; estado: PasoViajeEstado }>> {
  const session = await requireAdminJuk();

  const ids = z
    .object({ viajeId: z.string().uuid(), asignacionId: z.string().uuid() })
    .safeParse({ viajeId, asignacionId });
  if (!ids.success || !(PASOS_POR_ALUMNO as readonly string[]).includes(tipo)) {
    return { ok: false, error: "Datos inválidos." };
  }
  const tipoPaso = tipo as PasoPorAlumno;

  try {
    const pasos = await listOrInitPasosViaje(viajeId);
    const paso = pasos.find((p) => p.tipo === tipoPaso);
    if (!paso) return { ok: false, error: "El paso no existe." };

    // Pertenencia: la asignación tiene que ser de ESTE viaje (ids cruzados no).
    const activas = await listAsignacionesByViaje(viajeId);
    if (!activas.some((a) => a.asignacionId === asignacionId)) {
      return { ok: false, error: "La asignación no pertenece a este viaje." };
    }

    // Marcar cobertura auto-avanza el paso (en progreso / completado), así que
    // exige la misma dependencia que el selector: sin esto, Transfers se
    // completaba con Pasajes pendiente. Desmarcar siempre se puede.
    if (cubierto) {
      const requiere = dependenciaPendiente(tipoPaso, estadosPorTipo(pasos));
      if (requiere) return { ok: false, error: errorDependencia(tipoPaso, requiere) };
    }

    const metadata = paso.metadata as Record<string, unknown>;
    const porAlumno = {
      ...((metadata.porAlumno as Record<string, boolean> | undefined) ?? {}),
      [asignacionId]: cubierto,
    };
    await updateMetadataPasoViaje(viajeId, tipoPaso, { ...metadata, porAlumno }, session.user.id);

    const idsActivas = activas
      .filter((a) => a.estado === "activa")
      .map((a) => a.asignacionId);
    const cobertura = coberturaPorAlumno(porAlumno, idsActivas);

    // Completar / reabrir según cobertura (sin pisar bloqueos manuales).
    let estadoFinal = paso.estado as PasoViajeEstado;
    if (cobertura.completo && paso.estado !== "completado") {
      await updateEstadoPasoViaje(viajeId, tipoPaso, "completado", session.user.id);
      estadoFinal = "completado";
    } else if (!cobertura.completo && paso.estado === "completado") {
      await updateEstadoPasoViaje(viajeId, tipoPaso, "en_progreso", session.user.id);
      estadoFinal = "en_progreso";
    } else if (!cobertura.completo && paso.estado === "pendiente" && cobertura.marcados > 0) {
      await updateEstadoPasoViaje(viajeId, tipoPaso, "en_progreso", session.user.id);
      estadoFinal = "en_progreso";
    }

    await safeAudit({
      accion: "cambio_estado_paso",
      entidadTipo: "paso_viaje",
      entidadId: viajeId,
      usuarioId: session.user.id,
      metadata: { tipo: tipoPaso, asignacionId, cubierto, ...cobertura },
    });

    revalidatePath("/viajes/[id]", "page");
    return { ok: true, data: { ...cobertura, estado: estadoFinal } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos actualizar la cobertura." };
  }
}
