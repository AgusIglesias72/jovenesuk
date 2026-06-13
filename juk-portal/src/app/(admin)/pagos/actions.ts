"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import { alumnoIdDeAsignacion } from "@/lib/db/queries/asignaciones";
import {
  advertenciaPagoFueraDeOrden,
  registrarPagoCuota,
  sincronizarPasosPago,
} from "@/lib/db/queries/cuotas";
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

/** Registrar pago desde el módulo Pagos (misma lógica que en la ficha del alumno). */
export async function registrarPagoDesdePagosAction(
  input: unknown,
  opts?: { confirmar?: boolean }
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminJuk();

  const parsed = z
    .object({ cuotaId: z.string().uuid(), observaciones: z.string().max(500).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  if (!opts?.confirmar) {
    const advertencia = await advertenciaPagoFueraDeOrden(parsed.data.cuotaId);
    if (advertencia) return { ok: false, requiereConfirmacion: true, error: advertencia };
  }

  try {
    const cuota = await registrarPagoCuota({
      cuotaId: parsed.data.cuotaId,
      observaciones: parsed.data.observaciones,
      registradoPor: session.user.id,
    });
    await sincronizarPasosPago(cuota.asignacionId, session.user.id);
    await safeAudit({
      accion: "registrar_pago",
      entidadTipo: "cuota",
      entidadId: cuota.id,
      usuarioId: session.user.id,
      metadata: { numero: cuota.numero, canal: cuota.canal, desde: "modulo_pagos" },
    });
    revalidatePath("/pagos");
    const alumnoId = await alumnoIdDeAsignacion(cuota.asignacionId);
    if (alumnoId) revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { id: cuota.id } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos registrar el pago." };
  }
}
