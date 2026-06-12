"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import {
  createViaje,
  getViajeById,
  setViajeEstado,
  updateViaje,
} from "@/lib/db/queries/viajes";
import {
  VIAJE_ESTADO_LABELS,
  ViajeNotFoundError,
  aplicaComisionAgencia,
  aplicaFeeRepresentante,
  capacidadMaxima,
  estadoInicialViaje,
  puedeTransicionar,
  viajeCreateSchema,
  viajeUpdateSchema,
} from "@/lib/domain/viajes";
import type { ViajeCreateData } from "@/lib/domain/viajes";
import type { Viaje } from "@/lib/db/schema/viajes";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";
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

function isCodigoDuplicado(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}

// Normaliza los campos de comisiones según el origen (N/A donde no aplican) y
// adapta el fee al tipo string que espera la columna numeric de Drizzle.
function comisionesNormalizadas(data: ViajeCreateData) {
  return {
    comisionAgenciaPct: aplicaComisionAgencia(data.origen) ? data.comisionAgenciaPct : null,
    feeRepresentante:
      aplicaFeeRepresentante(data.origen) && data.feeRepresentante != null
        ? String(data.feeRepresentante)
        : null,
    feeRepresentanteEsPorcentaje: data.feeRepresentanteEsPorcentaje,
  };
}

export async function createViajeAction(
  input: unknown
): Promise<ActionResult<Viaje>> {
  const session = await requireAdminJuk();

  const parsed = viajeCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const viaje = await createViaje({
      ...parsed.data,
      ...comisionesNormalizadas(parsed.data),
      capacidadMaxima: capacidadMaxima(parsed.data.cantidadGroupLeaders, parsed.data.tipo),
      // Grupal nace en inscripción abierta; Individual nace Confirmado (US-10b).
      estado: estadoInicialViaje(parsed.data.tipo),
      createdBy: session.user.id,
    });
    await safeAudit({
      accion: "create",
      entidadTipo: "viaje",
      entidadId: viaje.id,
      usuarioId: session.user.id,
    });
    revalidatePath("/viajes");
    return { ok: true, data: viaje };
  } catch (err) {
    if (isCodigoDuplicado(err)) {
      return {
        ok: false,
        error: "Ya existe un viaje con ese código.",
        fieldErrors: { codigo: ["Ese código ya está en uso"] },
      };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos crear el viaje. Probá de nuevo." };
  }
}

