import { z } from "zod";

/**
 * Settings de mails del portal (MIN-09, resuelto operativamente 12/06/2026):
 * los automáticos (recordatorios, reset) salen desde noreply@; las
 * comunicaciones con respuesta esperada (credenciales, cancelaciones) desde
 * info@. Ambos remitentes son configurables desde /configuracion.
 */

export const mailSettingsSchema = z.object({
  nombreRemitente: z
    .string()
    .trim()
    .min(1, "El nombre del remitente es requerido.")
    .max(80, "Máximo 80 caracteres."),
  remitenteAutomaticos: z.string().trim().email("Email inválido."),
  remitenteComunicaciones: z.string().trim().email("Email inválido."),
  replyTo: z.string().trim().email("Email inválido."),
});

export type MailSettings = z.infer<typeof mailSettingsSchema>;

export const MAIL_SETTINGS_DEFAULT: MailSettings = {
  nombreRemitente: "Jóvenes en UK",
  remitenteAutomaticos: "noreply@jovenesenuk.com",
  remitenteComunicaciones: "info@jovenesenuk.com",
  replyTo: "info@jovenesenuk.com",
};

/**
 * - automatico: sin respuesta esperada (recordatorios, reset de password).
 * - comunicacion: puede generar respuesta (credenciales, cancelaciones).
 */
export type TipoEmail = "automatico" | "comunicacion";

export function remitenteDe(settings: MailSettings, tipo: TipoEmail): string {
  const direccion =
    tipo === "automatico" ? settings.remitenteAutomaticos : settings.remitenteComunicaciones;
  return `${settings.nombreRemitente} <${direccion}>`;
}
