import type { TipoEmail } from "@/lib/domain/configuracion";

/** Templates disponibles para el envío de prueba desde /configuracion. */
export const MAIL_TEMPLATES = [
  { key: "welcome", label: "Acceso al portal (credenciales)", tipo: "comunicacion" },
  { key: "reset-password", label: "Restablecer contraseña", tipo: "automatico" },
  { key: "password-changed", label: "Contraseña cambiada", tipo: "automatico" },
  { key: "recordatorio", label: "Recordatorio a la familia (A1/D1)", tipo: "automatico" },
  { key: "viaje-cancelado", label: "Viaje cancelado", tipo: "comunicacion" },
] as const satisfies readonly { key: string; label: string; tipo: TipoEmail }[];

export type MailTemplateKey = (typeof MAIL_TEMPLATES)[number]["key"];
