/**
 * Login con Google, acotado a vinculación.
 *
 * POR QUÉ existe este módulo y no dos `process.env` sueltos: en JUK, Google
 * NO da de alta. Es una forma alternativa de entrar a una cuenta que el equipo
 * ya creó (desde /usuarios o desde el alta de familias). Quien hace cumplir esa
 * regla es `disableSignUp: true` en el provider (`./index.ts`); acá vive lo que
 * necesita el resto de la app: si el botón se muestra o no, y qué se le dice a
 * la persona cuando el callback de OAuth vuelve con un error.
 *
 * Gate condicional: sin las dos variables el provider no se registra, el botón
 * no se muestra y el login por email sigue funcionando igual. Es el estado
 * normal en local y en los E2E.
 *
 * Módulo puro (sin next, react ni db) para poder testearlo, mismo molde que
 * `sign-up-policy.ts` y que `storageConfigurado()` de `@/lib/storage`.
 */

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

/** Las dos credenciales o nada: media configuración rompería el callback. */
export function googleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function googleOAuthHabilitado(): boolean {
  return googleOAuthConfig() !== null;
}

export type MensajeOAuth = {
  titulo: string;
  detalle: string;
};

/**
 * Cualquier código que no reconocemos cae acá. Nunca `null` con un código
 * presente: un error que no se muestra es un usuario mirando un login vacío sin
 * entender por qué no entró.
 */
const GENERICO: MensajeOAuth = {
  titulo: "No se pudo ingresar con Google",
  detalle: "Probá de nuevo, o entrá con tu email y contraseña.",
};

/**
 * Los códigos salen del callback de Better-Auth (`?error=…`), salvo
 * `cuenta_desactivada`, que es el `code` de nuestro APIError del hook de sesión.
 */
const MENSAJES: Record<string, MensajeOAuth> = {
  signup_disabled: {
    titulo: "Ese Google no está habilitado",
    detalle:
      "No tenemos ninguna cuenta con ese email. Entrá con el email y la contraseña que te enviamos, o escribinos a Jóvenes en UK.",
  },
  account_not_linked: {
    titulo: "No pudimos vincular tu Google",
    detalle:
      "Verificá tu email en Google e intentá de nuevo, o entrá con tu email y contraseña.",
  },
  cuenta_desactivada: {
    titulo: "Cuenta desactivada",
    detalle:
      "Tu acceso está dado de baja. Escribinos a Jóvenes en UK para que la reactivemos.",
  },
  access_denied: {
    titulo: "Cancelaste el ingreso con Google",
    detalle: "No pasó nada: podés volver a intentarlo o entrar con tu email y contraseña.",
  },
};

/** El copy del `?error=` del login. Sin código no hay nada que mostrar. */
export function mensajeErrorOAuth(code: string | undefined | null): MensajeOAuth | null {
  const limpio = code?.trim().toLowerCase();
  if (!limpio) return null;
  return MENSAJES[limpio] ?? GENERICO;
}
