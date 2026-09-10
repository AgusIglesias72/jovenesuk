"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk } from "@/lib/auth/helpers";
import { alumnoIdDeAsignacion } from "@/lib/db/queries/asignaciones";
import {
  advertenciaPagoFueraDeOrden,
  registrarPagoCuota,
  sincronizarPasosPago,
} from "@/lib/db/queries/cuotas";
import { CuotaNotFoundError, registrarPagoSchema } from "@/lib/domain/cuotas";
import { toDateInput } from "@/lib/utils/date";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

/** Registrar pago desde el módulo Pagos (misma lógica que en la ficha del alumno). */
export async function registrarPagoDesdePagosAction(
  input: unknown,
  opts?: { confirmar?: boolean }
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminJuk();

  const parsed = registrarPagoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los datos del pago.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const { cuotaId, fechaPago, observaciones } = parsed.data;

  if (!opts?.confirmar) {
    const advertencia = await advertenciaPagoFueraDeOrden(cuotaId);
    if (advertencia) return { ok: false, requiereConfirmacion: true, error: advertencia };
  }

  try {
    const cuota = await registrarPagoCuota({
      cuotaId,
      fechaPagoEfectivo: fechaPago,
      observaciones,
      registradoPor: session.user.id,
    });
    await sincronizarPasosPago(cuota.asignacionId, session.user.id);
    await safeAudit({
      accion: "registrar_pago",
      entidadTipo: "cuota",
      entidadId: cuota.id,
      usuarioId: session.user.id,
      metadata: {
        numero: cuota.numero,
        canal: cuota.canal,
        desde: "modulo_pagos",
        ...(fechaPago ? { fechaPago: toDateInput(fechaPago) } : {}),
        ...(observaciones ? { observaciones } : {}),
      },
    });
    revalidatePath("/pagos");
    const alumnoId = await alumnoIdDeAsignacion(cuota.asignacionId);
    if (alumnoId) revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { id: cuota.id } };
  } catch (err) {
    if (err instanceof CuotaNotFoundError) {
      return { ok: false, error: "La cuota no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos registrar el pago." };
  }
}
