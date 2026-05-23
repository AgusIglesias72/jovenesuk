"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { requireAdminJuk } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import {
  createGroupLeader,
  updateGroupLeader,
} from "@/lib/db/queries/group-leaders";
import {
  GroupLeaderNotFoundError,
  groupLeaderCreateSchema,
  groupLeaderUpdateSchema,
} from "@/lib/domain/group-leaders";
import type { GroupLeader } from "@/lib/db/schema/grupos-leaders";
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

function isEmailDuplicado(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}

export async function createGroupLeaderAction(
  input: unknown
): Promise<ActionResult<GroupLeader>> {
  const session = await requireAdminJuk();

  const parsed = groupLeaderCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const gl = await createGroupLeader(parsed.data);
    await safeAudit({
      accion: "create",
      entidadTipo: "group_leader",
      entidadId: gl.id,
      usuarioId: session.user.id,
    });
    revalidatePath("/group-leaders");
    return { ok: true, data: gl };
  } catch (err) {
    if (isEmailDuplicado(err)) {
      return {
        ok: false,
        error: "Ya existe un Group Leader con ese email.",
        fieldErrors: { email: ["Ese email ya está en uso"] },
      };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos crear el Group Leader. Probá de nuevo." };
  }
}

export async function updateGroupLeaderAction(
  input: unknown
): Promise<ActionResult<GroupLeader>> {
  const session = await requireAdminJuk();

  const parsed = groupLeaderUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { id, ...data } = parsed.data;
  try {
    const gl = await updateGroupLeader(id, data);
    await safeAudit({
      accion: "update",
      entidadTipo: "group_leader",
      entidadId: id,
      usuarioId: session.user.id,
    });
    revalidatePath("/group-leaders");
    revalidatePath(`/group-leaders/${id}/editar`);
    return { ok: true, data: gl };
  } catch (err) {
    if (err instanceof GroupLeaderNotFoundError) {
      return { ok: false, error: "El Group Leader no existe." };
    }
    if (isEmailDuplicado(err)) {
      return {
        ok: false,
        error: "Ya existe un Group Leader con ese email.",
        fieldErrors: { email: ["Ese email ya está en uso"] },
      };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar los cambios." };
  }
}
