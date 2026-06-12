/**
 * Validación de pasaporte (ex CRIT-02, regla cerrada por los PRDs jun 2026):
 * - UK: el pasaporte debe estar vigente hasta el FIN del viaje (sin 6 meses extra).
 * - Otros países: debe estar vigente hasta 6 meses DESPUÉS del fin del viaje.
 * - Alerta conservadora del dashboard (aparte): vence dentro de los 6 meses
 *   posteriores al INICIO del viaje → crítica.
 */

type PaisDestino =
  | "reino_unido"
  | "irlanda"
  | "canada"
  | "malta"
  | "australia"
  | "argentina"
  | "otro";

function masSeisMeses(fecha: Date): Date {
  const d = new Date(fecha);
  d.setUTCMonth(d.getUTCMonth() + 6);
  return d;
}

/** ¿El pasaporte cumple el requisito legal para este viaje? */
export function pasaporteVigenteParaViaje(
  vencimientoPasaporte: Date,
  fechaFinViaje: Date,
  paisDestino: PaisDestino = "reino_unido"
): boolean {
  const minimo =
    paisDestino === "reino_unido" ? fechaFinViaje : masSeisMeses(fechaFinViaje);
  return vencimientoPasaporte.getTime() >= minimo.getTime();
}

/**
 * Criterio CONSERVADOR del panel de alertas (M2): pasaporte vencido o que
 * vence dentro de los 6 meses posteriores al inicio del viaje.
 */
export function pasaporteEnAlertaConservadora(
  vencimientoPasaporte: Date,
  fechaInicioViaje: Date
): boolean {
  return vencimientoPasaporte.getTime() < masSeisMeses(fechaInicioViaje).getTime();
}
