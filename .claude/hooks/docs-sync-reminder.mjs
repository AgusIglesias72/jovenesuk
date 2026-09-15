#!/usr/bin/env node
/**
 * Regla de sincronía: el código y su documentación cambian juntos.
 *
 * Evento Stop (cuando Claude termina el turno). Mira el working tree con git
 * (cambios sin commitear y archivos nuevos). Si hay cambios en juk-portal/src/
 * que no son tests y NINGUNO en los docs vivos (docs/prd/, OPEN_DECISIONS.md,
 * docs/estado-actual.md, CHANGELOG.md, .claude/docs/03-mapa-de-archivos.md),
 * le recuerda a Claude la tabla "tocaste X → actualizá Y".
 *
 * Cómo avisa: exit 2 con el texto en stderr, que es la única forma en que un
 * hook Stop le habla a Claude (con exit 0 el texto no le llega). Para que sea un
 * recordatorio y no un bloqueo:
 * - avisa UNA vez por archivo: si al volver a terminar no apareció ningún archivo
 *   nuevo en src/, sale en silencio aunque los docs sigan sin tocar (Claude pudo
 *   decidir, con motivo, que no hacía falta);
 * - respeta stop_hook_active (nunca encadena avisos);
 * - JUK_DOCS_SYNC=off lo apaga para una sesión (ej.: refactor mecánico).
 * Sin git, fuera de un repo o ante cualquier error: exit 0 en silencio.
 */
import { execFileSync } from "node:child_process";

import { REPO_ROOT, esTest, guardarEstado, leerEstado, leerPayload } from "./_comun.mjs";

const DOCS_VIVOS = [
  "juk-portal/docs/prd/",
  "juk-portal/OPEN_DECISIONS.md",
  "juk-portal/docs/estado-actual.md",
  "juk-portal/CHANGELOG.md",
  ".claude/docs/03-mapa-de-archivos.md",
];

/** `git status --porcelain=v1 -z` → [{ estado, ruta }] con rutas desde la raíz del repo. */
function cambiosDelWorkingTree() {
  const salida = execFileSync(
    "git",
    ["-c", "core.quotepath=false", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 20_000 },
  );
  const partes = salida.split("\0");
  const cambios = [];
  for (let i = 0; i < partes.length; i++) {
    const entrada = partes[i];
    if (!entrada || entrada.length < 4) continue;
    const estado = entrada.slice(0, 2);
    cambios.push({ estado, ruta: entrada.slice(3) });
    if (estado[0] === "R" || estado[0] === "C") i++;
  }
  return cambios;
}

function tabla(codigo) {
  const rutas = codigo.map((c) => c.ruta);
  const toca = (prefijo) => rutas.some((r) => r.startsWith(`juk-portal/${prefijo}`));
  const filas = [];
  if (toca("src/lib/db/schema/")) {
    filas.push("schema de la DB → docs/prd/03-modelo-datos.md (y la migración, /juk-migracion)");
  }
  if (toca("src/lib/domain/") || toca("src/lib/db/queries/") || toca("src/lib/jobs/") || toca("src/trigger/")) {
    filas.push(
      "regla de negocio, estado, validación o job → la spec del módulo en docs/prd/ (índice: 00-indice.md); " +
        "si decidiste o asumiste algo de producto → OPEN_DECISIONS.md",
    );
  }
  if (toca("src/app/") || toca("src/components/")) {
    filas.push(
      "pantalla, ruta o flujo → docs/estado-actual.md (qué quedó construido o parcial) y su spec E2E en tests/e2e/",
    );
  }
  if (toca("src/components/ui/") || toca("src/styles/")) {
    filas.push("componente del design system o tokens → docs/design-system.md");
  }
  if (codigo.some((c) => c.estado.includes("?") || /[ADR]/.test(c.estado))) {
    filas.push("archivos nuevos, borrados o movidos → .claude/docs/03-mapa-de-archivos.md");
  }
  filas.push("convención o decisión técnica nueva → juk-portal/CLAUDE.md o un ADR en docs/architecture.md");
  filas.push("siempre → una línea en CHANGELOG.md, sección [Sin publicar]");
  filas.push("al cerrar → el reporte de seis puntos de /juk-cierre (código · test · PRD · definiciones · estado/changelog · mapa)");
  return filas.map((f) => `  - ${f}`).join("\n");
}

const payload = await leerPayload();
if (process.env.JUK_DOCS_SYNC === "off" || payload?.stop_hook_active === true) process.exit(0);

let cambios;
try {
  cambios = cambiosDelWorkingTree();
} catch {
  process.exit(0);
}

const tocaDocs = cambios.some((c) => DOCS_VIVOS.some((d) => c.ruta.startsWith(d)));
const codigo = cambios.filter((c) => c.ruta.startsWith("juk-portal/src/") && !esTest(c.ruta));
if (tocaDocs || codigo.length === 0) process.exit(0);

const yaAvisados = leerEstado(payload, "docs-sync-reminder");
const nuevos = codigo.filter((c) => !yaAvisados.has(c.ruta));
if (nuevos.length === 0) process.exit(0);
for (const c of codigo) yaAvisados.add(c.ruta);
guardarEstado(payload, "docs-sync-reminder", yaAvisados);

const MAX = 8;
const listado =
  codigo
    .slice(0, MAX)
    .map((c) => `  ${c.ruta.replace(/^juk-portal\//, "")}`)
    .join("\n") + (codigo.length > MAX ? `\n  … y ${codigo.length - MAX} más` : "");

console.error(
  `Regla de sincronía: hay cambios en juk-portal/src sin cambios en la documentación viva.\n` +
    `${listado}\n` +
    `Tocaste X → actualizá Y:\n${tabla(codigo)}\n` +
    `Si ya está al día o el cambio no lo amerita (refactor interno, fix que no cambia una regla), ` +
    `decilo en una línea y terminá: este aviso no se repite para estos archivos.`,
);
process.exit(2);
