import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Setup del proyecto vitest "integration" (`npm run test:integration`).
 *
 * Contrato:
 *  - Carga .env.local sin pisar lo ya definido (mismo loader que playwright.config.ts).
 *  - Con INTEGRATION_DATABASE_URL, DATABASE_URL pasa a ser esa: @/lib/db la lee al importarse.
 *  - Sin INTEGRATION_DATABASE_URL cada archivo se saltea (describe.skipIf) y DATABASE_URL
 *    queda en un host inalcanzable: importar @/lib/db no tira, y una query que se escape
 *    del skip falla en vez de escribir en la DB de desarrollo que trae .env.local.
 *  - Los tests crean solo filas propias (DNI "INT-…", "[INT]…", int+…@int.jovenesenuk.com)
 *    y las borran en afterAll aunque fallen.
 */

const DB_DESHABILITADA = "postgresql://sin-integracion:x@integracion-deshabilitada.invalid/none";

try {
  const envLocal = fileURLToPath(new URL("../../.env.local", import.meta.url));
  for (const linea of readFileSync(envLocal, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linea);
    if (m && m[1] && process.env[m[1]] === undefined) {
      process.env[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // sin .env.local (CI con env inyectado): seguir.
}

process.env.DATABASE_URL = process.env.INTEGRATION_DATABASE_URL || DB_DESHABILITADA;
