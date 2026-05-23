"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import {
  finalizarAltaUsuario,
  setUsuarioActivo,
  setUsuarioRole,
} from "@/lib/db/queries/usuarios";
import {
  UsuarioNotFoundError,
  usuarioCreateSchema,
  usuarioRoleEnum,
} from "@/lib/domain/usuarios";
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

type UsuarioCreado = { email: string; name: string; tempPassword: string };

export async function createUsuarioAction(
  input: unknown
): Promise<ActionResult<UsuarioCreado>> {
  const session = await requireRole("super_admin");

  const parsed = usuarioCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  // Password temporal: 12 chars base64url, legible y copiable.
  const tempPassword = randomBytes(9).toString("base64url");

  try {
    // signUpEmail server-side NO setea cookie (no usamos el plugin nextCookies),
    // así que crea el usuario sin tocar la sesión del admin actual.
    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: tempPassword,
        name: parsed.data.name,
      },
    });
    if (!result || !result.user) {
      return { ok: false, error: "No pudimos crear el usuario." };
    }

    await finalizarAltaUsuario(parsed.data.email, parsed.data.role);
    await safeAudit({
      accion: "create",
      entidadTipo: "usuario",
      entidadId: result.user.id,
      usuarioId: session.user.id,
    });
    revalidatePath("/usuarios");
    return {
      ok: true,
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        tempPassword,
      },
    };
  } catch (err) {
    Sentry.captureException(err);
    return {
      ok: false,
      error: "No pudimos crear el usuario. ¿Quizás el email ya está registrado?",
      fieldErrors: { email: ["Revisá que el email no esté en uso"] },
    };
  }
}

export async function cambiarRolUsuarioAction(
  id: string,
  role: string
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole("super_admin");

  const parsedId = z.string().uuid().safeParse(id);
  const parsedRole = usuarioRoleEnum.safeParse(role);
  if (!parsedId.success || !parsedRole.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  if (parsedId.data === session.user.id) {
    return { ok: false, error: "No podés cambiar tu propio rol." };
  }

  try {
    await setUsuarioRole(parsedId.data, parsedRole.data);
    await safeAudit({
      accion: "update",
      entidadTipo: "usuario",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
      metadata: { role: parsedRole.data },
    });
    revalidatePath("/usuarios");
    return { ok: true, data: { id: parsedId.data } };
  } catch (err) {
    if (err instanceof UsuarioNotFoundError) {
      return { ok: false, error: "El usuario no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos cambiar el rol." };
  }
}

export async function setActivoUsuarioAction(
  id: string,
  activo: boolean
): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole("super_admin");

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Usuario inválido." };
  if (parsedId.data === session.user.id) {
    return { ok: false, error: "No podés desactivar tu propia cuenta." };
  }

  try {
    await setUsuarioActivo(parsedId.data, activo);
    await safeAudit({
      accion: "update",
      entidadTipo: "usuario",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
      metadata: { isActive: activo },
    });
    revalidatePath("/usuarios");
    return { ok: true, data: { id: parsedId.data } };
  } catch (err) {
    if (err instanceof UsuarioNotFoundError) {
      return { ok: false, error: "El usuario no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos cambiar el estado del usuario." };
  }
}
