#!/usr/bin/env node
/**
 * Test compañero obligatorio.
 *
 * Todo archivo nuevo o modificado bajo src/lib/domain, src/lib/utils o
 * src/lib/actions tiene que tener su <archivo>.test.ts (o .test.tsx) al lado.
 * No se exige para index.ts, labels.ts, errors.ts, types.ts, tests, .d.ts ni
 * archivos que solo declaran tipos. Un archivo borrado no exige nada.
 *
 * Uso (desde juk-portal/):
 *   node scripts/check-test-companions.mjs src/lib/domain/foo.ts ...
 *   git diff --name-status origin/main | node scripts/check-test-companions.mjs --stdin
 *   node scripts/check-test-companions.mjs --base auto        (npm run check:tests)
 *   node scripts/check-test-companions.mjs --base origin/main
 *
 * Acepta rutas sueltas o líneas de `git diff --name-status` (A/M/D/R…), relativas
 * a juk-portal/ o a la raíz del repo (prefijo juk-portal/).
 * --base auto: CHECK_TESTS_BASE, o origin/main, o HEAD~1. Compara contra el
 * merge-base e incluye cambios sin commitear y archivos nuevos sin trackear.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CARPETAS_CUBIERTAS = ["src/lib/domain/", "src/lib/utils/", "src/lib/actions/"];

const EXENTOS_POR_NOMBRE = new Set(["index.ts", "index.tsx", "labels.ts", "errors.ts", "types.ts"]);

const PREFIJO_APP = "juk-portal/";

export function normalizarRuta(ruta) {
  let r = ruta.trim().replace(/\\/g, "/").replace(/^"|"$/g, "");
  if (r.startsWith("./")) r = r.slice(2);
  if (r.startsWith(PREFIJO_APP)) r = r.slice(PREFIJO_APP.length);
  return r;
}

/** Líneas sueltas o de `git diff --name-status` → [{ estado, ruta }]. */
export function parsearCambios(lineas) {
  const cambios = [];
  for (const cruda of lineas) {
    const linea = cruda.replace(/\r$/, "");
    if (!linea.trim()) continue;
    const campos = linea.split("\t");
    const m = campos.length > 1 ? /^([A-Z])\d*$/.exec(campos[0] ?? "") : null;
    if (!m) {
      cambios.push({ estado: "?", ruta: normalizarRuta(linea) });
      continue;
    }
    const estado = m[1];
    const destino = campos[campos.length - 1] ?? "";
    cambios.push({
      estado: estado === "R" || estado === "C" ? "A" : estado,
      ruta: normalizarRuta(destino),
    });
  }
  return cambios;
}

export function exigeTestPorRuta(ruta) {
  if (!CARPETAS_CUBIERTAS.some((c) => ruta.startsWith(c))) return false;
  if (!/\.tsx?$/.test(ruta) || ruta.endsWith(".d.ts")) return false;
  if (/\.test\.tsx?$/.test(ruta) || ruta.includes("/__tests__/")) return false;
  return !EXENTOS_POR_NOMBRE.has(path.posix.basename(ruta));
}

