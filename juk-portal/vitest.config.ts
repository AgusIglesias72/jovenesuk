import path from "node:path";

import { configDefaults, defineConfig } from "vitest/config";

const enCI = Boolean(process.env.CI);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    // En CI: anotaciones por test fallido en el PR + junit para el artifact.
    // Con reporters explícitos Vitest no suma el de GitHub solo, por eso va acá.
    reporters: enCI ? ["default", "github-actions", "junit"] : ["default"],
    outputFile: { junit: "test-results/vitest-junit.xml" },
    coverage: {
      provider: "v8",
      include: [
        "src/lib/domain/**/*.{ts,tsx}",
        "src/lib/utils/**/*.{ts,tsx}",
        "src/lib/actions/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/index.ts",
        "**/labels.ts",
        "**/errors.ts",
        "**/*.test.{ts,tsx}",
        "**/__tests__/**",
        "**/*.d.ts",
      ],
      reporter: ["text", "text-summary", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      // Piso contra regresiones, unos puntos abajo de lo medido el 10/09/2026
      // (97.8 líneas · 97.5 statements · 100 funciones · 95.0 ramas). Subilo
      // cuando la cobertura suba; bajarlo necesita una razón escrita.
      thresholds: {
        lines: 94,
        statements: 94,
        functions: 95,
        branches: 90,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
          exclude: [...configDefaults.exclude, "src/**/*.integration.test.ts"],
        },
      },
      {
        // Contra una DB real: solo `npm run test:integration`. Ver el contrato
        // en tests/integration/setup.ts.
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
