"use server";

import type { ActionResult } from "@/lib/actions/result";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireRole } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import { setMailSettings } from "@/lib/db/queries/configuracion";
import { sendEmail } from "@/lib/email";
import { construirTemplatePrueba } from "@/lib/email/preview";
import { mailSettingsSchema, type TipoEmail } from "@/lib/domain/configuracion";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

import { MAIL_TEMPLATES, type MailTemplateKey } from "./mail-templates-meta";

export async function guardarMailsAction(
  input: unknown
): Promise<ActionResult<{ guardado: true }>> {
  const session = await requireRole("super_admin");

  const parsed = mailSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los remitentes.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    await setMailSettings(parsed.data, session.user.id);
    try {
      await registrarAuditoria({
        accion: "update",
        entidadTipo: "configuracion",
        usuarioId: session.user.id,
        metadata: { clave: "mails", ...parsed.data },
      });
    } catch (err) {
      Sentry.captureException(err);
    }
    revalidatePath("/configuracion");
    return { ok: true, data: { guardado: true } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar la configuración." };
  }
}

const pruebaSchema = z.object({
  template: z.enum(MAIL_TEMPLATES.map((t) => t.key) as [MailTemplateKey, ...MailTemplateKey[]]),
  to: z.string().trim().email("Email inválido."),
});

/** Envía el template elegido con datos de ejemplo y asunto [PRUEBA]. */
export async function enviarMailPruebaAction(
  input: unknown
): Promise<ActionResult<{ enviado: true }>> {
  const session = await requireRole("super_admin");

  const parsed = pruebaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los datos de la prueba.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const meta = MAIL_TEMPLATES.find((t) => t.key === parsed.data.template);
  const contenido = construirTemplatePrueba(parsed.data.template, parsed.data.to);
  if (!meta) return { ok: false, error: "Template desconocido." };

  try {
    await sendEmail({
      to: parsed.data.to,
      tipo: meta.tipo as TipoEmail,
      subject: `[PRUEBA] ${contenido.subject}`,
      react: contenido.react,
    });
    try {
      await registrarAuditoria({
        accion: "update",
        entidadTipo: "configuracion",
        usuarioId: session.user.id,
        metadata: { prueba: parsed.data.template, to: parsed.data.to },
      });
    } catch (err) {
      Sentry.captureException(err);
    }
    return { ok: true, data: { enviado: true } };
  } catch (err) {
    Sentry.captureException(err);
    return {
      ok: false,
      error:
        "No pudimos enviar la prueba. Verificá la API key de Resend y que el dominio del remitente esté verificado.",
    };
  }
}
