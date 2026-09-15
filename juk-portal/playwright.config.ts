import { existsSync, readFileSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

// Carga .env.local en el proceso de Playwright (sin dotenv) para que el
// teardown pueda conectarse a la DB. No pisa variables ya definidas.
try {
  for (const linea of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linea);
    if (m && m[1] && process.env[m[1]] === undefined) {
      process.env[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // sin .env.local (CI con env inyectado): seguir.
}

// Aislamiento opcional: con E2E_DATABASE_URL (branch Neon dedicada) la suite no
// toca la DB de dev. Solo aplica al server que levanta Playwright y al proceso
// de Playwright (cleanup/setup); si apuntás a un server ya corriendo con
// PW_PORT, manda la DATABASE_URL con la que ESE server arrancó.
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
if (DATABASE_URL) process.env.DATABASE_URL = DATABASE_URL;

// Default 3001 (el 3000 es el dev del usuario). Con PW_PORT podés apuntar los
// tests a un server ya levantado (ej: PW_PORT=3000) — Next 16 no permite dos
// dev servers sobre el mismo proyecto.
const PORT = Number(process.env.PW_PORT ?? 3001);
const baseURL = `http://localhost:${PORT}`;

// E2E_SERVER=dev|start elige el server. El CI fija dev a propósito (ver ci.yml:
// en modo producción rigen el rate limit real de login y el storage exige R2).
// Sin la variable: start si corre en CI y hay un build, dev en cualquier otro caso.
const EN_CI = Boolean(process.env.CI);
const SERVER =
  process.env.E2E_SERVER ?? (EN_CI && existsSync(".next/BUILD_ID") ? "start" : "dev");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // En CI un flake de red/Neon no debe tapar el resto; el reporte html marca
  // los tests que pasaron solo al reintentar (flaky) para ir a buscarlos.
  retries: EN_CI ? 2 : 0,
  // Turbopack compila la ruta en la primera visita: 60s de aire por test (los
  // specs que necesitan más lo suben con test.setTimeout).
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    // Guarda el trace de cada intento fallido (en local, con retries 0,
    // "on-first-retry" no capturaría nunca nada).
    trace: "retain-on-failure",
    // Sobre `next start` la app registra el service worker (sw-register.tsx) y
    // su cache contaminaría la navegación entre tests. Ningún spec prueba el SW.
    serviceWorkers: SERVER === "start" ? "block" : "allow",
  },
  projects: [
    // setup arma la sesión y, al terminar todo lo que depende de él, dispara
    // el teardown que limpia los datos generados por la corrida.
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "cleanup" },
    { name: "cleanup", testMatch: /global\.teardown\.ts/ },
    // Sesión de familia aparte: un solo login para todo el spec del portal
    // (loguear por test agotaba el rate limit de Better-Auth).
    { name: "setup-familia", testMatch: /familia\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /(public|familias|familias-ux)\.spec\.ts/,
      // Lo etiquetado @mobile corre en el proyecto "mobile" (viewport de
      // teléfono): sin este grepInvert correría dos veces, y en desktop los
      // asserts de overflow/tap no significan nada.
      grepInvert: /@mobile/,
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/admin.json" },
      dependencies: ["setup"],
    },
    // Viewport de teléfono (Pixel 7, touch). Corre SOLO los tests marcados
    // @mobile — el tag va en el título o en `{ tag: "@mobile" }`, no en el
    // nombre del archivo (Playwright matchea grep contra el título + tags).
    // Depende también de setup-familia porque smoke-mobile.spec.ts entra al
    // portal de familias con `test.use({ storageState })` en su describe.
    {
      name: "mobile",
      testIgnore: /(public|familias)\.spec\.ts/,
      grep: /@mobile/,
      use: { ...devices["Pixel 7"], storageState: "tests/e2e/.auth/admin.json" },
      dependencies: ["setup", "setup-familia"],
    },
    {
      name: "familias",
      testMatch: /familias(-ux)?\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/familia.json" },
      dependencies: ["setup-familia"],
    },
    // Sitio público: sin sesión y sin depender del setup de auth. Los leads que
    // crean sus formularios los limpia el propio spec (no lo alcanza el teardown).
    {
      name: "public",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: SERVER === "start" ? `npm run start -- -p ${PORT}` : `npm run dev -- -p ${PORT}`,
    url: `${baseURL}/login`,
    // En CI siempre un server propio: reusar uno ajeno daría verdes falsos.
    reuseExistingServer: !EN_CI,
    timeout: 120_000,
    env: {
      // Los E2E ejercitan formularios que disparan mails: en dry-run se
      // renderizan y loguean, pero no salen a Resend.
      EMAIL_DRY_RUN: "1",
      ...(DATABASE_URL ? { DATABASE_URL } : {}),
    },
  },
});
