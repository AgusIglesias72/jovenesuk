"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import {
  createColegio,
  setColegioEstado,
  updateColegio,
} from "@/lib/db/queries/colegios";
import {
  ColegioNotFoundError,
  colegioCreateSchema,
  colegioUpdateSchema,
} from "@/lib/domain/colegios";
import type { Colegio } from "@/lib/db/schema/colegios";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

// La auditoría es best-effort: si falla, lo registramos en Sentry pero no
// hacemos fallar la operación que el usuario ya vio como exitosa.
async function safeAudit(entry: NewAuditoriaEntry) {
  try {
    await registrarAuditoria(entry);
  } catch (err) {
    Sentry.captureException(err);
  }
}

export async function createColegioAction(
  input: unknown
): Promise<ActionResult<Colegio>> {
  const session = await requireAdminJuk();

  const parsed = colegioCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const colegio = await createColegio({
      ...parsed.data,
      createdBy: session.user.id,
    });
    await safeAudit({
      accion: "create",
      entidadTipo: "colegio",
      entidadId: colegio.id,
      usuarioId: session.user.id,
    });
    revalidatePath("/colegios");
    return { ok: true, data: colegio };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos crear el colegio. Probá de nuevo." };
  }
}

export async function updateColegioAction(
  input: unknown
): Promise<ActionResult<Colegio>> {
  const session = await requireAdminJuk();

  const parsed = colegioUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { id, ...data } = parsed.data;
  try {
    const colegio = await updateColegio(id, data);
    await safeAudit({
      accion: "update",
      entidadTipo: "colegio",
      entidadId: id,
      usuarioId: session.user.id,
    });
    revalidatePath("/colegios");
    revalidatePath(`/colegios/${id}/editar`);
    return { ok: true, data: colegio };
  } catch (err) {
    if (err instanceof ColegioNotFoundError) {
      return { ok: false, error: "El colegio no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar los cambios." };
  }
}

async function cambiarEstado(
  id: unknown,
  estado: Colegio["estado"]
): Promise<ActionResult<Colegio>> {
  const session = await requireAdminJuk();

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: "Colegio inválido." };
  }

  try {
    const colegio = await setColegioEstado(parsedId.data, estado);
    await safeAudit({
      accion: estado === "inactivo" ? "soft_delete" : "update",
      entidadTipo: "colegio",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
    });
    revalidatePath("/colegios");
    revalidatePath(`/colegios/${parsedId.data}/editar`);
    return { ok: true, data: colegio };
  } catch (err) {
    if (err instanceof ColegioNotFoundError) {
      return { ok: false, error: "El colegio no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos cambiar el estado del colegio." };
  }
}

export async function desactivarColegioAction(
  id: string
): Promise<ActionResult<Colegio>> {
  return cambiarEstado(id, "inactivo");
}

export async function reactivarColegioAction(
  id: string
): Promise<ActionResult<Colegio>> {
  return cambiarEstado(id, "activo");
}
