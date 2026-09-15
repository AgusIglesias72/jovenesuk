#!/usr/bin/env node
/**
 * Recordatorio (no bloquea) al tocar un schema Drizzle: todo cambio en
 * src/lib/db/schema/ necesita su migración commiteada junto al cambio, y el
 * modelo de datos documentado. El procedimiento completo es /juk-migracion.
 *
 * PostToolUse (Edit|Write|MultiEdit). Una vez por sesión por archivo de schema.
 * No dispara en schema/index.ts (solo re-exporta) ni en tests.
 */
import { emitirContexto, esTest, leerPayload, primeraVez, rutaEnApp } from "./_comun.mjs";

const payload = await leerPayload();
const ruta = rutaEnApp(payload?.tool_input?.file_path);
if (
  !ruta ||
  !ruta.startsWith("src/lib/db/schema/") ||
  !/\.ts$/.test(ruta) ||
  ruta === "src/lib/db/schema/index.ts" ||
  esTest(ruta)
) {
  process.exit(0);
}
if (!primeraVez(payload, "schema-change-reminder", ruta)) process.exit(0);

emitirContexto(
  "PostToolUse",
  `Cambiaste un schema Drizzle (${ruta}). Seguí /juk-migracion:\n` +
    `  1. Si es una tabla nueva, re-exportala en src/lib/db/schema/index.ts.\n` +
    `  2. Generá la migración desde juk-portal/: npm run db:generate. Si además hay que mover o ` +
    `completar datos, sumá una migración propia: npx drizzle-kit generate --custom --name=<nombre> y escribí el SQL.\n` +
    `  3. Leé el SQL en juk-portal/drizzle/: DROP, NOT NULL sin default sobre tablas con filas, renames ` +
    `que salieron como drop + add.\n` +
    `  4. Commiteá schema + drizzle/*.sql + drizzle/meta juntos, y actualizá docs/prd/03-modelo-datos.md.\n` +
    `La base de desarrollo tiene datos reales del dueño: nada de db:push ni de migraciones destructivas ` +
    `sin confirmarlo con el usuario.`,
);
process.exit(0);
