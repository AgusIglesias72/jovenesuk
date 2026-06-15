/*
 * Inicialización de Sentry (monitoreo de errores) en el servidor/edge.
 * Se activa SOLO si NEXT_PUBLIC_SENTRY_DSN está seteado, y reporta solo en
 * producción. Sin DSN es no-op, así que dev y los builds sin configurar no se
 * ven afectados. La carga de source maps (withSentryConfig) se puede sumar
 * después con SENTRY_AUTH_TOKEN.
 */
import * as Sentry from "@sentry/nextjs";

// DSN del proyecto de Sentry (es público: viaja en el bundle del cliente).
// Se puede pisar con NEXT_PUBLIC_SENTRY_DSN en Vercel si se cambia de proyecto.
const SENTRY_DSN =
  "https://082d04772ca67da25bae205c4ebc403f@o4511566913994752.ingest.us.sentry.io/4511566926053376";

export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? SENTRY_DSN;
  if (!dsn) return;

  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn,
      enabled: process.env.NODE_ENV === "production",
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
