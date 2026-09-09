/**
 * Política de alta de cuentas.
 *
 * En JUK no existe el registro público: los admins se crean desde /usuarios y
 * las cuentas de familia las crea el back-office al vincular al tutor. Pero
 * Better-Auth necesita el endpoint de sign-up internamente (seed, seed-demo,
 * alta de familias, alta de usuarios), así que no se puede apagar con
 * `disableSignUp`.
 *
 * La distinción es el transporte: `auth.api.signUpEmail({ body })` llamado
 * desde el server NO trae `request` en el contexto; el handler HTTP
 * (`toNextJsHandler`) siempre lo trae. Módulo puro para poder testearlo.
 */

/** Paths de registro que expone Better-Auth por HTTP (sin plugins sociales). */
export const SIGN_UP_PATHS = ["/sign-up/email"] as const;

const SIGN_UP_PREFIX = "/sign-up";

/**
 * ¿Hay que responder 404 a este request de Better-Auth?
 *
 * @param path path interno del endpoint (`ctx.path`, sin el basePath `/api/auth`)
 * @param llegaPorHttp true si el contexto trae `request` (llamada HTTP real)
 */
export function debeBloquearAlta(path: string, llegaPorHttp: boolean): boolean {
  if (!llegaPorHttp) return false;
  return path === SIGN_UP_PREFIX || path.startsWith(`${SIGN_UP_PREFIX}/`);
}
