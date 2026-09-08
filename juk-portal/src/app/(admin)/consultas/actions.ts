"use server";

import type { ActionResult } from "@/lib/actions/result";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { updateEstadoConsulta } from "@/lib/db/queries/leads";
import { cambiarEstadoConsultaSchema } from "@/lib/domain/leads";
import type { Consulta } from "@/lib/db/schema/leads";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

export async function cambiarEstadoConsultaAction(
  input: unknown
): Promise<ActionResult<Consulta>> {
  await requireAdminJuk();

  const parsed = cambiarEstadoConsultaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const consulta = await updateEstadoConsulta(parsed.data.id, parsed.data.estado);
    if (!consulta) return { ok: false, error: "La consulta no existe." };
    revalidatePath("/consultas");
    return { ok: true, data: consulta };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos actualizar el estado." };
  }
}
