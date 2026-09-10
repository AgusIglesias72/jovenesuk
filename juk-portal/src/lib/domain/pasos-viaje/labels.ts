import { PASO_VIAJE_TIPOS, type PasoViajeEstado, type PasoViajeTipo } from "./estados";
import type { ExcursionEstado, PasajeSubEstado } from "./metadata";

export const PASO_VIAJE_LABELS: Record<PasoViajeTipo, string> = {
  pasajes: "Pasajes",
  excursiones: "Excursiones",
  transfers: "Transfers",
  tarjeta_transporte: "Tarjetas de transporte",
  police_checks: "Police Checks",
};

export const PASO_VIAJE_ESTADO_LABELS: Record<PasoViajeEstado, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
};

export const PASAJE_SUBESTADO_LABELS: Record<PasajeSubEstado, string> = {
  pendiente_cotizacion: "Pendiente cotización",
  cotizado: "Cotizado",
  confirmado: "Confirmado",
  emitido: "Emitido",
  pendiente_datos: "Pendiente datos",
  datos_recibidos: "Datos recibidos",
};

export const EXCURSION_ESTADO_LABELS: Record<ExcursionEstado, string> = {
  propuesta: "Propuesta",
  aprobada_representante: "Aprobada por representante",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

/** Número de paso (1-5) según el orden canónico del M7. */
export const PASO_VIAJE_NUMERO = Object.fromEntries(
  PASO_VIAJE_TIPOS.map((tipo, i) => [tipo, i + 1])
) as Record<PasoViajeTipo, number>;
