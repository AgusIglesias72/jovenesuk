"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk } from "@/lib/auth/helpers";
import { alumnoIdDeAsignacion } from "@/lib/db/queries/asignaciones";
import { getPasoAlumnoById, updatePasoAlumno } from "@/lib/db/queries/pasos-alumno";
import {
  ETA_SUBESTADOS,
  PASO_CODIGOS,
  PASO_ESTADOS,
  PC_SUBESTADOS,
  admiteFechaLimite,
  estadoPasoDesdeEta,
  estadoPasoDesdePc,
  puedeTransicionarPasoAlumno,
  transicionRequiereNota,
  type EtaSubEstado,
  type PasoCodigo,
  type PasoEstado,
  type PcSubEstado,
} from "@/lib/domain/pasos";
import { toDateInput } from "@/lib/utils/date";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

const transicionSchema = z
  .object({
    pasoId: z.string().uuid(),
    nuevoEstado: z.enum(PASO_ESTADOS),
    nota: z.string().trim().max(2000).optional(),
  })
  .superRefine((d, ctx) => {
    if (transicionRequiereNota(d.nuevoEstado) && !d.nota) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nota"],
        message: "Contá el motivo del bloqueo.",
      });
    }
  });

export async function transicionarPasoAlumnoAction(
  input: unknown
): Promise<ActionResult<{ id: string; estado: PasoEstado }>> {
  const session = await requireAdminJuk();

  const parsed = transicionSchema.safeParse(input);
  if (!parsed.success) {
    const motivo = parsed.error.issues.find((i) => i.path[0] === "nota");
    return {
      ok: false,
      error: motivo?.message ?? "Datos inválidos.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const { pasoId, nuevoEstado, nota } = parsed.data;

  const paso = await getPasoAlumnoById(pasoId);
  if (!paso) return { ok: false, error: "El paso no existe." };

  // El dueño se deriva del paso (nunca del cliente): revalida la página correcta.
  const alumnoId = await alumnoIdDeAsignacion(paso.asignacionId);
  if (!alumnoId) return { ok: false, error: "La asignación del paso no existe." };

  const codigo = paso.codigo as PasoCodigo;
  const actual = paso.estado as PasoEstado;
  if (!PASO_CODIGOS.includes(codigo)) return { ok: false, error: "Paso desconocido." };

  if (!puedeTransicionarPasoAlumno(codigo, actual, nuevoEstado)) {
    return {
      ok: false,
      error:
        codigo === "paso_0"
          ? "El Paso 0 es de solo lectura."
          : `No se puede pasar de "${actual}" a "${nuevoEstado}" en ${codigo.toUpperCase()}.`,
    };
  }

  try {
    await updatePasoAlumno(
      pasoId,
      {
        estado: nuevoEstado,
        fechaCompletado: nuevoEstado === "completado" ? new Date() : null,
        ...(nota !== undefined ? { notas: nota || null } : {}),
      },
      session.user.id
    );

    await safeAudit({
      accion: "cambio_estado_paso",
      entidadTipo: "paso_alumno",
      entidadId: pasoId,
      usuarioId: session.user.id,
      metadata: {
        codigo,
        estadoAnterior: actual,
        estado: nuevoEstado,
        ...(nota ? { nota } : {}),
      },
    });

    revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { id: pasoId, estado: nuevoEstado } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos actualizar el paso." };
  }
}

const fechaLimiteSchema = z.object({
  pasoId: z.string().uuid(),
  fechaLimite: z.preprocess(
    (v) => (v === "" || v == null ? undefined : new Date(v as string)),
    z.date({ required_error: "Elegí la fecha límite", invalid_type_error: "Fecha inválida" })
  ),
});

/**
 * US-20: la fecha límite de A1 nace del viaje (inicio − 30 días) y se ajusta
 * por alumno. Es la que usa scan-recordatorios para marcar el paso Vencido.
 */
export async function actualizarFechaLimiteA1Action(
  input: unknown
): Promise<ActionResult<{ id: string; fechaLimite: string }>> {
  const session = await requireAdminJuk();

  const parsed = fechaLimiteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  const { pasoId, fechaLimite } = parsed.data;

  const paso = await getPasoAlumnoById(pasoId);
  if (!paso) return { ok: false, error: "El paso no existe." };

  const alumnoId = await alumnoIdDeAsignacion(paso.asignacionId);
  if (!alumnoId) return { ok: false, error: "La asignación del paso no existe." };

  const codigo = paso.codigo as PasoCodigo;
  if (!admiteFechaLimite(codigo)) {
    return { ok: false, error: "Este paso no tiene fecha límite." };
  }

  const antes = paso.fechaLimite ? toDateInput(paso.fechaLimite) : null;
  const despues = toDateInput(fechaLimite);

  try {
    await updatePasoAlumno(pasoId, { fechaLimite }, session.user.id);
    await safeAudit({
      accion: "update",
      entidadTipo: "paso_alumno",
      entidadId: pasoId,
      usuarioId: session.user.id,
      cambios: { before: { fechaLimite: antes }, after: { fechaLimite: despues } },
      metadata: { codigo },
    });

    revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { id: pasoId, fechaLimite: despues } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos actualizar la fecha límite." };
  }
}

const subEstadoSchema = z.object({
  pasoId: z.string().uuid(),
  subEstado: z.string().trim().min(1),
  numeroAutorizacion: z.string().trim().max(120).optional(),
});

/** US-31 (C1/ETA) y US-29 (A3/Parental Consent): el estado del paso se deriva del sub-estado. */
export async function actualizarSubEstadoPasoAction(
  input: unknown
): Promise<ActionResult<{ id: string; estado: PasoEstado; subEstado: string }>> {
  const session = await requireAdminJuk();

  const parsed = subEstadoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { pasoId, subEstado, numeroAutorizacion } = parsed.data;

  const paso = await getPasoAlumnoById(pasoId);
  if (!paso) return { ok: false, error: "El paso no existe." };

  const alumnoId = await alumnoIdDeAsignacion(paso.asignacionId);
  if (!alumnoId) return { ok: false, error: "La asignación del paso no existe." };

  const codigo = paso.codigo as PasoCodigo;

  let nuevoEstado: PasoEstado;
  if (codigo === "c1") {
    if (!ETA_SUBESTADOS.includes(subEstado as EtaSubEstado)) {
      return { ok: false, error: "Sub-estado de ETA desconocido." };
    }
    nuevoEstado = estadoPasoDesdeEta(subEstado as EtaSubEstado);
  } else if (codigo === "a3") {
    if (!PC_SUBESTADOS.includes(subEstado as PcSubEstado)) {
      return { ok: false, error: "Sub-estado de Parental Consent desconocido." };
    }
    nuevoEstado = estadoPasoDesdePc(subEstado as PcSubEstado);
  } else {
    return { ok: false, error: "Este paso no maneja sub-estados." };
  }

  const nuevoMetadata: Record<string, unknown> = { ...paso.metadata, subEstado };
  if (numeroAutorizacion !== undefined) {
    if (numeroAutorizacion) nuevoMetadata.numeroAutorizacion = numeroAutorizacion;
    else delete nuevoMetadata.numeroAutorizacion;
  }

  try {
    await updatePasoAlumno(
      pasoId,
      {
        estado: nuevoEstado,
        metadata: nuevoMetadata,
        fechaCompletado: nuevoEstado === "completado" ? new Date() : null,
      },
      session.user.id
    );

    await safeAudit({
      accion: "cambio_estado_paso",
      entidadTipo: "paso_alumno",
      entidadId: pasoId,
      usuarioId: session.user.id,
      metadata: { codigo, subEstado },
    });

    revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { id: pasoId, estado: nuevoEstado, subEstado } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos actualizar el sub-estado." };
  }
}
