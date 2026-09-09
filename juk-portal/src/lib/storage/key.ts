/**
 * Keys de storage: alfabeto acotado y sin segmentos relativos. El proxy
 * /api/uploads recibe la key desde la URL, así que una key con ".." o con "\"
 * saldría del directorio local en dev y del prefijo esperado en R2.
 */

const KEY_VALIDA = /^[A-Za-z0-9._\-/]+$/;
const MAX_KEY_CHARS = 512;

export function keyEsSegura(key: string): boolean {
  if (!key || key.length > MAX_KEY_CHARS) return false;
  if (!KEY_VALIDA.test(key)) return false;
  return key.split("/").every((seg) => seg !== "" && seg !== "." && seg !== "..");
}

/** Último segmento de la key, para usar como nombre de archivo por defecto. */
export function nombreDesdeKey(key: string): string {
  return key.split("/").pop() || "documento";
}
