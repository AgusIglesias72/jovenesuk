import { timingSafeEqual } from "node:crypto";

/**
 * Comparación de secretos compartidos de webhooks (Google Form).
 *
 * El endpoint es la puerta de entrada a datos de menores: la comparación tiene
 * que ser de tiempo constante (`!==` filtra el prefijo correcto por timing) y
 * el secreto tiene que ser lo bastante largo como para no ser fuerza-bruteable.
 */

export const LARGO_MINIMO_SECRETO = 32;

/** Un secreto usable: presente y de al menos 32 caracteres. */
export function secretoUsable(secreto: string | undefined | null): secreto is string {
  return typeof secreto === "string" && secreto.length >= LARGO_MINIMO_SECRETO;
}

/**
 * Compara en tiempo constante. El chequeo de longitud va primero porque
 * `timingSafeEqual` lanza con buffers de distinto tamaño (y la longitud del
 * secreto no es información sensible frente a un atacante que ya la mide).
 */
export function coincideSecreto(recibido: string | null | undefined, esperado: string): boolean {
  if (typeof recibido !== "string" || recibido.length === 0) return false;

  const a = Buffer.from(recibido, "utf8");
  const b = Buffer.from(esperado, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
