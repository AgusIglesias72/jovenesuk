"use client";

/*
 * Carga de analytics gateada por env var (sin costo). Hoy soporta Google
 * Analytics 4: se activa solo si NEXT_PUBLIC_GA_ID está seteado, así que el
 * sitio no carga nada hasta que el equipo ponga el ID.
 *
 * `track()` envía eventos de conversión (ej. envío de formularios) si gtag
 * está cargado; es no-op si no hay analytics configurado.
 */

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type Gtag = (command: string, ...args: unknown[]) => void;

export function Analytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === "function") gtag("event", event, params ?? {});
}
