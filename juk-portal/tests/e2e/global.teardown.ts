import { test as teardown } from "@playwright/test";

import { cleanupE2EData } from "./cleanup";

/**
 * Teardown global: borra los artefactos generados por la suite para que la DB
 * de dev no se acumule (la pagina de listados de 50/pag se vuelve lenta si no).
 * Corre después de todo el proyecto chromium (ver playwright.config.ts).
 */
teardown("limpiar datos generados por los E2E", async () => {
  const borrados = await cleanupE2EData();
  console.log("Teardown · datos E2E borrados:", borrados);
});
