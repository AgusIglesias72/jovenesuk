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

const DIA_EN_ARGENTINA = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Un INSTANTE (no una columna `date`) -> "DD/MM/YYYY" del día que es en
 * Argentina. `formatFecha` sirve para días de calendario guardados a medianoche
 * UTC; aplicado a un instante, desde las 21:00 ART anuncia el día siguiente. Es
 * lo que pasaba con el vencimiento de una invitación mandada de noche: el mail
 * decía un día después del que el link dejaba de abrir.
 *
 * Por partes y no con `format()`: el separador y el relleno de `es-AR` dependen
 * de la versión de ICU, y el texto tiene que ser el mismo que el de `formatFecha`.
 */
export function formatFechaArgentina(instante: Date): string {
  const partes = DIA_EN_ARGENTINA.formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value.padStart(tipo === "year" ? 4 : 2, "0") ?? "";
  return `${valor("day")}/${valor("month")}/${valor("year")}`;
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
