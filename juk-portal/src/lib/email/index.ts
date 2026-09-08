import { Resend } from "resend";

import { getMailSettings } from "@/lib/db/queries/configuracion";
import { remitenteDe, type TipoEmail } from "@/lib/domain/configuracion";

export class EmailConfigError extends Error {
  constructor(variable: string) {
    super(`${variable} no está definida.`);
    this.name = "EmailConfigError";
  }
}

/** Resend rechazó el envío (dominio sin verificar, API key inválida, etc.). */
export class EmailEnvioError extends Error {
  constructor(public readonly detalle: string) {
    super(`Resend error: ${detalle}`);
    this.name = "EmailEnvioError";
  }
}

if (!process.env.RESEND_API_KEY) {
  throw new EmailConfigError("RESEND_API_KEY");
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
    throw new EmailEnvioError(error.message);
  }

  return data;
}
