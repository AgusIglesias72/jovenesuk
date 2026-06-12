/**
 * Cálculo PURO de recordatorios automáticos (PRD M6):
 *  - A1 (Application Form): a los 14, 7 y 3 días antes de la fecha límite y
 *    el día anterior (US-20). Al vencer sin completar → estado 'vencido'.
 *  - D1 (autorización ante escribano): 90, 60 y 30 días antes del INICIO del
 *    viaje (US-33), solo para menores.
 * La task de Trigger.dev consume estas funciones; el dedup contra
 * notificaciones_enviadas lo hace la capa de queries.
 */

export const DIAS_RECORDATORIO_A1 = [14, 7, 3, 1] as const;
export const DIAS_RECORDATORIO_D1 = [90, 60, 30] as const;

export type RecordatorioPendiente = {
  tipo: "recordatorio_a1" | "recordatorio_d1";
  /** Ocurrencia para dedup: "14d", "7d", … */
  clave: string;
  diasAntes: number;
};

const MS_DIA = 86_400_000;

/** Días enteros entre hoy y la fecha objetivo (negativo si ya pasó). */
export function diasHasta(fecha: Date, hoy: Date): number {
  const f = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
  const h = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return Math.round((f - h) / MS_DIA);
}

/**
 * Recordatorio de A1 que corresponde HOY para una fecha límite dada.
 * Devuelve null si hoy no es un día de recordatorio o el paso ya no aplica.
 */
export function recordatorioA1DeHoy(
  fechaLimite: Date,
  hoy: Date,
  estadoPaso: string
): RecordatorioPendiente | null {
  if (estadoPaso === "completado" || estadoPaso === "na") return null;
  const dias = diasHasta(fechaLimite, hoy);
  if (!(DIAS_RECORDATORIO_A1 as readonly number[]).includes(dias)) return null;
  return { tipo: "recordatorio_a1", clave: `${dias}d`, diasAntes: dias };
}

/** ¿A1 venció? (pasó la fecha límite sin completar → marcar 'vencido', US-20). */
export function a1Vencido(fechaLimite: Date, hoy: Date, estadoPaso: string): boolean {
  if (estadoPaso === "completado" || estadoPaso === "na" || estadoPaso === "vencido")
    return false;
  return diasHasta(fechaLimite, hoy) < 0;
}

/** Recordatorio de D1 que corresponde HOY según la fecha de inicio del viaje. */
export function recordatorioD1DeHoy(
  fechaInicioViaje: Date,
  hoy: Date,
  estadoPaso: string
): RecordatorioPendiente | null {
  if (estadoPaso === "completado" || estadoPaso === "na") return null;
  const dias = diasHasta(fechaInicioViaje, hoy);
  if (!(DIAS_RECORDATORIO_D1 as readonly number[]).includes(dias)) return null;
  return { tipo: "recordatorio_d1", clave: `${dias}d`, diasAntes: dias };
}
