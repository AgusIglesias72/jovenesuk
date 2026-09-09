import type { EstadoViaje, ViajeTipo } from "@/lib/domain/viajes";

/**
 * Reglas puras del trigger de asignación (PRD §6.2) que antes vivían inline en
 * la query: la fecha límite por defecto de A1 y la auto-confirmación del viaje.
 */

/** US-13: un viaje Grupal se confirma solo al llegar a este número de inscriptos. */
export const INSCRIPTOS_PARA_AUTOCONFIRMAR = 5;

/** Días de margen del default de la fecha límite de A1 respecto del inicio del viaje. */
const DIAS_MARGEN_A1 = 30;

/**
 * Default de la fecha límite de A1 (US-20): 30 días antes del inicio del viaje
 * (principio operativo "todo resuelto con margen"); editable por alumno.
 */
export function fechaLimiteA1Default(fechaInicioViaje: Date): Date {
  const fecha = new Date(fechaInicioViaje);
  fecha.setUTCDate(fecha.getUTCDate() - DIAS_MARGEN_A1);
  return fecha;
}

/**
 * Confirmado AUTOMÁTICO al 5to inscripto, solo Grupales (US-13).
 * `activasTrasAsignar` incluye la asignación que se está creando.
 */
export function debeAutoConfirmar(
  tipo: ViajeTipo,
  estado: EstadoViaje,
  activasTrasAsignar: number
): boolean {
  return (
    tipo === "grupal" &&
    estado === "inscripcion_abierta" &&
    activasTrasAsignar >= INSCRIPTOS_PARA_AUTOCONFIRMAR
  );
}
