import { createHash } from "node:crypto";

/**
 * Sella QUÉ texto aceptó una persona (política de privacidad, consentimiento parental):
 * guardamos el hash junto al consentimiento para poder demostrar, años después, contra
 * qué versión exacta del copy se prestó. Normaliza saltos de línea y bordes porque el
 * mismo texto viaja con CRLF o LF según de dónde se copie, y un hash distinto por un
 * salto de línea invisible haría ilegible la evidencia.
 */
export function hashTexto(texto: string): string {
  const normalizado = texto.replace(/\r\n/g, "\n").trim();
  return createHash("sha256").update(normalizado, "utf8").digest("hex");
}
