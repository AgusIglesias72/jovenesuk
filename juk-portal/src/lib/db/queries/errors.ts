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

/** Postgres 23505: violación de constraint UNIQUE (código duplicado, email en uso, etc.). */
export function esViolacionUnique(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}
