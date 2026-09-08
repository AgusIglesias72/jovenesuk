/*
 * Inicialización de Sentry en el cliente (navegador). Igual que el server:
 * se activa solo si NEXT_PUBLIC_SENTRY_DSN está seteado y reporta en prod.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === "production",
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
} else if (process.env.NODE_ENV === "production") {
  console.error("NEXT_PUBLIC_SENTRY_DSN no está configurado: Sentry queda desactivado.");
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
