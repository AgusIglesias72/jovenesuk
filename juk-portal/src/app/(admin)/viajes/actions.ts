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
  capacidadMaxima,
  puedeTransicionar,
  viajeCreateSchema,
  viajeUpdateSchema,
} from "@/lib/domain/viajes";
import type { Viaje } from "@/lib/db/schema/viajes";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

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
      capacidadMaxima: capacidadMaxima(parsed.data.cantidadGroupLeaders),
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
  input: unknown
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
      estado,
      capacidadMaxima: capacidadMaxima(data.cantidadGroupLeaders),
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
  id: string
): Promise<ActionResult<Viaje>> {
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
      metadata: { estado: "cancelado" },
    });
    revalidatePath("/viajes");
    revalidatePath(`/viajes/${parsedId.data}/editar`);
    return { ok: true, data: viaje };
  } catch (err) {
    if (err instanceof ViajeNotFoundError) {
      return { ok: false, error: "El viaje no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos cancelar el viaje." };
  }
}
