"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk } from "@/lib/auth/helpers";
import { getConsultaById, updateEstadoConsulta } from "@/lib/db/queries/leads";
import { cambiarEstadoConsultaSchema } from "@/lib/domain/leads";
import type { Consulta } from "@/lib/db/schema/leads";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

export async function cambiarEstadoConsultaAction(
  input: unknown
): Promise<ActionResult<Consulta>> {
  const session = await requireAdminJuk();

  const parsed = cambiarEstadoConsultaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const anterior = await getConsultaById(parsed.data.id);
    if (!anterior) return { ok: false, error: "La consulta no existe." };
    const consulta = await updateEstadoConsulta(parsed.data.id, parsed.data.estado);
    if (!consulta) return { ok: false, error: "La consulta no existe." };
    await safeAudit({
      accion: "update",
      entidadTipo: "consulta",
      entidadId: consulta.id,
      usuarioId: session.user.id,
      cambios: { before: { estado: anterior.estado }, after: { estado: consulta.estado } },
    });
    revalidatePath("/consultas");
    return { ok: true, data: consulta };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos actualizar el estado." };
  }
}
