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
