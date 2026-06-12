import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // Unit tests de lógica pura (domain). Los E2E corren aparte con Playwright.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
