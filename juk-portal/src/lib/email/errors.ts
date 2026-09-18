/**
 * Los errores con nombre del envío de mails.
 *
 * Viven en su propio archivo, sin dependencias, por lo mismo que
 * `src/lib/db/queries/errors.ts`: `./index` importa la base al cargarse (lee los
 * remitentes de /configuracion), así que traer estas clases desde ahí arrastraba
 * una conexión a Postgres a cualquier módulo que solo quisiera reconocer un
 * error — un test unitario, por ejemplo, reventaba con "DATABASE_URL is not
 * defined" sin haber tocado la base. `./index` las re-exporta, así que los que
 * ya las importaban de `@/lib/email` no cambian.
 */

/** Falta una variable de entorno sin la cual este deploy no puede enviar. */
export class EmailConfigError extends Error {
  constructor(variable: string) {
    super(`${variable} no está definida.`);
    this.name = "EmailConfigError";
  }
}

/** Resend rechazó el envío (dominio sin verificar, API key inválida, etc.). */
export class EmailEnvioError extends Error {
  constructor(public readonly detalle: string) {
    super(`Resend error: ${detalle}`);
    this.name = "EmailEnvioError";
  }
}
