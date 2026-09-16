import { PROSPECTO_ESTADOS, type ProspectoEstado } from "./pipeline";

/** Labels y tonos de Badge en español rioplatense para los enums del CRM. */

type BadgeTone = "neutral" | "info" | "brand" | "warning" | "success" | "danger";

export const PROSPECTO_ESTADO_LABELS: Record<ProspectoEstado, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  interesado: "Interesado",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const PROSPECTO_ESTADO_TONE: Record<ProspectoEstado, BadgeTone> = {
  nuevo: "neutral",
  contactado: "info",
  interesado: "brand",
  propuesta: "warning",
  negociacion: "warning",
  ganado: "success",
  perdido: "danger",
};

export const TIPO_COMUNICACION_LABELS = {
  email: "Email",
  nota: "Nota",
  llamada: "Llamada",
  reunion: "Reunión",
  cambio_estado: "Cambio de estado",
  conversion: "Conversión",
} as const;

export const COMUNICACION_ESTADO_LABELS = {
  pendiente: "Pendiente",
  enviando: "Enviando",
  enviado: "Enviado",
  entregado: "Entregado",
  abierto: "Abierto",
  click: "Click",
  rebotado: "Rebotado",
  spam: "Spam",
  fallido: "Fallido",
} as const;

export const ESTADOS_PROSPECTO_ORDENADOS = PROSPECTO_ESTADOS;
