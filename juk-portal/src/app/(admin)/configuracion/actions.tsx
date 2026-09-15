"use server";

import type { ActionResult } from "@/lib/actions/result";
import { render } from "@react-email/render";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { safeAudit } from "@/lib/actions/safe-audit";
import { requireRole } from "@/lib/auth/helpers";
import { getMailSettings, setMailSettings } from "@/lib/db/queries/configuracion";
import { sendEmail } from "@/lib/email";
import { construirTemplatePrueba } from "@/lib/email/preview";
import { mailSettingsSchema, type TipoEmail } from "@/lib/domain/configuracion";
import {
  evaluarEntorno,
  resumenPorServicio,
  type EstadoEnv,
  type PerfilEnv,
} from "@/lib/domain/configuracion/env";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

import { MAIL_TEMPLATES, type MailTemplateKey } from "./mail-templates-meta";

const templateKeySchema = z.enum(
  MAIL_TEMPLATES.map((t) => t.key) as [MailTemplateKey, ...MailTemplateKey[]]
);

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
    await safeAudit({
      accion: "update",
      entidadTipo: "configuracion",
      usuarioId: session.user.id,
      metadata: { clave: "mails", ...parsed.data },
    });
    revalidatePath("/configuracion");
    return { ok: true, data: { guardado: true } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar la configuración." };
  }
}

const pruebaSchema = z.object({
  template: templateKeySchema,
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
    await safeAudit({
      accion: "update",
      entidadTipo: "configuracion",
      usuarioId: session.user.id,
      metadata: { prueba: parsed.data.template, to: parsed.data.to },
    });
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

/** Renderiza un template a HTML para previsualizarlo en pantalla (no envía nada). */
export async function previewTemplateAction(input: unknown): Promise<ActionResult<{ html: string }>> {
  await requireRole("super_admin");

  const parsed = templateKeySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Template desconocido." };

  try {
    const { react } = construirTemplatePrueba(parsed.data, "ejemplo@jovenesenuk.com");
    const html = await render(react);
    return { ok: true, data: { html } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos renderizar el template." };
  }
}

export type EstadoServicios = {
  nodeEnv: string;
  dbHost: string;
  servicios: { nombre: string; estado: EstadoEnv; detalle: string }[];
  mails: { nombreRemitente: string; automaticos: string; comunicaciones: string };
};

/**
 * En un deploy se exige el perfil de producción (donde la falta de R2 o de
 * Resend rompe una capacidad); en local alcanza con lo mínimo para desarrollar.
 */
function perfilDelEntorno(): PerfilEnv {
  return process.env.NODE_ENV === "production" || process.env.VERCEL ? "produccion" : "local";
}

/**
 * Estado de los servicios externos: qué está configurado y qué falta. Sale del
 * mismo catálogo que `npm run check:env`, así la pantalla y la terminal no se
 * contradicen. Un valor que quedó con el molde de `.env.example` se reporta
 * aparte: "presente" sería mentira y rompe distinto (ver `esPlaceholder`).
 */
export async function getEstadoServiciosAction(): Promise<ActionResult<EstadoServicios>> {
  await requireRole("super_admin");

  try {
    const dbUrl = process.env.DATABASE_URL ?? "";
    let dbHost = "—";
    try {
      dbHost = dbUrl ? new URL(dbUrl).host : "—";
    } catch {
      dbHost = "(no parseable)";
    }

    const mails = await getMailSettings();
    const servicios = resumenPorServicio(evaluarEntorno(process.env, perfilDelEntorno())).map(
      (s) => ({
        nombre: s.nombre,
        estado: s.estado,
        // La base es el único servicio con algo mejor que "configurado" para
        // mostrar: a qué host está apuntando este deploy.
        detalle: s.servicio === "neon" && s.estado === "ok" ? dbHost : s.detalle,
      })
    );

    return {
      ok: true,
      data: {
        nodeEnv: process.env.NODE_ENV ?? "development",
        dbHost,
        servicios,
        mails: {
          nombreRemitente: mails.nombreRemitente,
          automaticos: mails.remitenteAutomaticos,
          comunicaciones: mails.remitenteComunicaciones,
        },
      },
    };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos leer el estado de los servicios." };
  }
}
