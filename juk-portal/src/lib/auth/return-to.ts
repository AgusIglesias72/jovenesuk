/**
 * Saneo del `returnTo` del login. Módulo PURO (sin imports de next, react ni
 * db) para poder testearlo y reusarlo tanto en el server component como en el
 * form.
 *
 * El proxy escribe `?returnTo=<path>` cuando rebota una ruta protegida, pero
 * el parámetro llega por URL: un link de phishing puede poner cualquier cosa y
 * llevarse al usuario a otro dominio DESPUÉS de que ingresó credenciales
 * válidas. Por eso solo aceptamos paths relativos que además caigan dentro del
 * portal (PORTAL_PREFIXES); todo lo demás va al dashboard.
 */

import { PORTAL_PREFIXES } from "@/lib/routes";

export const RETURN_TO_POR_DEFECTO = "/dashboard";

/** Base sintética: sirve para detectar cualquier cambio de origen. */
const BASE = "http://returnto.invalid";

/** Un path del portal siempre arranca con "/" + letra o dígito. */
const ARRANQUE_VALIDO = /^\/[A-Za-z0-9]/;

/** Un CR/LF crudo puede partir headers aguas abajo. */
function tieneCaracteresDeControl(valor: string): boolean {
  for (let i = 0; i < valor.length; i++) {
    const codigo = valor.charCodeAt(i);
    if (codigo < 0x20 || codigo === 0x7f) return true;
  }
  return false;
}

function esPathDelPortal(pathname: string): boolean {
  return PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) return RETURN_TO_POR_DEFECTO;

  // "\" lo normalizan como "/" varios navegadores: "/\evil.com" termina siendo
  // un protocol-relative URL. No hay path legítimo nuestro con backslash.
  if (raw.includes("\\") || tieneCaracteresDeControl(raw)) return RETURN_TO_POR_DEFECTO;
  if (!ARRANQUE_VALIDO.test(raw)) return RETURN_TO_POR_DEFECTO;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return RETURN_TO_POR_DEFECTO;
  }

  if (url.origin !== BASE) return RETURN_TO_POR_DEFECTO;
  if (!esPathDelPortal(url.pathname)) return RETURN_TO_POR_DEFECTO;

  return url.pathname + url.search;
}
