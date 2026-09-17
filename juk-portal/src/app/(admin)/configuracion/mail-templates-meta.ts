import type { TipoEmail } from "@/lib/domain/configuracion";

/** Templates disponibles para el envío de prueba desde /configuracion. */
export const MAIL_TEMPLATES = [
  { key: "welcome", label: "Acceso al portal (credenciales)", tipo: "comunicacion" },
  { key: "reset-password", label: "Restablecer contraseña", tipo: "automatico" },
  { key: "password-changed", label: "Contraseña cambiada", tipo: "automatico" },
  { key: "recordatorio", label: "Recordatorio a la familia (A1/D1)", tipo: "automatico" },
  { key: "viaje-cancelado", label: "Viaje cancelado", tipo: "comunicacion" },
  { key: "inscripcion-recibida", label: "Acuse del Application Form (familia)", tipo: "comunicacion" },
  { key: "inscripcion-nueva-equipo", label: "Inscripción nueva (aviso al equipo)", tipo: "automatico" },
  {
    key: "invitacion-inscripcion",
    label: "Invitación al Application Form (link)",
    // Sale desde info@ y no desde mkt.*: es el trámite que la familia espera, y
    // el remitente de marketing todavía no tiene DNS.
    tipo: "comunicacion",
  },
  { key: "outreach-colegio", label: "Outreach a colegio", tipo: "marketing" },
] as const satisfies readonly { key: string; label: string; tipo: TipoEmail }[];

export type MailTemplateKey = (typeof MAIL_TEMPLATES)[number]["key"];
