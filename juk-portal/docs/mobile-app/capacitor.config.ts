/**
 * TEMPLATE de configuración de Capacitor para el JUK Portal.
 *
 * ⚠️ Este archivo vive en `docs/mobile-app/` a propósito (modo scaffold, no toca nada).
 *    Cuando arranques el wrapping en tu máquina, COPIALO a la raíz de la app:
 *       juk-portal/capacitor.config.ts
 *    Capacitor lo busca ahí (raíz del proyecto), no en docs/.
 *
 * Requiere las deps de Capacitor instaladas (ver runbook-android.md / runbook-ios.md):
 *    npm i -D @capacitor/cli
 *    npm i @capacitor/core
 *    (el import de tipos de abajo funciona una vez instaladas)
 */
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Bundle ID / Application ID. DEBE coincidir con lo que registres en App Store Connect
  // y Play Console. Formato reverse-DNS. Definir el DEFINITIVO antes de la primera subida:
  // cambiarlo después obliga a crear otra app en las stores.
  appId: "com.jovenesenuk.portal",

  // Nombre visible bajo el ícono en el teléfono.
  appName: "Jóvenes en UK",

  // Carpeta con el build web local. Con `server.url` (WebView remota) NO se usa realmente,
  // pero Capacitor EXIGE que exista y que tenga al menos un index.html, si no `cap sync` falla.
  // Ver la nota "webDir" al pie para cómo generar un placeholder mínimo.
  webDir: "public",

  server: {
    // ── MODO WebView REMOTA (recomendado para el JUK Portal) ─────────────────────────────
    // La app carga el sitio deployado. Cada deploy a Vercel actualiza la app al instante.
    // Reemplazá <PROD_URL> por la URL de producción definitiva, por ejemplo:
    //    https://portal.jovenesenuk.com   (dominio planeado del portal)
    //    https://jovenesuk.vercel.app      (deploy actual de Vercel)
    // OJO: sin barra final, con https, y debe ser HTTPS válido (cert OK) o Android lo bloquea.
    url: "<PROD_URL>",

    // Permite que la WebView cargue contenido del dominio de arriba como "origen confiable".
    // Dejar en false salvo que sepas por qué lo cambiás.
    cleartext: false,

    // Si algún día servís desde otro host durante desarrollo, agregalo acá.
    allowNavigation: [
      // "portal.jovenesenuk.com",
      // "jovenesuk.vercel.app",
    ],

    // ── ALTERNATIVA: BUNDLE LOCAL (offline-first) ────────────────────────────────────────
    // Si en vez de WebView remota querés empaquetar el sitio DENTRO del binario:
    //   1. Comentá/borrá `url` de arriba.
    //   2. `webDir` debe apuntar a un export estático del sitio (p. ej. `out/` con
    //      `output: "export"` en next.config, o una copia estática servida por Capacitor).
    //   3. Cada cambio de UI obliga a re-buildear y RESUBIR binario a las stores.
    // Para el JUK Portal (app con datos en vivo, server actions, auth) el bundle local NO
    // aplica bien porque necesita el backend Next en Vercel igual. Por eso: WebView remota.
  },

  // Fondo de la WebView mientras carga (evita flash blanco). Token de marca del DS.
  backgroundColor: "#fbf7f2",

  ios: {
    // Estilo del contenido dentro del safe area. "always" respeta notch/isla dinámica.
    contentInset: "always",
    backgroundColor: "#fbf7f2",
  },

  android: {
    backgroundColor: "#fbf7f2",
    // Permite HTTP en debug builds; en release mantené todo HTTPS.
    allowMixedContent: false,
  },

  plugins: {
    // Splash screen inicial. Requiere el plugin @capacitor/splash-screen (opcional).
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#fbf7f2",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: false,
      splashImmersive: false,
    },
    // Barra de estado. Requiere @capacitor/status-bar (opcional).
    // "DARK" = texto oscuro sobre fondo claro (nuestro theme claro es #fbf7f2).
    StatusBar: {
      style: "DARK",
      backgroundColor: "#fbf7f2",
    },
  },
};

export default config;

/**
 * ── Nota webDir (placeholder mínimo) ────────────────────────────────────────────────────
 * En modo WebView remota, `webDir` no se sirve, pero `cap sync`/`cap add` exigen que la
 * carpeta exista y contenga un index.html. Opciones:
 *   A) Apuntar a `public` (como acá) y dejar un `public/capacitor-index.html` mínimo si el
 *      linter de Capacitor se queja; normalmente con que la carpeta exista alcanza.
 *   B) Crear una carpeta dedicada `www/` con un index.html de una línea:
 *        <!doctype html><meta http-equiv="refresh" content="0; url=<PROD_URL>">
 *      y poner webDir: "www". Sirve además como fallback si `server.url` fallara.
 * Elegí una y dejá la misma en este archivo cuando lo copies a la raíz.
 */
