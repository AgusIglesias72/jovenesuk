import { POLICE_CHECK_ESTADOS } from "./schema";

export const POLICE_CHECK_ESTADO_LABELS: Record<(typeof POLICE_CHECK_ESTADOS)[number], string> = {
  pendiente: "Pendiente",
  en_tramite: "En trámite",
  aprobado: "Aprobado",
  vencido: "Vencido",
};

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export const POLICE_CHECK_TONE: Record<(typeof POLICE_CHECK_ESTADOS)[number], Tone> = {
  pendiente: "neutral",
  en_tramite: "info",
  aprobado: "success",
  vencido: "danger",
};
