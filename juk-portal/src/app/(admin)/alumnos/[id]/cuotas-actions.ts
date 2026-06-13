"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import { alumnoIdDeAsignacion } from "@/lib/db/queries/asignaciones";
import {
  PlanConPagosError,
  advertenciaPagoFueraDeOrden,
  crearPlanCuotas,
  listCuotasByAsignacion,
  registrarPagoCuota,
  sincronizarPasosPago,
} from "@/lib/db/queries/cuotas";
import { db } from "@/lib/db";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { viajes } from "@/lib/db/schema/viajes";
import { planCuotasSchema, registrarPagoSchema } from "@/lib/domain/cuotas";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";
import { eq } from "drizzle-orm";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
      requiereConfirmacion?: boolean;
    };

async function safeAudit(entry: NewAuditoriaEntry) {
  try {
    await registrarAuditoria(entry);
  } catch (err) {
    Sentry.captureException(err);
  }
}

async function origenDeAsignacion(asignacionId: string) {
  const rows = await db
    .select({ origen: viajes.origen, alumnoId: asignaciones.alumnoId })
    .from(asignaciones)
    .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
    .where(eq(asignaciones.id, asignacionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function crearPlanCuotasAction(
  input: unknown
): Promise<ActionResult<{ cuotas: number }>> {
  const session = await requireAdminJuk();

  const parsed = planCuotasSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los datos del plan.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const ctx = await origenDeAsignacion(parsed.data.asignacionId);
  if (!ctx) return { ok: false, error: "La asignación no existe." };

  try {
    const rows = await crearPlanCuotas({
      asignacionId: parsed.data.asignacionId,
      cantidadCuotas: parsed.data.cantidadCuotas,
      montoPorCuota: parsed.data.montoPorCuota,
      moneda: parsed.data.moneda,
      primerVencimiento: parsed.data.primerVencimiento,
      origenViaje: ctx.origen,
      registradoPor: session.user.id,
    });
    await sincronizarPasosPago(parsed.data.asignacionId, session.user.id);
    await safeAudit({
      accion: "create",
      entidadTipo: "plan_cuotas",
      entidadId: parsed.data.asignacionId,
      usuarioId: session.user.id,
      metadata: { cuotas: rows.length, moneda: parsed.data.moneda },
    });
    revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { cuotas: rows.length } };
  } catch (err) {
    if (err instanceof PlanConPagosError) {
      return { ok: false, error: err.message };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos crear el plan de cuotas." };
  }
}

export async function registrarPagoCuotaAction(
  input: unknown,
  opts?: { confirmar?: boolean }
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminJuk();

  const parsed = registrarPagoSchema.safeParse(input);
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
      metadata: { numero: cuota.numero, canal: cuota.canal },
    });
    // El dueño se deriva de la cuota (nunca del cliente).
    const alumnoId = await alumnoIdDeAsignacion(cuota.asignacionId);
    if (alumnoId) revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { id: cuota.id } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos registrar el pago." };
  }
}

/** B2 (US-35): confirma que la ÚLTIMA cuota se cobró presencialmente en JUK. */
export async function confirmarUltimoPagoPresencialAction(
  asignacionId: string
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdminJuk();

  const ids = z.object({ asignacionId: z.string().uuid() }).safeParse({ asignacionId });
  if (!ids.success) return { ok: false, error: "Datos inválidos." };

  const alumnoId = await alumnoIdDeAsignacion(asignacionId);
  if (!alumnoId) return { ok: false, error: "La asignación no existe." };

  const plan = await listCuotasByAsignacion(asignacionId);
  const ultima = plan.find((c) => c.esUltimaCuota === 1);
  if (!ultima) return { ok: false, error: "El plan no tiene última cuota definida." };
  if (ultima.canal !== "presencial") {
    return {
      ok: false,
      error: "Este viaje no tiene excepción presencial: el último pago va vía agencia.",
    };
  }

  try {
    const cuota = await registrarPagoCuota({
      cuotaId: ultima.id,
      registradoPor: session.user.id,
      canalPresencial: true,
    });
    await sincronizarPasosPago(asignacionId, session.user.id);
    await safeAudit({
      accion: "registrar_pago",
      entidadTipo: "cuota",
      entidadId: cuota.id,
      usuarioId: session.user.id,
      metadata: { numero: cuota.numero, canal: "presencial", b2: true },
    });
    revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { id: cuota.id } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos confirmar el pago presencial." };
  }
}
