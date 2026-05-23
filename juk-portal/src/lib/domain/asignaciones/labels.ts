export const ASIGNACION_ESTADOS = [
  "activa",
  "viajando",
  "finalizada",
  "cancelada",
] as const;

export const ASIGNACION_ESTADO_LABELS: Record<(typeof ASIGNACION_ESTADOS)[number], string> = {
  activa: "Activa",
  viajando: "Viajando",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export const ASIGNACION_ESTADO_TONE: Record<(typeof ASIGNACION_ESTADOS)[number], Tone> = {
  activa: "brand",
  viajando: "warning",
  finalizada: "success",
  cancelada: "neutral",
};
