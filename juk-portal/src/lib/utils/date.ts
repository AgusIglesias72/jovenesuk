/**
 * Helpers para fechas de calendario (columnas `date` de Drizzle, mode "date").
 *
 * Esas columnas representan un día sin hora; Drizzle las entrega como Date en
 * UTC-midnight. Si las formateás con la zona local (ej. AR = UTC-3) se corren un
 * día. Por eso siempre usamos los componentes UTC para mostrar/parsear.
 */

/** Date -> "YYYY-MM-DD" (para inputs type="date"). */
export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date -> "DD/MM/YYYY" (convención argentina). */
export function formatFecha(d: Date): string {
  const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * Día calendario UTC como timestamp (medianoche UTC de ese día). Es la unidad
 * de comparación de todo lo que vence: comparar Dates crudos marcaba el
 * vencimiento desde las 21:00 ART del día anterior. Vive en utils (y no en
 * domain) para que lo compartan dominio, queries y jobs.
 */
export function diaCalendarioUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Días enteros de diferencia entre dos fechas, por día calendario UTC. */
export function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((diaCalendarioUTC(hasta) - diaCalendarioUTC(desde)) / 86_400_000);
}
