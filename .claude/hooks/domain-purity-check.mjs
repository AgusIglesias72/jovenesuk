#!/usr/bin/env node
/**
 * ADR-005 enforcement: archivos en `src/lib/domain/` deben ser lógica de negocio
 * PURA — sin imports de Next.js, React, ni de la capa `app/`.
 *
 * Se dispara en PostToolUse (Edit/Write). Lee el archivo recién escrito y, si
 * encuentra un import prohibido, bloquea con feedback (exit 2) para que Claude
 * lo corrija reubicando esa lógica en la capa web o en lib/db/queries/.
 */
import { readFileSync } from "node:fs";

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
if (!norm.includes("/src/lib/domain/")) process.exit(0);
if (!/\.(ts|tsx)$/.test(norm)) process.exit(0);

let content;
try {
  content = readFileSync(filePath, "utf8");
} catch {
  process.exit(0);
}

const forbidden = [
  { re: /from\s+["']next(\/[^"']*)?["']/, name: "next" },
  { re: /from\s+["']react(-dom)?(\/[^"']*)?["']/, name: "react" },
  { re: /from\s+["']@\/app\//, name: "@/app" },
  { re: /from\s+["']server-only["']/, name: "server-only" },
];

const hits = forbidden.filter((f) => f.re.test(content)).map((f) => f.name);
if (hits.length === 0) process.exit(0);

const rel = norm.split("/src/")[1] ?? norm;
console.error(
  `ADR-005 violación en src/${rel}: importa de [${hits.join(", ")}].\n` +
    `lib/domain/ debe ser lógica pura, sin frameworks (es lo que va a reusar la futura API/app nativa).\n` +
    `Corregí: mové ese import a la capa web (un Server Action en app/) o a lib/db/queries/, y dejá ` +
    `el módulo de dominio recibiendo los datos ya resueltos como argumentos.`
);
process.exit(2);

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}
