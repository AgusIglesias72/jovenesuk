#!/usr/bin/env node
/**
 * Recordatorio (no bloqueante) al tocar un schema Drizzle.
 *
 * CLAUDE.md: "Every schema change needs a Drizzle migration. Don't push schema
 * changes directly; commit the generated migration." Este hook le recuerda a
 * Claude generar la migración cuando edita src/lib/db/schema/*.
 *
 * Usa hookSpecificOutput.additionalContext → surfacea el recordatorio sin
 * interrumpir el flujo.
 */
const raw = await readStdin();
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (!filePath) process.exit(0);

const norm = filePath.replace(/\\/g, "/");
const isSchema = norm.includes("/src/lib/db/schema/") && /\.ts$/.test(norm);
const isIndex = norm.endsWith("/schema/index.ts");
if (!isSchema || isIndex) process.exit(0);

const file = norm.split("/schema/")[1];
console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `Cambiaste el schema Drizzle (${file}). Antes de commitear: ` +
        `(1) corré \`npm run db:generate\` desde juk-portal/, ` +
        `(2) revisá el SQL generado en juk-portal/drizzle/, ` +
        `(3) commiteá la migración JUNTO con el cambio de schema. ` +
        `No uses db:push contra prod. Si es un cambio grande, usá /juk-migracion.`,
    },
  })
);
process.exit(0);

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}