export async function updateViajeAction(
  input: unknown,
  opts?: { confirmarPasaportes?: boolean }
): Promise<ActionResult<Viaje>> {
  const session = await requireAdminJuk();

  const parsed = viajeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { id, estado, ...data } = parsed.data;

  const actual = await getViajeById(id);
  if (!actual) {
    return { ok: false, error: "El viaje no existe." };
  }

  // US-13: editar fechas con inscriptos re-valida los pasaportes de todos.
  const fechasCambiaron =
    data.fechaInicio.getTime() !== actual.fechaInicio.getTime() ||
    data.fechaFin.getTime() !== actual.fechaFin.getTime();
  if (fechasCambiaron && !opts?.confirmarPasaportes) {
    const { listAsignacionesByViaje } = await import("@/lib/db/queries/asignaciones");
    const { pasaporteVigenteParaViaje } = await import("@/lib/domain/asignaciones");
    const roster = (await listAsignacionesByViaje(id)).filter((a) => a.estado === "activa");
    const comprometidos = roster.filter(
      (a) =>
        !pasaporteVigenteParaViaje(
          a.alumno.fechaVencimientoPasaporte,
          data.fechaFin,
          data.paisDestino
        )
    );
    if (comprometidos.length > 0) {
      const nombres = comprometidos
        .slice(0, 3)
        .map((a) => `${a.alumno.apellido}, ${a.alumno.nombre}`)
        .join(" · ");
      return {
        ok: false,
        requiereConfirmacion: true,
        error: `Con las fechas nuevas, ${comprometidos.length} pasaporte${comprometidos.length === 1 ? " queda comprometido" : "s quedan comprometidos"} (${nombres}${comprometidos.length > 3 ? "…" : ""}). ¿Guardar igual?`,
      };
    }
  }

  const cambioEstado = estado !== actual.estado;
  if (cambioEstado && !puedeTransicionar(actual.estado, estado)) {
    return {
      ok: false,
      error: `No se puede pasar de "${VIAJE_ESTADO_LABELS[actual.estado]}" a "${VIAJE_ESTADO_LABELS[estado]}". Esa transición de estado no está permitida.`,
      fieldErrors: { estado: ["Transición de estado inválida"] },
    };
  }

  try {
    const viaje = await updateViaje(id, {
      ...data,
      ...comisionesNormalizadas(data),
      estado,
      // El tipo no se cambia post-creación (el form lo deshabilita en edit).
      tipo: actual.tipo,
      capacidadMaxima: capacidadMaxima(data.cantidadGroupLeaders, actual.tipo),
    });
    await safeAudit({
      accion: "update",
      entidadTipo: "viaje",
      entidadId: id,
      usuarioId: session.user.id,
    });
    if (cambioEstado) {
      await safeAudit({
        accion: "cambio_estado_viaje",
        entidadTipo: "viaje",
        entidadId: id,
        usuarioId: session.user.id,
        metadata: { estadoAnterior: actual.estado, estado },
      });
    }
    revalidatePath("/viajes");
    revalidatePath(`/viajes/${id}/editar`);
    return { ok: true, data: viaje };
  } catch (err) {
    if (err instanceof ViajeNotFoundError) {
      return { ok: false, error: "El viaje no existe." };
    }
    if (isCodigoDuplicado(err)) {
      return {
        ok: false,
        error: "Ya existe un viaje con ese código.",
        fieldErrors: { codigo: ["Ese código ya está en uso"] },
      };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar los cambios." };
  }
}

export async function cancelarViajeAction(
  id: string,
  opts?: { notificarInscriptos?: boolean }
): Promise<ActionResult<Viaje & { notificados?: number }>> {
  const session = await requireAdminJuk();

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: "Viaje inválido." };
  }

  try {
    const viaje = await setViajeEstado(parsedId.data, "cancelado");
    await safeAudit({
      accion: "cambio_estado_viaje",
      entidadTipo: "viaje",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
      metadata: { estado: "cancelado", notificarInscriptos: opts?.notificarInscriptos ?? false },
    });

    // US-13: ofrecer notificar a los inscriptos al cancelar (best-effort).
    let notificados = 0;
    if (opts?.notificarInscriptos) {
      const { listAsignacionesByViaje } = await import("@/lib/db/queries/asignaciones");
      const { getAlumnoById } = await import("@/lib/db/queries/alumnos");
      const { sendEmail } = await import("@/lib/email");
      const { ViajeCanceladoEmail } = await import("@/lib/email/templates/viaje-cancelado-email");
      const roster = (await listAsignacionesByViaje(parsedId.data)).filter(
        (a) => a.estado === "activa"
      );
      for (const a of roster) {
        try {
          const alumno = await getAlumnoById(a.alumno.id);
          if (!alumno) continue;
          await sendEmail({
            to: alumno.tutor1Email,
            subject: `Cancelación del viaje ${viaje.codigo}`,
            react: ViajeCanceladoEmail({
              tutorNombre: alumno.tutor1Nombre,
              alumnoNombre: `${alumno.nombre} ${alumno.apellido}`,
              viajeNombre: viaje.nombre,
              viajeCodigo: viaje.codigo,
            }),
          });
          notificados += 1;
        } catch (err) {
          Sentry.captureException(err);
        }
      }
    }

    revalidatePath("/viajes");
    revalidatePath(`/viajes/${parsedId.data}/editar`);
    return { ok: true, data: { ...viaje, notificados } };
  } catch (err) {
    if (err instanceof ViajeNotFoundError) {
      return { ok: false, error: "El viaje no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos cancelar el viaje." };
  }
}
