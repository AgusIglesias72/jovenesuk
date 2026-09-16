#!/usr/bin/env node
/**
 * El CI completo, en tu máquina y sin gastar minutos de GitHub Actions.
 *
 * Replica los dos jobs de .github/workflows/ci.yml:
 *   rápidos → typecheck, lint, unit con piso de cobertura y test compañero
 *   base    → branch efímera de Neon (hija de `ci-base`, sin datos del negocio)
 *             → db:migrate → db:seed + db:seed:demo → test:integration
 *             → Playwright → borra la branch
 *
 * La base de desarrollo no se toca: todo lo que escribe la corrida va a la
 * branch efímera. El server de Playwright compila en otra carpeta
 * (NEXT_DIST_DIR=.next-e2e), así que convive con el `next dev` del 3000: Next 16
 * guarda el candado de "ya hay un dev corriendo" dentro de la carpeta de build.
 *
 * Uso (desde juk-portal/):
 *   npm run ci:local                              todo
 *   node scripts/ci-local.mjs --rapido            solo los chequeos rápidos (sin base)
 *   node scripts/ci-local.mjs --sin-e2e           rápidos + integración, sin Playwright
 *   node scripts/ci-local.mjs --saltear-rapidos   solo la parte con base
 *   node scripts/ci-local.mjs --mantener-branch   no borra la branch al final
 *
 * Necesita `neonctl` logueado (`npx neonctl@4 auth`, espera 60 s) y
 * NEON_PROJECT_ID y SEED_TEST_PASSWORD en .env.local. No corre `next build`: eso
 * lo valida el job `check` de GitHub.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const OPCIONES = ["--rapido", "--sin-e2e", "--saltear-rapidos", "--mantener-branch"];
export const PARENT_DEFAULT = "ci-base";
export const PUERTO_E2E = 3001;
export const DIST_DIR_E2E = ".next-e2e";
const NEONCTL = "neonctl@4";

export function parsearArgs(argv) {
  const presentes = new Set(argv);
  const opciones = {
    rapido: presentes.has("--rapido"),
    sinE2e: presentes.has("--sin-e2e"),
    saltearRapidos: presentes.has("--saltear-rapidos"),
    mantenerBranch: presentes.has("--mantener-branch"),
    desconocidos: argv.filter((a) => !OPCIONES.includes(a)),
  };
  if (opciones.rapido && opciones.saltearRapidos) {
    opciones.error = "--rapido y --saltear-rapidos se excluyen: no quedaría nada para correr.";
  } else if (opciones.desconocidos.length > 0) {
    opciones.error = `Opción desconocida: ${opciones.desconocidos.join(", ")}. Válidas: ${OPCIONES.join(", ")}.`;
  }
  return opciones;
}

/** Parser mínimo de .env: NOMBRE=valor, con comillas opcionales. */
export function parsearEnv(contenido) {
  const vars = {};
  for (const linea of contenido.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(linea);
    if (!m) continue;
    vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

/** `local-AAAAMMDD-HHMMSS`: ordenable, y distingue una corrida local de una del CI (`ci-…`). */
export function nombreBranch(fecha = new Date()) {
  const d = (n) => String(n).padStart(2, "0");
  return (
    `local-${fecha.getFullYear()}${d(fecha.getMonth() + 1)}${d(fecha.getDate())}` +
    `-${d(fecha.getHours())}${d(fecha.getMinutes())}${d(fecha.getSeconds())}`
  );
}

/** Los pasos, en el orden del CI. `base: true` = necesitan la branch efímera. */
export function planDePasos(opciones) {
  const pasos = [];
  if (!opciones.saltearRapidos) {
    pasos.push(
      { nombre: "typecheck", script: "typecheck" },
      { nombre: "lint", script: "lint" },
      { nombre: "unit + cobertura", script: "test:coverage" },
      { nombre: "test compañero", script: "check:tests" }
    );
  }
  if (opciones.rapido) return pasos;
  pasos.push(
    { nombre: "migraciones", script: "db:migrate", base: true },
    { nombre: "seed (super_admin)", script: "db:seed", base: true },
    { nombre: "seed demo", script: "db:seed:demo", base: true },
    { nombre: "integración", script: "test:integration", base: true }
  );
  if (!opciones.sinE2e) {
    pasos.push({ nombre: "playwright", script: "test:e2e", base: true, e2e: true });
  }
  return pasos;
}

/**
 * El entorno de los pasos con base. Pisa TODO lo que apunta a la base de dev: si
 * quedara una sola variable con la URL de `.env.local`, la corrida escribiría en
 * los datos reales del dueño.
 */
export function envDeCorrida(base, urls) {
  if (!urls.pooled || !urls.directa) throw new Error("faltan las URLs de la branch efímera");
  const origen = `http://localhost:${PUERTO_E2E}`;
  return {
    ...base,
    DATABASE_URL: urls.pooled,
    DATABASE_URL_UNPOOLED: urls.directa,
    INTEGRATION_DATABASE_URL: urls.pooled,
    E2E_DATABASE_URL: urls.pooled,
    EMAIL_DRY_RUN: "1",
    NEXT_DIST_DIR: DIST_DIR_E2E,
    PW_PORT: String(PUERTO_E2E),
    E2E_SERVER: "dev",
    BETTER_AUTH_URL: origen,
    NEXT_PUBLIC_APP_URL: origen,
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

/** Playwright con CI=1: nunca reusa un server ajeno en el 3001 y reintenta como el CI. */
export function envDelPaso(paso, envBase) {
  return paso.e2e ? { ...envBase, CI: "1" } : envBase;
}

export function formatearDuracion(ms) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

// ---------------------------------------------------------------- I/O

function neon(args, { capturar = false } = {}) {
  return spawnSync("npx", ["--yes", NEONCTL, ...args], {
    shell: true,
    encoding: "utf8",
    stdio: capturar ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

function urlDe(salida) {
  const linea = (salida ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .reverse()
    .find((l) => /^postgres(ql)?:\/\//.test(l));
  return linea ?? null;
}

function puertoLibre(puerto) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(puerto, "127.0.0.1");
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function main(argv) {
  const opciones = parsearArgs(argv);
  if (opciones.error) {
    console.error(opciones.error);
    return 2;
  }

  const envLocal = existsSync(".env.local") ? parsearEnv(readFileSync(".env.local", "utf8")) : {};
  const base = { ...envLocal, ...process.env };
  const pasos = planDePasos(opciones);
  const necesitaBase = pasos.some((p) => p.base);
  const resultados = [];

  const correr = (paso, env) => {
    console.log(`\n▶ ${paso.nombre}  (npm run ${paso.script})`);
    const inicio = Date.now();
    const r = spawnSync("npm", ["run", paso.script], { shell: true, stdio: "inherit", env });
    const ok = r.status === 0;
    resultados.push({ nombre: paso.nombre, ok, ms: Date.now() - inicio });
    return ok;
  };

  for (const paso of pasos.filter((p) => !p.base)) {
    if (!correr(paso, base)) return resumen(resultados, 1);
  }
  if (!necesitaBase) return resumen(resultados, 0);

  const proyecto = base.NEON_PROJECT_ID;
  const padre = base.NEON_PARENT_BRANCH || PARENT_DEFAULT;
  if (!proyecto) {
    console.error("\nFalta NEON_PROJECT_ID en .env.local (el id del proyecto de Neon, no es secreto).");
    return resumen(resultados, 1);
  }
  if (!base.SEED_TEST_PASSWORD) {
    console.error("\nFalta SEED_TEST_PASSWORD en .env.local (la usan el seed demo y Playwright).");
    return resumen(resultados, 1);
  }
  if (neon(["me", "--output", "json"], { capturar: true }).status !== 0) {
    console.error("\nneonctl no tiene sesión. Corré `npx neonctl@4 auth` y aceptá en el navegador (espera 60 s).");
    return resumen(resultados, 1);
  }
  if (pasos.some((p) => p.e2e) && !(await puertoLibre(PUERTO_E2E))) {
    console.error(
      `\nEl puerto ${PUERTO_E2E} está ocupado. Si es un server de tests viejo, cerralo: Playwright ` +
        "tiene que levantar el suyo contra la branch efímera, no reusar uno que apunta a dev."
    );
    return resumen(resultados, 1);
  }

  const branch = nombreBranch();
  console.log(`\n▶ branch efímera ${branch} (hija de ${padre}, proyecto ${proyecto})`);
  const creada = neon(
    ["branches", "create", "--project-id", proyecto, "--name", branch, "--parent", padre, "--no-secrets", "--output", "json"],
    { capturar: true }
  );
  if (creada.status !== 0) {
    console.error((creada.stderr || creada.stdout || "").trim());
    return resumen(resultados, 1);
  }

  let codigo = 0;
  try {
    for (let i = 0; i < 30; i++) {
      const info = neon(["branches", "get", branch, "--project-id", proyecto, "--output", "json"], { capturar: true });
      const estado = (() => {
        try {
          const json = JSON.parse(info.stdout);
          return (json.branch ?? json).current_state;
        } catch {
          return null;
        }
      })();
      if (estado === "ready") break;
      await esperar(2000);
    }

    const conexion = (pooled) =>
      urlDe(
        neon(
          [
            "connection-string", branch, "--project-id", proyecto,
            "--database-name", base.NEON_DATABASE || "neondb",
            "--role-name", base.NEON_ROLE || "neondb_owner",
            ...(pooled ? ["--pooled"] : []),
          ],
          { capturar: true }
        ).stdout
      );
    const env = envDeCorrida(base, { pooled: conexion(true), directa: conexion(false) });

    for (const paso of pasos.filter((p) => p.base)) {
      if (!correr(paso, envDelPaso(paso, env))) {
        codigo = 1;
        // Como el CI: si falla la integración, igual se corre Playwright para
        // ver el cuadro completo. Si falla la preparación de la base, no.
        if (!["integración"].includes(paso.nombre)) break;
      }
    }
  } catch (err) {
    console.error(`\n${err instanceof Error ? err.message : err}`);
    codigo = 1;
  } finally {
    if (opciones.mantenerBranch) {
      console.log(`\n· La branch ${branch} queda (--mantener-branch). Borrala con: npx ${NEONCTL} branches delete ${branch} --project-id ${proyecto}`);
    } else {
      const borrada = neon(["branches", "delete", branch, "--project-id", proyecto], { capturar: true });
      console.log(borrada.status === 0 ? `\n· Branch ${branch} borrada.` : `\n⚠ No pude borrar la branch ${branch}: borrala a mano en Neon.`);
    }
  }
  return resumen(resultados, codigo);
}

function resumen(resultados, codigo) {
  console.log("\nResumen de ci:local");
  for (const r of resultados) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre.padEnd(20)} ${formatearDuracion(r.ms)}`);
  }
  console.log(codigo === 0 ? "\nTodo verde." : "\nHay pasos en rojo.");
  if (resultados.some((r) => r.nombre === "playwright" && !r.ok)) {
    console.log("Reporte y traces: npx playwright show-report");
  }
  return codigo;
}

const esteArchivo = fileURLToPath(import.meta.url);
const invocado = process.argv[1] ? path.resolve(process.argv[1]) : "";
const mismoArchivo =
  process.platform === "win32" ? invocado.toLowerCase() === esteArchivo.toLowerCase() : invocado === esteArchivo;

if (mismoArchivo) {
  main(process.argv.slice(2)).then((codigo) => process.exit(codigo));
}
