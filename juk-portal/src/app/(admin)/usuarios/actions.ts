"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth/helpers";
import {
  finalizarAltaUsuario,
  getUsuarioById,
  setUsuarioActivo,
  setUsuarioRole,
} from "@/lib/db/queries/usuarios";
import {
  UsuarioNotFoundError,
  usuarioCreateSchema,
  usuarioRoleEnum,
} from "@/lib/domain/usuarios";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

type UsuarioCreado = { email: string; name: string; emailEnviado: boolean };

/**
 * Manda el link de creación de contraseña (token de Better-Auth, 24 h).
 * Devuelve false si el envío falló: el alta no se pierde por un email caído.
 */
async function enviarLinkDeAcceso(email: string): Promise<boolean> {
  try {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: "/reset-password?alta=equipo" },
    });
    return true;
  } catch (err) {
    Sentry.captureException(err);
    return false;
  }
}

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

  // La cuenta nace con una password aleatoria que nadie conoce: el usuario
  // entra creando la suya desde el link. Ni el super_admin la ve.
  const passwordPlaceholder = randomBytes(24).toString("base64url");

  try {
    // signUpEmail server-side NO setea cookie (no usamos el plugin nextCookies),
    // así que crea el usuario sin tocar la sesión del admin actual.
    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: passwordPlaceholder,
        name: parsed.data.name,
      },
    });
    if (!result || !result.user) {
      return { ok: false, error: "No pudimos crear el usuario." };
    }

    await finalizarAltaUsuario(parsed.data.email, parsed.data.role);
    const emailEnviado = await enviarLinkDeAcceso(parsed.data.email);
    await safeAudit({
      accion: "create",
      entidadTipo: "usuario",
      entidadId: result.user.id,
      usuarioId: session.user.id,
      metadata: { role: parsed.data.role, emailEnviado },
    });
    revalidatePath("/usuarios");
    return {
      ok: true,
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        emailEnviado,
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

/** Reenvía el link de creación de contraseña. No invalida la clave vigente. */
export async function reenviarAccesoUsuarioAction(
  id: string
): Promise<ActionResult<{ email: string }>> {
  const session = await requireRole("super_admin");

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Usuario inválido." };

  const usuario = await getUsuarioById(parsedId.data);
  if (!usuario) return { ok: false, error: "El usuario no existe." };
  if (usuario.role === "familia") {
    return {
      ok: false,
      error: "El acceso de las familias se manda desde la ficha del alumno.",
    };
  }

  const emailEnviado = await enviarLinkDeAcceso(usuario.email);
  if (!emailEnviado) {
    return {
      ok: false,
      error: "No pudimos mandar el email. Revisá la configuración de Resend.",
    };
  }

  await safeAudit({
    accion: "update",
    entidadTipo: "usuario",
    entidadId: parsedId.data,
    usuarioId: session.user.id,
    metadata: { accion: "reenviar_acceso" },
  });
  return { ok: true, data: { email: usuario.email } };
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
