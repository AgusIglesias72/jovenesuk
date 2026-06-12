import { defineConfig, devices } from "@playwright/test";

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
    { name: "setup", testMatch: /auth\.setup\.ts/ },
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
