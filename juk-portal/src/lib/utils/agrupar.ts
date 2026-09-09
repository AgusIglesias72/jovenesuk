/**
 * Agrupa filas por una clave, preservando el orden en que vinieron de la DB.
 *
 * Sirve para reemplazar N queries por asignación (un round-trip HTTPS cada una
 * con neon-http) por una sola con `inArray` + agrupación en memoria.
 */
export function agruparPor<T, K>(filas: readonly T[], clave: (fila: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const fila of filas) {
    const k = clave(fila);
    const actual = mapa.get(k);
    if (actual) actual.push(fila);
    else mapa.set(k, [fila]);
  }
  return mapa;
}
