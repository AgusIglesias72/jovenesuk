/**
 * Validación de pasaporte para asignar un alumno a un viaje.
 *
 * CRIT-02 (OPEN_DECISIONS.md): la regla legal de UK es que el pasaporte esté
 * vigente hasta el fin del viaje (`vto >= fechaFin`). María podría querer una
 * política más conservadora (6 meses extra). Hasta cerrar la decisión, dejamos
 * la regla legal por defecto y la variante estricta detrás de un flag que se
 * cambia con una línea.
 */
export const STRICT_UK_RULE = false;

export function pasaporteVigenteParaViaje(
  vencimientoPasaporte: Date,
  fechaFinViaje: Date,
  strict: boolean = STRICT_UK_RULE
): boolean {
  if (!strict) {
    return vencimientoPasaporte.getTime() >= fechaFinViaje.getTime();
  }
  const minimo = new Date(fechaFinViaje);
  minimo.setUTCMonth(minimo.getUTCMonth() + 6);
  return vencimientoPasaporte.getTime() >= minimo.getTime();
}
