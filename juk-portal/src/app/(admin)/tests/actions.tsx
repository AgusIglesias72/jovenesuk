"use server";

import { requireRole } from "@/lib/auth/helpers";
import { getMailSettings } from "@/lib/db/queries/configuracion";
import { renderTemplatePruebaHTML } from "@/lib/email/preview";

export type EstadoServicios = {
  nodeEnv: string;
  dbHost: string;
  servicios: { nombre: string; ok: boolean; detalle: string }[];
  mails: { nombreRemitente: string; automaticos: string; comunicaciones: string };
};

function hayEnv(...claves: string[]): boolean {
  return claves.every((c) => {
    const v = process.env[c];
    return typeof v === "string" && v.trim().length > 0;
  });
}

/** Estado de los servicios externos (qué está configurado y qué falta). */
export async function getEstadoServicios(): Promise<EstadoServicios> {
  await requireRole("super_admin");

  const dbUrl = process.env.DATABASE_URL ?? "";
  let dbHost = "—";
  try {
    dbHost = dbUrl ? new URL(dbUrl).host : "—";
  } catch {
    dbHost = "(no parseable)";
  }

  const mails = await getMailSettings();

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    dbHost,
    servicios: [
      {
        nombre: "Base de datos (Neon)",
        ok: dbUrl.length > 0,
        detalle: dbHost,
      },
      {
        nombre: "Resend (emails)",
        ok: hayEnv("RESEND_API_KEY"),
        detalle: hayEnv("RESEND_API_KEY") ? "API key presente" : "falta RESEND_API_KEY",
      },
      {
        nombre: "Cloudflare R2 (archivos)",
        ok: hayEnv("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"),
        detalle: hayEnv("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME")
          ? "credenciales presentes"
          : "faltan credenciales R2 (usa fallback a disco en dev)",
      },
      {
        nombre: "Webhook Google Form",
        ok: hayEnv("GOOGLE_FORM_WEBHOOK_SECRET"),
        detalle: hayEnv("GOOGLE_FORM_WEBHOOK_SECRET") ? "secret presente" : "falta GOOGLE_FORM_WEBHOOK_SECRET",
      },
      {
        nombre: "Trigger.dev (jobs)",
        ok: hayEnv("TRIGGER_SECRET_KEY"),
        detalle: hayEnv("TRIGGER_SECRET_KEY") ? "conectado" : "no conectado (los jobs no corren solos)",
      },
    ],
    mails: {
      nombreRemitente: mails.nombreRemitente,
      automaticos: mails.remitenteAutomaticos,
      comunicaciones: mails.remitenteComunicaciones,
    },
  };
}

/** Renderiza un template de email a HTML para previsualizarlo (sin enviarlo). */
export async function previewTemplateAction(
  key: string
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  await requireRole("super_admin");
  try {
    const html = await renderTemplatePruebaHTML(key, "ejemplo@jovenesenuk.com");
    return { ok: true, html };
  } catch {
    return { ok: false, error: "No pudimos renderizar el template." };
  }
}
