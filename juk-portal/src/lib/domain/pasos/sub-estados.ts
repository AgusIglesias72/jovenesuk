import type { PasoEstado } from "./estados";

/**
 * Sub-estados de C1 (ETA, US-31) y A3 (Parental Consent, US-29): trackean el
 * trámite con más grano que el estado del paso, que se deriva siempre del
 * sub-estado (nunca se setea a mano para estos pasos).
 */

export const ETA_SUBESTADOS = [
  "pendiente",
  "en_tramite",
  "aprobado",
  "rechazado",
] as const;

export type EtaSubEstado = (typeof ETA_SUBESTADOS)[number];

export const ETA_SUBESTADO_LABELS: Record<EtaSubEstado, string> = {
  pendiente: "Pendiente",
  en_tramite: "En trámite",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export function estadoPasoDesdeEta(subEstado: EtaSubEstado): PasoEstado {
  switch (subEstado) {
    case "pendiente":
      return "pendiente";
    case "en_tramite":
      return "en_progreso";
    case "aprobado":
      return "completado";
    case "rechazado":
      return "bloqueado";
  }
}

export const PC_SUBESTADOS = ["enviado", "firmado", "recibido"] as const;

export type PcSubEstado = (typeof PC_SUBESTADOS)[number];

export const PC_SUBESTADO_LABELS: Record<PcSubEstado, string> = {
  enviado: "Enviado",
  firmado: "Firmado",
  recibido: "Recibido",
};

export function estadoPasoDesdePc(subEstado: PcSubEstado): PasoEstado {
  return subEstado === "recibido" ? "completado" : "en_progreso";
}
