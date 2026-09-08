/*
 * Inicialización de Sentry (monitoreo de errores) en el servidor/edge.
 * Se activa SOLO si NEXT_PUBLIC_SENTRY_DSN está seteado (nunca hardcodeado:
 * un clon/fork no debe reportar al proyecto real), y reporta solo en
 * producción. Los source maps los sube withSentryConfig en next.config.ts
 * cuando hay SENTRY_AUTH_TOKEN/ORG/PROJECT.
 */
import * as Sentry from "@sentry/nextjs";

export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV === "production") {
      console.error("NEXT_PUBLIC_SENTRY_DSN no está configurado: Sentry queda desactivado.");
    }
    return;
  }

  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn,
      enabled: process.env.NODE_ENV === "production",
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
