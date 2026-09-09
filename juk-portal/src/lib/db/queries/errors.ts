/**
 * Errores nombrados de la capa de queries (no pertenecen a ningún dominio).
 */

/** Un INSERT/UPDATE con `.returning()` no devolvió fila: anomalía del driver. */
export class FilaNoDevueltaError extends Error {
  constructor(public readonly tabla: string) {
    super(`La operación sobre "${tabla}" no devolvió ninguna fila.`);
    this.name = "FilaNoDevueltaError";
  }
}

/** Primera fila de un `.returning()` que por contrato siempre devuelve una. */
export function unicaFila<T>(rows: readonly T[], tabla: string): T {
  const row = rows[0];
  if (row === undefined) throw new FilaNoDevueltaError(tabla);
  return row;
}

/**
 * Postgres 23505: violación de constraint UNIQUE (código duplicado, DNI
 * repetido, email en uso).
 *
 * Recorre la cadena de `cause` porque drizzle envuelve TODO error del driver en
 * un `DrizzleQueryError` genérico ("Failed query: …"): el `NeonDbError` con el
 * `code` queda un nivel más abajo. Mirar solo el error de arriba devolvía
 * siempre false y el usuario veía el mensaje genérico de "probá de nuevo".
 */
export function esViolacionUnique(err: unknown): boolean {
  for (let actual = err, saltos = 0; actual != null && saltos < 5; saltos++) {
    if (typeof actual !== "object") return false;
    if ((actual as { code?: unknown }).code === "23505") return true;
    actual = (actual as { cause?: unknown }).cause;
  }
  return false;
}