const DECLARACION_EN_RUNTIME =
  /^[ \t]*(?:export[ \t]+)?(?:default\b|async[ \t]+function\b|function[ \t]*[A-Za-z_$*(]|const[ \t]+[A-Za-z_$[{]|let[ \t]+[A-Za-z_$[{]|var[ \t]+[A-Za-z_$[{]|class[ \t]+[A-Za-z_$]|enum[ \t]+[A-Za-z_$]|abstract[ \t]+class\b)/m;
const REEXPORT_EN_RUNTIME = /^[ \t]*export[ \t]*(?:\*|\{)/m;

/** Heurística: un archivo que solo declara tipos no necesita test. */
export function esSoloTipos(contenido) {
  const sinComentarios = contenido.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  return !DECLARACION_EN_RUNTIME.test(sinComentarios) && !REEXPORT_EN_RUNTIME.test(sinComentarios);
}

export function candidatosDeTest(ruta) {
  const base = ruta.replace(/\.tsx?$/, "");
  return [`${base}.test.ts`, `${base}.test.tsx`];
}

/**
 * @param {{estado: string, ruta: string}[]} cambios
 * @param {{ existe: (ruta: string) => boolean, leer: (ruta: string) => string }} fs
 * @returns {string[]} rutas que necesitan test y no lo tienen
 */
export function buscarFaltantes(cambios, fs) {
  const faltantes = new Set();
  for (const { estado, ruta } of cambios) {
    if (estado === "D") continue;
    if (!exigeTestPorRuta(ruta)) continue;
    if (!fs.existe(ruta)) continue;
    if (esSoloTipos(fs.leer(ruta))) continue;
    if (candidatosDeTest(ruta).some((c) => fs.existe(c))) continue;
    faltantes.add(ruta);
  }
  return [...faltantes].sort();
}

/**
 * Cambios contra una base de git. `git` recibe los args y devuelve stdout, o
 * null si el comando falla (ref inexistente, sin commits previos…).
 * @returns {{ base: string, cambios: {estado: string, ruta: string}[] } | null}
 */
export function cambiosDesdeGit(baseSolicitada, git, env = process.env) {
  const existeRef = (ref) => git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]) !== null;
  let base = baseSolicitada;
  if (base === "auto") {
    const candidatas = [env.CHECK_TESTS_BASE, "origin/main", "HEAD~1"].filter(Boolean);
    base = candidatas.find(existeRef) ?? null;
  } else if (!existeRef(base)) {
    base = null;
  }
  if (!base) return null;

  const mergeBase = git(["merge-base", base, "HEAD"])?.trim() || base;
  const diff = git(["diff", "--name-status", "-M", "--relative", mergeBase]) ?? "";
  const sinTrackear = git(["ls-files", "--others", "--exclude-standard"]) ?? "";
  return {
    base,
    cambios: [
      ...parsearCambios(diff.split("\n")),
      ...parsearCambios(sinTrackear.split("\n")).map((c) => ({ ...c, estado: "A" })),
    ],
  };
}

function leerStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export function main(argv, appDir) {
  const args = [...argv];
  let base = null;
  let desdeStdin = false;
  const rutas = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--base") base = args[++i] ?? "auto";
    else if (a === "--stdin") desdeStdin = true;
    else if (a === "--app-dir") appDir = path.resolve(args[++i] ?? appDir);
    else rutas.push(a);
  }

  let cambios = parsearCambios(rutas);
  if (desdeStdin) cambios = cambios.concat(parsearCambios(leerStdin().split("\n")));
  if (base) {
    const git = (gitArgs) => {
      try {
        return execFileSync("git", gitArgs, { cwd: appDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      } catch {
        return null;
      }
    };
    const desdeGit = cambiosDesdeGit(base, git);
    if (!desdeGit) {
      console.error(`check:tests: no encontré la base "${base}" en git; no hay contra qué comparar, sigo.`);
      return 0;
    }
    cambios = cambios.concat(desdeGit.cambios);
  }

  const faltantes = buscarFaltantes(cambios, {
    existe: (r) => existsSync(path.join(appDir, r)),
    leer: (r) => readFileSync(path.join(appDir, r), "utf8"),
  });

  if (faltantes.length === 0) return 0;

  console.error("\ncheck:tests: estos archivos cambiaron y no tienen test al lado:\n");
  for (const r of faltantes) console.error(`  - ${r}  →  ${candidatosDeTest(r)[0]}`);
  console.error(
    "\nToda lógica nueva o modificada en src/lib/domain, src/lib/utils o src/lib/actions" +
      "\nnecesita su <archivo>.test.ts (exentos: index.ts, labels.ts, errors.ts, types.ts y" +
      "\narchivos que solo declaran tipos).\n",
  );
  return 1;
}

const esteArchivo = fileURLToPath(import.meta.url);
const invocado = process.argv[1] ? path.resolve(process.argv[1]) : "";
const mismoArchivo =
  process.platform === "win32" ? invocado.toLowerCase() === esteArchivo.toLowerCase() : invocado === esteArchivo;

if (mismoArchivo) {
  process.exitCode = main(process.argv.slice(2), path.resolve(path.dirname(esteArchivo), ".."));
}
