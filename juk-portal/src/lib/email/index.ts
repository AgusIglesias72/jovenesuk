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

export type EmailRegistrado = {
  to: string[];
  subject: string;
  tipo: TipoEmail;
  enviadoEl: Date;
};

const registroDryRun: EmailRegistrado[] = [];

/** Emails que el modo dry-run "envió" (E2E, seeds y desarrollo sin Resend). */
export function emailsDryRun(): readonly EmailRegistrado[] {
  return registroDryRun;
}

export function limpiarEmailsDryRun(): void {
  registroDryRun.length = 0;
}

let faltaKeyLogueado = false;

/**
 * Dry-run explícito con EMAIL_DRY_RUN=1, o implícito fuera de producción
 * cuando no hay RESEND_API_KEY: importar este módulo nunca puede romper el
 * build ni un test (antes lanzaba al importar). En producción sin key el
 * envío falla ruidosamente, que es lo que corresponde.
 */
function enDryRun(): boolean {
  if (process.env.EMAIL_DRY_RUN === "1") return true;
  if (process.env.RESEND_API_KEY) return false;
  return process.env.NODE_ENV !== "production";
}

let cliente: Resend | null = null;

function clienteResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (!faltaKeyLogueado) {
      faltaKeyLogueado = true;
      console.error("[email] RESEND_API_KEY no está definida: no se puede enviar.");
    }
    throw new EmailConfigError("RESEND_API_KEY");
  }
  cliente ??= new Resend(key);
  return cliente;
}

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
}): Promise<{ id: string } | null> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const tipo = opts.tipo ?? "comunicacion";

  if (enDryRun()) {
    registroDryRun.push({ to, subject: opts.subject, tipo, enviadoEl: new Date() });
    return { id: `dry-run-${registroDryRun.length}` };
  }

  const settings = await getMailSettings();
  const { data, error } = await clienteResend().emails.send({
    from: remitenteDe(settings, tipo),
    to,
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
