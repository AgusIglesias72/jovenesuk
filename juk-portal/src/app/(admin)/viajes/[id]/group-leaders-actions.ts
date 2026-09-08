"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk } from "@/lib/auth/helpers";
import { esViolacionUnique } from "@/lib/db/queries/errors";
import { getGroupLeaderById } from "@/lib/db/queries/group-leaders";
import {
  asignarGroupLeaderAViaje,
  marcarPrincipal,
  quitarGroupLeaderDeViaje,
} from "@/lib/db/queries/group-leaders-viaje";
import { getViajeById } from "@/lib/db/queries/viajes";

const idsSchema = z.object({
  viajeId: z.string().uuid(),
  groupLeaderId: z.string().uuid(),
});

export async function asignarGroupLeaderAction(
  viajeId: string,
  groupLeaderId: string,
  opts?: { confirmar?: boolean }
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminJuk();

  const ids = idsSchema.safeParse({ viajeId, groupLeaderId });
  if (!ids.success) return { ok: false, error: "Datos inválidos." };

  const [viaje, gl] = await Promise.all([
    getViajeById(viajeId),
    getGroupLeaderById(groupLeaderId),
  ]);
  if (!viaje || !gl) return { ok: false, error: "Viaje o Group Leader inexistente." };
  if (viaje.estado === "cancelado") return { ok: false, error: "El viaje está cancelado." };

  // Advertencia confirmable: el police check no está aprobado y vigente para el
  // viaje (el paso Police Checks del M7 va a nacer/quedar en rojo).
  if (!opts?.confirmar) {
    const advertencias: string[] = [];
    if (gl.policeCheckEstado !== "aprobado") {
      advertencias.push(
        `su police check está "${gl.policeCheckEstado.replace("_", " ")}" (no aprobado)`
      );
    } else if (
      gl.policeCheckFechaVencimiento &&
      gl.policeCheckFechaVencimiento < viaje.fechaFin
    ) {
      advertencias.push("su police check vence antes de que termine el viaje");
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
    const rel = await asignarGroupLeaderAViaje(viajeId, groupLeaderId);
    await safeAudit({
      accion: "asignar_a_viaje",
      entidadTipo: "group_leader_viaje",
      entidadId: rel.id,
      usuarioId: session.user.id,
      metadata: { viajeId, groupLeaderId },
    });
    revalidatePath("/viajes/[id]", "page");
    return { ok: true, data: { id: rel.id } };
  } catch (err) {
    if (esViolacionUnique(err)) {
      return { ok: false, error: "El Group Leader ya está asignado a este viaje." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos asignar al Group Leader." };
  }
}

export async function quitarGroupLeaderAction(
  viajeId: string,
  groupLeaderId: string
): Promise<ActionResult<{ groupLeaderId: string }>> {
  const session = await requireAdminJuk();

  const ids = idsSchema.safeParse({ viajeId, groupLeaderId });
  if (!ids.success) return { ok: false, error: "Datos inválidos." };

  try {
    const borrado = await quitarGroupLeaderDeViaje(viajeId, groupLeaderId);
    if (!borrado) {
      return { ok: false, error: "El Group Leader no está asignado a este viaje." };
    }
    await safeAudit({
      accion: "desasignar_de_viaje",
      entidadTipo: "group_leader_viaje",
      entidadId: null,
      usuarioId: session.user.id,
      metadata: { viajeId, groupLeaderId },
    });
    revalidatePath("/viajes/[id]", "page");
    return { ok: true, data: { groupLeaderId } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos quitar al Group Leader del viaje." };
  }
}

export async function marcarPrincipalAction(
  viajeId: string,
  groupLeaderId: string
): Promise<ActionResult<{ groupLeaderId: string }>> {
  const session = await requireAdminJuk();

  const ids = idsSchema.safeParse({ viajeId, groupLeaderId });
  if (!ids.success) return { ok: false, error: "Datos inválidos." };

  try {
    const rel = await marcarPrincipal(viajeId, groupLeaderId);
    if (!rel) {
      return { ok: false, error: "El Group Leader no está asignado a este viaje." };
    }
    await safeAudit({
      accion: "update",
      entidadTipo: "group_leader_viaje",
      entidadId: rel.id,
      usuarioId: session.user.id,
      metadata: { viajeId, groupLeaderId, esPrincipal: true },
    });
    revalidatePath("/viajes/[id]", "page");
    return { ok: true, data: { groupLeaderId } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos marcar al Group Leader como principal." };
  }
}
