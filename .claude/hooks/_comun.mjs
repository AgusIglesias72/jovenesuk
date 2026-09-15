/**
 * Utilidades compartidas por los hooks del harness. NO es un hook: no está
 * registrado en settings.json.
 *
 * Todas las rutas salen de este archivo (import.meta.url), nunca del cwd: los
 * hooks se comportan igual si la sesión arrancó en la raíz del repo, en
 * juk-portal/ o en un worktree.
 *
 * Regla para todos los hooks: ante un error propio (JSON roto, git ausente,
 * archivo ilegible) salen con código 0 y en silencio. Un hook que rompe en cada
 * edición termina desactivado.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HOOKS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HOOKS_DIR, "..", "..");
export const APP_DIR = path.join(REPO_ROOT, "juk-portal");

export function leerStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}

/** JSON que Claude Code manda por stdin, o null si no se puede leer. */
export async function leerPayload() {
  try {
    // Windows PowerShell antepone un BOM al pipear texto a un proceso nativo.
    const raw = (await leerStdin()).replace(/^\uFEFF/, "");
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Ruta relativa a juk-portal/ con "/" (ej: "src/lib/domain/pasos/estados.ts"),
 * o null si el archivo no es de la app.
 */
export function rutaEnApp(filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) return null;
  let p = filePath.trim().replace(/\\/g, "/");
  // Git Bash en Windows puede mandar /c/Users/...
  const msys = /^\/([a-zA-Z])\/(.*)$/.exec(p);
  if (process.platform === "win32" && msys) p = `${msys[1]}:/${msys[2]}`;

  const rel = path.relative(APP_DIR, path.resolve(p)).replace(/\\/g, "/");
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return rel;

  // Fuera de APP_DIR (otro checkout o worktree del mismo repo).
  const i = p.lastIndexOf("/juk-portal/");
  return i >= 0 ? p.slice(i + "/juk-portal/".length) : null;
}

export function esTest(ruta) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(ruta) || ruta.includes("/__tests__/");
}

/** Salida de PostToolUse que Claude lee junto al resultado de la herramienta. */
export function emitirContexto(evento, texto) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: evento, additionalContext: texto } }) + "\n",
  );
}

function archivoDeEstado(payload, nombre) {
  const id = String(payload?.session_id ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!id) return null;
  return path.join(os.tmpdir(), "juk-claude-hooks", `${nombre}-${id}.json`);
}

/** Claves ya registradas en esta sesión para un hook (Set vacío si no hay estado). */
export function leerEstado(payload, nombre) {
  const archivo = archivoDeEstado(payload, nombre);
  if (!archivo) return new Set();
  try {
    const datos = JSON.parse(readFileSync(archivo, "utf8"));
    return new Set(Array.isArray(datos) ? datos.map(String) : []);
  } catch {
    return new Set();
  }
}

export function guardarEstado(payload, nombre, claves) {
  const archivo = archivoDeEstado(payload, nombre);
  if (!archivo) return;
  try {
    mkdirSync(path.dirname(archivo), { recursive: true });
    writeFileSync(archivo, JSON.stringify([...claves]));
  } catch {
    // Sin estado el aviso se repite; no es motivo para fallar.
  }
}

/**
 * true la primera vez que se pide `clave` en la sesión (y la registra). Sin
 * session_id devuelve siempre true: mejor un aviso repetido que ninguno.
 */
export function primeraVez(payload, nombre, clave) {
  const claves = leerEstado(payload, nombre);
  if (claves.has(clave)) return false;
  claves.add(clave);
  guardarEstado(payload, nombre, claves);
  return true;
}
