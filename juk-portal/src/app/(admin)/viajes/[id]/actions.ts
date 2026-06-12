"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { getAlumnoById } from "@/lib/db/queries/alumnos";
import {
  cancelarAsignacion,
  countAsignacionesActivas,
} from "@/lib/db/queries/asignaciones";
import { asignarConTablero } from "@/lib/db/queries/asignar-alumno";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import { getViajeById } from "@/lib/db/queries/viajes";
import { AsignacionNotFoundError, pasaporteVigenteParaViaje } from "@/lib/domain/asignaciones";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; requiereConfirmacion?: boolean };

async function safeAudit(entry: NewAuditoriaEntry) {
  try {
    await registrarAuditoria(entry);
  } catch (err) {
    Sentry.captureException(err);
  }
}

function isYaAsignado(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}

export async function asignarAlumnoAction(
  viajeId: string,
  alumnoId: string,
  opts?: { confirmar?: boolean }
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminJuk();

  const ids = z
    .object({ viajeId: z.string().uuid(), alumnoId: z.string().uuid() })
    .safeParse({ viajeId, alumnoId });
  if (!ids.success) return { ok: false, error: "Datos inválidos." };

  const [viaje, alumno] = await Promise.all([
    getViajeById(viajeId),
    getAlumnoById(alumnoId),
  ]);
  if (!viaje || !alumno) return { ok: false, error: "Viaje o alumno inexistente." };
  // US-11/MIN-12: altas solo en Inscripción abierta y Confirmado.
  if (viaje.estado !== "inscripcion_abierta" && viaje.estado !== "confirmado") {
    return { ok: false, error: "Solo se puede inscribir en viajes en Inscripción abierta o Confirmado." };
  }
  if (alumno.estado === "baja") return { ok: false, error: "El alumno está dado de baja." };

  // Advertencias confirmables (US-11: advierte pero NO bloquea; US-16: pasaporte).
  if (!opts?.confirmar) {
    const advertencias: string[] = [];
    if (!pasaporteVigenteParaViaje(alumno.fechaVencimientoPasaporte, viaje.fechaFin, viaje.paisDestino)) {
      advertencias.push("el pasaporte del alumno no cumple el requisito de vigencia para este destino");
    }
    const activas = await countAsignacionesActivas(viajeId);
    if (activas >= viaje.capacidadMaxima) {
      advertencias.push("el viaje queda por encima de su capacidad máxima");
    }
    if (advertencias.length > 0) {
      return {
        ok: false,
        requiereConfirmacion: true,
        error: `Atención: ${advertencias.join(" y ")}. ¿Asignar igual?`,
      };
    }
  }

  try {
    // Trigger de asignación (PRD §6.2): núcleo compartido con el webhook.
    const resultado = await asignarConTablero({
      viaje,
      alumno,
      usuarioId: session.user.id,
    });

    await safeAudit({
      accion: "asignar_a_viaje",
      entidadTipo: "asignacion",
      entidadId: resultado.asignacionId,
      usuarioId: session.user.id,
      metadata: { viajeId, alumnoId, pasosCreados: resultado.pasosCreados },
    });
    if (resultado.autoConfirmado) {
      await safeAudit({
        accion: "cambio_estado_viaje",
        entidadTipo: "viaje",
        entidadId: viajeId,
        usuarioId: session.user.id,
        metadata: { estadoAnterior: "inscripcion_abierta", estado: "confirmado", motivo: "auto_5_alumnos" },
      });
    }

    revalidatePath(`/viajes/${viajeId}`);
    return { ok: true, data: { id: resultado.asignacionId } };
  } catch (err) {
    if (isYaAsignado(err)) {
      return { ok: false, error: "El alumno ya está asignado a este viaje." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos asignar al alumno." };
  }
}

export async function desasignarAlumnoAction(
  asignacionId: string,
  viajeId: string,
  opts?: { confirmar?: boolean; motivo?: string }
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminJuk();

  const parsed = z
    .object({ asignacionId: z.string().uuid(), viajeId: z.string().uuid() })
    .safeParse({ asignacionId, viajeId });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  // US-11: en En curso / Finalizado la baja es EXTRAORDINARIA y requiere
  // confirmación explícita.
  const viaje = await getViajeById(viajeId);
  if (!viaje) return { ok: false, error: "El viaje no existe." };
  if (
    (viaje.estado === "en_curso" || viaje.estado === "finalizado") &&
    !opts?.confirmar
  ) {
    return {
      ok: false,
      requiereConfirmacion: true,
      error: `El viaje está ${viaje.estado === "en_curso" ? "en curso" : "finalizado"}: la baja es extraordinaria. ¿Quitar al alumno igual?`,
    };
  }

  try {
    await cancelarAsignacion(asignacionId, viajeId, opts?.motivo ?? null);
    await safeAudit({
      accion: "desasignar_de_viaje",
      entidadTipo: "asignacion",
      entidadId: asignacionId,
      usuarioId: session.user.id,
    });
    revalidatePath(`/viajes/${viajeId}`);
    return { ok: true, data: { id: asignacionId } };
  } catch (err) {
    if (err instanceof AsignacionNotFoundError) {
      return { ok: false, error: "La asignación no existe o ya fue cancelada." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos quitar al alumno del viaje." };
  }
}
