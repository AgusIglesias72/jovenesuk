import { createHash, randomBytes } from "node:crypto";

/** 32 bytes = 256 bits de entropía, el piso para un secreto que viaja en una URL pública. */
const BYTES_TOKEN = 32;

/**
 * Secreto opaco para los links tokenizados (invitación al formulario de inscripción).
 * Vive en `utils` y no en `src/lib/domain/` a propósito: el dominio es puro y no puede
 * importar `node:crypto`.
 *
 * base64url porque el token va en la URL del mail: sin `+`, `/` ni `=`, ningún cliente
 * de correo ni redirect lo re-encodea y lo rompe.
 */
export function generarTokenOpaco(): string {
  return randomBytes(BYTES_TOKEN).toString("base64url");
}

/**
 * Lo que se guarda en la base es SOLO esto, nunca el token en claro: con un dump de la
 * tabla nadie puede abrir una invitación ajena (el token en claro existe una sola vez,
 * en el mail que se envía).
 *
 * El precedente del repo es el contrario: `prospectos.unsubscribeToken` se guarda en
 * claro y no caduca, así que quien lea esa tabla puede dar de baja a cualquiera. Los
 * links de inscripción llevan a un formulario con datos de Nivel 2 (DNI, pasaporte,
 * salud), así que acá no repetimos ese patrón.
 *
 * No reusa `hashTexto` de `./hash-texto`: ese normaliza CRLF y recorta los bordes para
 * que el mismo copy de una política hashee igual venga de donde venga. Un token es una
 * credencial de comparación exacta — normalizarlo haría que `"abc "` abriera la
 * invitación `"abc"`, y sha256 sobre un alfabeto base64url no necesita normalización.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
