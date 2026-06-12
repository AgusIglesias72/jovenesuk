export const PASO_VIAJE_TIPOS = [
  "pasajes",
  "excursiones",
  "transfers",
  "tarjeta_transporte",
  "police_checks",
] as const;

export type PasoViajeTipo = (typeof PASO_VIAJE_TIPOS)[number];

export const PASO_VIAJE_ESTADOS = [
  "pendiente",
  "en_progreso",
  "completado",
  "bloqueado",
] as const;

export type PasoViajeEstado = (typeof PASO_VIAJE_ESTADOS)[number];

/**
 * Dependencias entre pasos del viaje. Un paso con dependencia no puede avanzar a
 * "en_progreso" o "completado" hasta que su requisito esté "completado".
 * PRD M7 §7.4: Transfers depende de Pasajes confirmados.
 */
export const PASO_VIAJE_DEPENDENCIAS: Partial<Record<PasoViajeTipo, PasoViajeTipo>> = {
  transfers: "pasajes",
};

/**
 * police_checks no se edita a mano: su estado se deriva de los Group Leaders
 * asignados al viaje (ver `derivarEstadoPoliceChecks`).
 */
export const PASO_VIAJE_DERIVADOS: readonly PasoViajeTipo[] = ["police_checks"];

export function esPasoDerivado(tipo: PasoViajeTipo): boolean {
  return PASO_VIAJE_DERIVADOS.includes(tipo);
}

const TRANSICIONES: Record<PasoViajeEstado, PasoViajeEstado[]> = {
  pendiente: ["en_progreso", "completado", "bloqueado"],
  en_progreso: ["completado", "bloqueado", "pendiente"],
  completado: ["en_progreso", "pendiente"],
  bloqueado: ["pendiente", "en_progreso"],
};

export function puedeTransicionarPaso(actual: PasoViajeEstado, nuevo: PasoViajeEstado): boolean {
  if (actual === nuevo) return true;
  return TRANSICIONES[actual].includes(nuevo);
}

/** El estado actual + las transiciones válidas desde él (para poblar un selector). */
export function transicionesPasoPermitidas(actual: PasoViajeEstado): PasoViajeEstado[] {
  return [actual, ...TRANSICIONES[actual]];
}
