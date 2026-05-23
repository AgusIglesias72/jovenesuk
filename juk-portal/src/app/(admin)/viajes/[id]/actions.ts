"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { getAlumnoById } from "@/lib/db/queries/alumnos";
import {
  cancelarAsignacion,
  countAsignacionesActivas,
  createAsignacion,
} from "@/lib/db/queries/asignaciones";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import { getViajeById } from "@/lib/db/queries/viajes";
import { AsignacionNotFoundError, pasaporteVigenteParaViaje } from "@/lib/domain/asignaciones";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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
  alumnoId: string
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
  if (viaje.estado === "cancelado") return { ok: false, error: "El viaje está cancelado." };
  if (alumno.estado === "baja") return { ok: false, error: "El alumno está dado de baja." };

  // CRIT-02: validación de pasaporte detrás del flag STRICT_UK_RULE.
  if (!pasaporteVigenteParaViaje(alumno.fechaVencimientoPasaporte, viaje.fechaFin)) {
    return { ok: false, error: "El pasaporte del alumno vence antes del fin del viaje." };
  }

  const activas = await countAsignacionesActivas(viajeId);
  if (activas >= viaje.capacidadMaxima) {
    return { ok: false, error: "El viaje no tiene cupo disponible." };
  }

  try {
    const asig = await createAsignacion({ alumnoId, viajeId });
    await safeAudit({
      accion: "asignar_a_viaje",
      entidadTipo: "asignacion",
      entidadId: asig.id,
      usuarioId: session.user.id,
      metadata: { viajeId, alumnoId },
    });
    revalidatePath(`/viajes/${viajeId}`);
    return { ok: true, data: { id: asig.id } };
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
  viajeId: string
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminJuk();

  const parsed = z
    .object({ asignacionId: z.string().uuid(), viajeId: z.string().uuid() })
    .safeParse({ asignacionId, viajeId });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  try {
    await cancelarAsignacion(asignacionId, viajeId, null);
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
