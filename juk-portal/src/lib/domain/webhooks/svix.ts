import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verificación de firmas Svix (las usa Resend para sus webhooks) sin sumar la
 * dependencia `svix`: HMAC-SHA256 sobre `id.timestamp.body` crudo, con clave =
 * base64 decodificado del secret "whsec_<base64>".
 */

/**
 * Sin ventana de tiempo, un evento capturado con firma válida se puede
 * reenviar para siempre. Svix usa ±5 minutos y en cada reintento vuelve a
 * firmar con un timestamp nuevo, así que la ventana no rompe los reintentos.
 */
export const TOLERANCIA_TIMESTAMP_SEGUNDOS = 5 * 60;

const PREFIJO_SECRET = "whsec_";
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const TIMESTAMP = /^\d+$/;

/**
 * Un secret vacío o que no es base64 decodifica a una clave vacía o basura:
 * con clave vacía cualquiera puede calcular una firma "válida", así que se
 * rechaza en vez de verificar con eso.
 */
function claveDelSecret(secret: string): Buffer | null {
  const base64 = secret.startsWith(PREFIJO_SECRET) ? secret.slice(PREFIJO_SECRET.length) : secret;
  if (!BASE64.test(base64)) return null;
  const clave = Buffer.from(base64, "base64");
  return clave.length > 0 ? clave : null;
}

function timestampVigente(svixTimestamp: string, ahora: Date): boolean {
  if (!TIMESTAMP.test(svixTimestamp)) return false;
  const desfase = Math.floor(ahora.getTime() / 1000) - Number(svixTimestamp);
  return Math.abs(desfase) <= TOLERANCIA_TIMESTAMP_SEGUNDOS;
}

export function verificarFirma(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  rawBody: string,
  signatureHeader: string,
  ahora: Date = new Date()
): boolean {
  const clave = claveDelSecret(secret);
  if (!clave || !timestampVigente(svixTimestamp, ahora)) return false;

  const esperado = createHmac("sha256", clave)
    .update(`${svixId}.${svixTimestamp}.${rawBody}`)
    .digest();

  // Lista separada por espacios de "v1,<firma>": durante una rotación de secret
  // llegan varias y alcanza con que una matchee. Otras versiones (v1a = ed25519)
  // no son HMAC y se ignoran.
  for (const parte of signatureHeader.split(" ")) {
    const [version, firmaBase64] = parte.split(",", 2);
    if (version !== "v1" || !firmaBase64) continue;
    const firma = Buffer.from(firmaBase64, "base64");
    if (firma.length === esperado.length && timingSafeEqual(firma, esperado)) {
      return true;
    }
  }
  return false;
}
