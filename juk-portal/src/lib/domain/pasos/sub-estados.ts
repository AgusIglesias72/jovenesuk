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

/**
 * Lo que la familia puede reportar por sí misma sobre el ETA (US-1.5): el
 * rechazo NO va en esta lista porque se reporta por "Tuve un problema con el
 * ETA" (US-1.6), que además pide el tipo de problema.
 */
export const ETA_SUBESTADOS_FAMILIA = ["pendiente", "en_tramite", "aprobado"] as const satisfies readonly EtaSubEstado[];

export type EtaSubEstadoFamilia = (typeof ETA_SUBESTADOS_FAMILIA)[number];

/** Cómo lo dice la familia (primera persona, sin el "En trámite" del back-office). */
export const ETA_SUBESTADO_LABELS_FAMILIA: Record<EtaSubEstadoFamilia, string> = {
  pendiente: "Todavía no lo pedí",
  en_tramite: "Ya lo pedí, está en trámite",
  aprobado: "Ya me lo aprobaron",
};

export function esEtaSubEstadoFamilia(valor: unknown): valor is EtaSubEstadoFamilia {
  return typeof valor === "string" && (ETA_SUBESTADOS_FAMILIA as readonly string[]).includes(valor);
}

/** Tipos de problema del ETA que puede reportar la familia (US-1.6.3). */
export const ETA_PROBLEMAS = ["rechazo_gobierno", "error_datos", "problema_app"] as const;

export type EtaProblema = (typeof ETA_PROBLEMAS)[number];

export const ETA_PROBLEMA_LABELS: Record<EtaProblema, string> = {
  rechazo_gobierno: "El gobierno del Reino Unido lo rechazó",
  error_datos: "Me equivoqué en algún dato",
  problema_app: "La app oficial no anda o se traba",
};

/** Sitio oficial del gobierno británico para pedir el ETA (US-1.5.2). */
export const ETA_URL_OFICIAL = "https://www.gov.uk/eta";

export const PC_SUBESTADOS = ["pendiente", "enviado", "firmado", "recibido"] as const;

export type PcSubEstado = (typeof PC_SUBESTADOS)[number];

export const PC_SUBESTADO_LABELS: Record<PcSubEstado, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  firmado: "Firmado",
  recibido: "Recibido",
};

export function estadoPasoDesdePc(subEstado: PcSubEstado): PasoEstado {
  switch (subEstado) {
    case "pendiente":
      return "pendiente";
    case "enviado":
    case "firmado":
      return "en_progreso";
    case "recibido":
      return "completado";
  }
}
