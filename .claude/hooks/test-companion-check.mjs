#!/usr/bin/env node
/**
 * Test compañero (aviso, no bloquea). Si se editó un archivo de src/lib/domain,
 * src/lib/utils o src/lib/actions que exige test y no lo tiene al lado, le dice
 * a Claude el nombre exacto del test a crear.
 *
 * Qué exige test lo define UN solo lugar: juk-portal/scripts/check-test-companions.mjs
 * (el mismo que corren `npm run check:tests`, el pre-push y el CI). Este hook lo
 * importa; no copia sus reglas. Si ese script no está, sale en silencio.
 *
 * Por qué aviso y no bloqueo: el flujo normal escribe primero el archivo y
 * después su test (/juk-modulo). El bloqueo real está en check:tests.
 *
 * PostToolUse (Edit|Write|MultiEdit). Una vez por sesión por archivo.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { APP_DIR, emitirContexto, leerPayload, primeraVez, rutaEnApp } from "./_comun.mjs";

const payload = await leerPayload();
const ruta = rutaEnApp(payload?.tool_input?.file_path);
if (!ruta || !ruta.startsWith("src/lib/")) process.exit(0);

let contrato;
try {
  contrato = await import(pathToFileURL(path.join(APP_DIR, "scripts", "check-test-companions.mjs")).href);
} catch {
  process.exit(0);
}
const { buscarFaltantes, candidatosDeTest, exigeTestPorRuta } = contrato;
if (typeof buscarFaltantes !== "function" || !exigeTestPorRuta(ruta)) process.exit(0);

let faltantes;
try {
  faltantes = buscarFaltantes([{ estado: "M", ruta }], {
    existe: (r) => existsSync(path.join(APP_DIR, r)),
    leer: (r) => readFileSync(path.join(APP_DIR, r), "utf8"),
  });
} catch {
  process.exit(0);
}
if (faltantes.length === 0 || !primeraVez(payload, "test-companion-check", ruta)) process.exit(0);

emitirContexto(
  "PostToolUse",
  `Test compañero: ${ruta} tiene lógica y no tiene test al lado. ` +
    `Creá juk-portal/${candidatosDeTest(ruta)[0]} (Vitest, proyecto unit): casos felices, bordes y errores. ` +
    `npm run check:tests lo exige en el pre-push y en el CI. Si ya lo ibas a escribir, seguí.`,
);
process.exit(0);
