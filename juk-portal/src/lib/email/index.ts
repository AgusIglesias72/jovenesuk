import { Resend } from "resend";

import { getMailSettings } from "@/lib/db/queries/configuracion";
import { remitenteDe, type TipoEmail } from "@/lib/domain/configuracion";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a transactional email.
 * `react` should be a React Email component from lib/email/templates/.
 *
 * El remitente se resuelve desde la configuración del portal (MIN-09):
 * - tipo "automatico"   → noreply@ (recordatorios, reset, avisos sin respuesta)
 * - tipo "comunicacion" → info@ (credenciales, cancelaciones — respuesta esperada)
 * - tipo "marketing"    → hola@mkt.* (outreach comercial en frío)
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  tipo?: TipoEmail;
  replyTo?: string;
  headers?: Record<string, string>;
}) {
  const settings = await getMailSettings();
  const { data, error } = await resend.emails.send({
    from: remitenteDe(settings, opts.tipo ?? "comunicacion"),
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    react: opts.react,
    replyTo: opts.replyTo ?? settings.replyTo,
    headers: opts.headers,
  });

  if (error) {
    console.error("[email] send failed", error);
    throw new Error(`Resend error: ${error.message}`);
  }

  return data;
}
