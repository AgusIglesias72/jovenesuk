import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const isDev = process.env.NODE_ENV !== "production";

/*
 * Convierte el DSN (https://<key>@<host>/<projectId>) en el endpoint de
 * reportes CSP de Sentry. Sin DSN, la CSP sale sin report-uri (el navegador
 * solo loguea en consola).
 */
function sentryCspReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, "");
    if (!url.username || !projectId) return null;
    return `${url.protocol}//${url.host}/api/${projectId}/security/?sentry_key=${url.username}`;
  } catch {
    return null;
  }
}

/*
 * CSP en modo Report-Only: no bloquea nada, solo reporta violaciones a Sentry.
 * Está así porque el sitio público y el back-office todavía dependen de
 * `'unsafe-inline'` (JSON-LD de seo.tsx y _sections/faq.tsx, el init de GA4 en
 * analytics.tsx, `style={{}}` en SSR y el srcDoc del preview de emails), y
 * el <script> inline de public/globe-loader.html no puede llevar nonce por
 * ser estático. Para pasarla a enforce (renombrar el header a
 * Content-Security-Policy): 1-2 semanas sin violaciones en Sentry, y
 * después reemplazar 'unsafe-inline' de script-src por nonces (solo en el
 * back-office, que ya renderiza dinámico) o hashes.
 */
function contentSecurityPolicy(): string {
  const reportUri = sentryCspReportUri(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com",
    "connect-src 'self' https://*.ingest.us.sentry.io https://*.ingest.sentry.io https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  if (reportUri) directives.push(`report-uri ${reportUri}`);
  return directives.join("; ");
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  turbopack: {},

  // Los documentos y las imágenes subidas se sirven por /api/uploads/<key>
  // (autenticado, same-origin): no hace falta habilitar hosts externos.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
  },

  // Redirects 301 desde las URLs del sitio Wix viejo, para no perder el SEO
  // acumulado tras el cambio de dominio. Ampliar con las que aparezcan en
  // Search Console del sitio actual antes del cutover.
  async redirects() {
    return [
      { source: "/quienessomos", destination: "/quienes-somos", permanent: true },
      { source: "/salidagrupal", destination: "/salidas#grupal", permanent: true },
      { source: "/salida-para-institutos", destination: "/salidas#institutos", permanent: true },
      { source: "/salida-individual", destination: "/salidas#individual", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy() },
        ],
      },
    ];
  },

  // Externalize Drizzle DB driver from the bundle to avoid edge issues
  serverExternalPackages: ["@neondatabase/serverless"],

  experimental: {
    // reactCompiler: true,  // enable when team confirms perf gains

    // Los uploads (pasaporte/documentos hasta 10 MB en domain/documentos,
    // imagen de prospecto 5 MB, CSV de importación) viajan por server action;
    // el default de Next es 1 MB. Se deja margen para el overhead multipart.
    serverActions: {
      bodySizeLimit: "11mb",
    },

    // Navegación instantánea: cachea el RSC de páginas visitadas en el router
    // del cliente. Las mutaciones siguen frescas (revalidatePath purga esto).
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },

  // For Vercel deployment in São Paulo, set region in vercel.json (not here)
};

/*
 * withSentryConfig solo cuando hay credenciales para subir source maps: sin
 * ellas el plugin falla el build (o lo llena de warnings) y no aporta nada,
 * porque el SDK en runtime se inicializa en src/instrumentation*.ts.
 */
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentrySourceMapsEnabled = Boolean(sentryOrg && sentryProject && sentryAuthToken);

export default sentrySourceMapsEnabled
  ? withSentryConfig(config, {
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,
      silent: !process.env.CI,
      telemetry: false,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : config;
