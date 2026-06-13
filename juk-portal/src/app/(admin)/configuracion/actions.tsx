"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { requireRole } from "@/lib/auth/helpers";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import { setMailSettings } from "@/lib/db/queries/configuracion";
import { sendEmail } from "@/lib/email";
import { PasswordChangedEmail } from "@/lib/email/templates/password-changed-email";
import { RecordatorioEmail } from "@/lib/email/templates/recordatorio-email";
import { ResetPasswordEmail } from "@/lib/email/templates/reset-password-email";
import { ViajeCanceladoEmail } from "@/lib/email/templates/viaje-cancelado-email";
import { WelcomeEmail } from "@/lib/email/templates/welcome-email";
import { mailSettingsSchema, type TipoEmail } from "@/lib/domain/configuracion";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

import { MAIL_TEMPLATES, type MailTemplateKey } from "./mail-templates-meta";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

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

function templatePrueba(key: MailTemplateKey, destinatario: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  switch (key) {
    case "welcome":
      return {
        subject: "Acceso al Portal JUK · Ejemplo",
        react: (
          <WelcomeEmail
            name="Nombre de Ejemplo"
            email={destinatario}
            temporaryPassword="Temporal123!"
            loginUrl={`${appUrl}/login`}
            invitedByName="María"
          />
        ),
      };
    case "reset-password":
      return {
        subject: "Restablecé tu contraseña · Portal JUK",
        react: <ResetPasswordEmail name="Nombre de Ejemplo" resetUrl={`${appUrl}/reset-password`} />,
      };
    case "password-changed":
      return {
        subject: "Tu contraseña fue cambiada · Portal JUK",
        react: <PasswordChangedEmail name="Nombre de Ejemplo" changedAt="12 de junio de 2026, 10:00 (ART)" />,
      };
    case "recordatorio":
      return {
        subject: "Recordatorio · Application Form de Alumno Ejemplo (7 días)",
        react: (
          <RecordatorioEmail
            tutorNombre="Tutora de Ejemplo"
            alumnoNombre="Alumno Ejemplo"
            viajeCodigo="UK-2026-JUL-LONDON"
            paso="Application Form"
            diasAntes={7}
            fechaObjetivo={new Date(Date.now() + 7 * 86_400_000)}
          />
        ),
      };
    case "viaje-cancelado":
      return {
        subject: "Cancelación del viaje UK-2026-JUL-LONDON",
        react: (
          <ViajeCanceladoEmail
            tutorNombre="Tutora de Ejemplo"
            alumnoNombre="Alumno Ejemplo"
            viajeNombre="Londres en Julio"
            viajeCodigo="UK-2026-JUL-LONDON"
          />
        ),
      };
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
  const contenido = templatePrueba(parsed.data.template, parsed.data.to);
  if (!meta || !contenido) return { ok: false, error: "Template desconocido." };

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
