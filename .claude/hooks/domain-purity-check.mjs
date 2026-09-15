#!/usr/bin/env node
/**
 * ADR-005: src/lib/domain/ es lógica de negocio PURA. Sin Next, sin React, sin
 * server-only/client-only, sin la capa app/ y sin acceso a DB (drizzle-orm,
 * drivers, @/lib/db). Así las reglas se testean con unit tests sin levantar
 * nada y se pueden leer sin conocer la infraestructura.
 *
 * PostToolUse (Edit|Write|MultiEdit). Lee el archivo recién escrito y, si
 * importa algo prohibido, sale con código 2: el archivo ya quedó escrito, pero
 * Claude recibe el motivo por stderr y lo tiene que corregir.
 *
 * Detecta: `import x from "m"`, `import type`, el import de efecto
 * (`import "server-only"`, la forma en que realmente se escribe), `export … from`,
 * `import("m")` y `require("m")`. Los comentarios se ignoran (hay módulos que
 * nombran `@/lib/db/schema` en un comentario para explicar qué replican).
 *
 * No revisa *.test.ts: los tests no salen de la app.
 */
import { readFileSync } from "node:fs";

import { esTest, leerPayload, rutaEnApp } from "./_comun.mjs";

const REGLAS = [
  { nombre: "next", prohibido: (m) => m === "next" || m.startsWith("next/") },
  { nombre: "react", prohibido: (m) => /^react(-dom)?(\/|$)/.test(m) },
  { nombre: "server-only/client-only", prohibido: (m) => m === "server-only" || m === "client-only" },
  { nombre: "@/app", prohibido: (m) => m === "@/app" || m.startsWith("@/app/") },
  {
    nombre: "drizzle-orm / driver de DB",
    prohibido: (m) => /^drizzle-orm(\/|$)/.test(m) || m.startsWith("@neondatabase/") || m === "pg",
  },
  { nombre: "@/lib/db", prohibido: (m) => m === "@/lib/db" || m.startsWith("@/lib/db/") },
];

function especificadores(codigo) {
  const sinComentarios = codigo
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
  const patrones = [
    /\bimport\s+(?:type\s+)?[^;"'`]*?\bfrom\s*["']([^"']+)["']/g,
    /\bexport\s+(?:type\s+)?[^;"'`]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  const encontrados = new Set();
  for (const re of patrones) {
    for (const m of sinComentarios.matchAll(re)) encontrados.add(m[1]);
  }
  return [...encontrados];
}

const payload = await leerPayload();
const filePath = payload?.tool_input?.file_path;
const ruta = rutaEnApp(filePath);
if (!ruta || !ruta.startsWith("src/lib/domain/") || !/\.tsx?$/.test(ruta) || esTest(ruta)) {
  process.exit(0);
}

let codigo;
try {
  codigo = readFileSync(filePath, "utf8");
} catch {
  process.exit(0);
}

const violaciones = [];
for (const modulo of especificadores(codigo)) {
  const regla = REGLAS.find((r) => r.prohibido(modulo));
  if (regla) violaciones.push(`"${modulo}" (${regla.nombre})`);
}
if (violaciones.length === 0) process.exit(0);

console.error(
  `ADR-005: ${ruta} importa ${violaciones.join(", ")}.\n` +
    `src/lib/domain/ es lógica pura: sin Next, React, server-only, app/ ni acceso a la base.\n` +
    `Cómo se corrige: la lectura/escritura va a src/lib/db/queries/, lo de Next (auth, revalidate, ` +
    `headers) a la server action o route handler en src/app/, y la función de dominio recibe los ` +
    `datos ya resueltos como argumentos. Si necesitás los valores de un enum de la DB, replicalos ` +
    `con Zod en el dominio (como src/lib/domain/colegios/schema.ts).`,
);
process.exit(2);
