import { readFileSync } from "node:fs";

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

// Default 3001 (el 3000 es el dev del usuario). Con PW_PORT podés apuntar los
// tests a un server ya levantado (ej: PW_PORT=3000) — Next 16 no permite dos
// dev servers sobre el mismo proyecto.
const PORT = Number(process.env.PW_PORT ?? 3001);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // setup arma la sesión y, al terminar todo lo que depende de él, dispara
    // el teardown que limpia los datos generados por la corrida.
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "cleanup" },
    { name: "cleanup", testMatch: /global\.teardown\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/admin.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
