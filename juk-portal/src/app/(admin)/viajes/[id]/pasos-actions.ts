"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import {
  listOrInitPasosViaje,
  updateEstadoPasoViaje,
  updateMetadataPasoViaje,
} from "@/lib/db/queries/pasos-viaje";
import {
  METADATA_SCHEMAS,
  PASO_VIAJE_DEPENDENCIAS,
  PASO_VIAJE_ESTADOS,
  PASO_VIAJE_LABELS,
  PASO_VIAJE_TIPOS,
  esPasoDerivado,
  puedeTransicionarPaso,
  type EditablePasoTipo,
  type PasoViajeEstado,
  type PasoViajeTipo,
} from "@/lib/domain/pasos-viaje";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function safeAudit(entry: NewAuditoriaEntry) {
  try {
    await registrarAuditoria(entry);
  } catch (err) {
    Sentry.captureException(err);
  }
}

function tipoValido(tipo: string): tipo is PasoViajeTipo {
  return (PASO_VIAJE_TIPOS as readonly string[]).includes(tipo);
}

function estadoValido(estado: string): estado is PasoViajeEstado {
  return (PASO_VIAJE_ESTADOS as readonly string[]).includes(estado);
}

function tipoEditableValido(tipo: string): tipo is EditablePasoTipo {
  return Object.prototype.hasOwnProperty.call(METADATA_SCHEMAS, tipo);
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

  // Dependencia (PRD M7): Transfers no avanza sin Pasajes completado.
  const requiere = PASO_VIAJE_DEPENDENCIAS[tipo];
  if (requiere && (estado === "en_progreso" || estado === "completado")) {
    const dep = pasos.find((p) => p.tipo === requiere);
    if (dep?.estado !== "completado") {
      return {
        ok: false,
        error: `No podés avanzar ${PASO_VIAJE_LABELS[tipo]} hasta completar ${PASO_VIAJE_LABELS[requiere]}.`,
      };
    }
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
    revalidatePath(`/viajes/${viajeId}`);
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

  await listOrInitPasosViaje(viajeId);

  try {
    const row = await updateMetadataPasoViaje(
      viajeId,
      tipo,
      parsed.data as Record<string, unknown>,
      session.user.id
    );
    await safeAudit({
      accion: "update",
      entidadTipo: "paso_viaje",
      entidadId: row.id,
      usuarioId: session.user.id,
      cambios: { after: parsed.data as Record<string, unknown> },
      metadata: { viajeId, tipo },
    });
    revalidatePath(`/viajes/${viajeId}`);
    return { ok: true, data: { tipo } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar los datos del paso." };
  }
}
