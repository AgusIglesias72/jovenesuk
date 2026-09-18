import { EmailConfigError, EmailEnvioError } from "./errors";

/**
 * El motivo REAL de un envío fallido, para mostrárselo a quien administra.
 *
 * POR QUÉ existe: hasta el 18/09/2026 el envío de prueba de /configuracion
 * respondía "Verificá la API key de Resend y que el dominio del remitente esté
 * verificado", que es una lista de sospechosos, no un diagnóstico. Producción
 * estuvo meses sin poder mandar un solo mail y nadie se enteró, porque el único
 * lugar donde estaba el motivo era Sentry: el envío es best-effort a propósito
 * (una ficha no se pierde porque el mail falle), y un error que no se muestra no
 * lo mira nadie.
 *
 * Mostrar el texto del proveedor es seguro donde se usa hoy (una pantalla de
 * `super_admin`): Resend devuelve descripciones del problema ("domain is not
 * verified", "you can only send testing emails to your own email address"),
 * nunca credenciales. El genérico queda solo para lo que no sabemos nombrar, y
 * NO vuelve a la lista de sospechosos.
 *
 * Vive fuera del `actions.tsx` que la usa porque un archivo `"use server"` solo
 * puede exportar funciones async (Next lo rechaza en el build, y ni el
 * typecheck ni los tests lo detectan).
 *
 * No confundir con `motivoDeEnvioFallido` de `domain/inscripciones/invitacion`:
 * aquella lee el error que quedó guardado en la bitácora de un prospecto.
 */
export function explicarFalloDeEnvio(err: unknown): string {
  if (err instanceof EmailConfigError) {
    return `${err.message} Sin esa variable, este deploy no puede enviar ningún mail.`;
  }
  if (err instanceof EmailEnvioError) {
    return `Resend rechazó el envío: ${err.detalle}`;
  }
  return "No pudimos enviar la prueba, y el error no es uno de los conocidos. El detalle quedó en Sentry.";
}
