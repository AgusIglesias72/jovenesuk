/*
 * Inicialización de Sentry en el cliente (navegador). Igual que el server:
 * se activa solo si NEXT_PUBLIC_SENTRY_DSN está seteado y reporta en prod.
 */
import * as Sentry from "@sentry/nextjs";

// DSN del proyecto (público). Override opcional con NEXT_PUBLIC_SENTRY_DSN.
const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://082d04772ca67da25bae205c4ebc403f@o4511566913994752.ingest.us.sentry.io/4511566926053376";

if (dsn) {
  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
