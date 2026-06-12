import { VIAJE_ESTADOS } from "./schema";

export type EstadoViaje = (typeof VIAJE_ESTADOS)[number];

/**
 * Máquina de estados del ciclo de vida de un viaje.
 *
 * Flujo normal: inscripcion_abierta → confirmado → en_curso → finalizado.
 * "cancelado" es accesible desde cualquier estado previo al fin del viaje (no
 * desde finalizado), y es terminal: un viaje cancelado no se reactiva.
 * "finalizado" también es terminal.
 */
export const TRANSICIONES_VIAJE: Record<EstadoViaje, readonly EstadoViaje[]> = {
  inscripcion_abierta: ["confirmado", "cancelado"],
  confirmado: ["inscripcion_abierta", "en_curso", "cancelado"],
  en_curso: ["finalizado", "cancelado"],
  finalizado: [],
  cancelado: [],
} as const;

/** Estados a los que se puede pasar desde `estadoActual` (excluye el actual). */
export function transicionesPermitidas(
  estadoActual: EstadoViaje
): readonly EstadoViaje[] {
  return TRANSICIONES_VIAJE[estadoActual];
}

/** ¿Es válido pasar de `estadoActual` a `estadoNuevo`? Quedarse igual es válido. */
export function puedeTransicionar(
  estadoActual: EstadoViaje,
  estadoNuevo: EstadoViaje
): boolean {
  if (estadoActual === estadoNuevo) return true;
  return TRANSICIONES_VIAJE[estadoActual].includes(estadoNuevo);
}

/**
 * Opciones de estado que ofrecer en un selector para editar un viaje:
 * el estado actual más las transiciones válidas desde él.
 */
export function opcionesEstado(
  estadoActual: EstadoViaje
): readonly EstadoViaje[] {
  return [estadoActual, ...TRANSICIONES_VIAJE[estadoActual]];
}

/**
 * Transición automática por fecha (US-13): Confirmado → En curso cuando llega
 * la fecha de inicio; En curso → Finalizado cuando pasó la fecha de fin.
 * Comparación por día calendario UTC (las fechas del viaje son `date`).
 */
export function transicionAutomaticaPorFecha(
  estado: EstadoViaje,
  fechaInicio: Date,
  fechaFin: Date,
  hoy: Date
): EstadoViaje | null {
  const dia = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (estado === "confirmado" && dia(hoy) >= dia(fechaInicio)) return "en_curso";
  if (estado === "en_curso" && dia(hoy) > dia(fechaFin)) return "finalizado";
  return null;
}
