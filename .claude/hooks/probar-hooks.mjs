#!/usr/bin/env node
/**
 * Prueba de los hooks del harness. NO es un hook (no está en settings.json).
 *
 *   node .claude/hooks/probar-hooks.mjs
 *
 * Corre cada hook como lo corre Claude Code (JSON por stdin, se mira el código
 * de salida y lo que escribe) contra casos que tienen que avisar/bloquear y
 * casos que tienen que salir en silencio. Los hooks que leen archivos o git
 * corren sobre una COPIA en un repo temporal: la prueba no toca el repo real.
 *
 * Correla después de cambiar cualquier hook. Sale con código 1 si falla algo.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOOKS_REALES = path.dirname(fileURLToPath(import.meta.url));
const REPO_REAL = path.resolve(HOOKS_REALES, "..", "..");

const tmp = mkdtempSync(path.join(os.tmpdir(), "juk-hooks-test-"));
const repo = path.join(tmp, "repo");
const app = path.join(repo, "juk-portal");
const hooks = path.join(repo, ".claude", "hooks");

function escribir(rel, contenido) {
  const destino = path.join(repo, rel);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, contenido);
  return destino;
}

function git(...args) {
  const r = spawnSync("git", ["-c", "user.email=hooks@test", "-c", "user.name=hooks", ...args], {
    cwd: repo,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
}

mkdirSync(hooks, { recursive: true });
for (const f of readdirSync(HOOKS_REALES)) {
  if (f.endsWith(".mjs")) cpSync(path.join(HOOKS_REALES, f), path.join(hooks, f));
}
mkdirSync(path.join(app, "scripts"), { recursive: true });
cpSync(
  path.join(REPO_REAL, "juk-portal", "scripts", "check-test-companions.mjs"),
  path.join(app, "scripts", "check-test-companions.mjs"),
);
cpSync(path.join(REPO_REAL, "juk-portal", "OPEN_DECISIONS.md"), path.join(app, "OPEN_DECISIONS.md"));
escribir("juk-portal/README.md", "base\n");
git("init", "-q");
git("add", "-A");
git("commit", "-q", "-m", "base");

let fallas = 0;
let total = 0;
const sesion = () => `test-${Math.random().toString(36).slice(2)}`;

function correr(hook, payload, env = {}, hooksDir = hooks) {
  const entrada = typeof payload === "string" ? payload : JSON.stringify(payload);
  return spawnSync(process.execPath, [path.join(hooksDir, hook)], {
    input: entrada,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 30_000,
  });
}

function caso(nombre, r, { codigo, contiene, silencio }) {
  total++;
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const errores = [];
  if (r.status !== codigo) errores.push(`código ${r.status}, esperaba ${codigo}`);
  if (contiene && !salida.includes(contiene)) errores.push(`no dice "${contiene}"`);
  if (silencio && salida.trim()) errores.push(`esperaba silencio y escribió: ${salida.trim().slice(0, 200)}`);
  if (errores.length) {
    fallas++;
    console.log(`  FALLA  ${nombre}: ${errores.join("; ")}`);
  } else {
    console.log(`  ok     ${nombre}`);
  }
}

const edit = (rutaAbs, session_id = sesion()) => ({
  session_id,
  hook_event_name: "PostToolUse",
  tool_name: "Edit",
  tool_input: { file_path: rutaAbs },
});

console.log("domain-purity-check");
{
  const casos = [
    ["import de efecto server-only", 'import "server-only";\nexport const a = 1;\n', 2],
    ["next/headers", 'import { headers } from "next/headers";\nexport const a = 1;\n', 2],
    ["drizzle-orm", 'import { eq } from "drizzle-orm";\nexport const a = eq;\n', 2],
    ["import type de @/lib/db/schema", 'import type { Alumno } from "@/lib/db/schema/alumnos";\nexport type A = Alumno;\n', 2],
    ["export from @/app", 'export { x } from "@/app/(admin)/foo";\n', 2],
    ["import() dinámico de react", 'export const cargar = () => import("react");\n', 2],
    [
      "limpio, con los nombres prohibidos solo en comentarios",
      '/** Replica los enums de `@/lib/db/schema/colegios`. */\n// no importar "next"\nimport { z } from "zod";\nexport const url = "https://www.gov.uk/eta";\nexport const s = z.string();\n',
      0,
    ],
  ];
  casos.forEach(([nombre, codigo, esperado], i) => {
    const archivo = escribir(`juk-portal/src/lib/domain/prueba/caso-${i}.ts`, codigo);
    caso(nombre, correr("domain-purity-check.mjs", edit(archivo)), {
      codigo: esperado,
      ...(esperado === 2 ? { contiene: "ADR-005" } : { silencio: true }),
    });
  });
  const test = escribir("juk-portal/src/lib/domain/prueba/caso.test.ts", 'import "next/headers";\n');
  caso("un *.test.ts no se revisa", correr("domain-purity-check.mjs", edit(test)), { codigo: 0, silencio: true });
  const query = escribir("juk-portal/src/lib/db/queries/prueba.ts", 'import { eq } from "drizzle-orm";\n');
  caso("drizzle en queries/ está bien", correr("domain-purity-check.mjs", edit(query)), { codigo: 0, silencio: true });
  caso("JSON roto → silencio", correr("domain-purity-check.mjs", "{no es json"), { codigo: 0, silencio: true });
  caso("sin stdin → silencio", correr("domain-purity-check.mjs", ""), { codigo: 0, silencio: true });
}

console.log("gated-module-warning");
{
  const s = sesion();
  const cuotas = path.join(app, "src/lib/domain/cuotas/schema.ts");
  caso("cuotas avisa CRIT-05", correr("gated-module-warning.mjs", edit(cuotas, s)), { codigo: 0, contiene: "CRIT-05" });
  caso("misma sesión → no repite", correr("gated-module-warning.mjs", edit(cuotas, s)), { codigo: 0, silencio: true });
  caso(
    "*.test.ts no avisa",
    correr("gated-module-warning.mjs", edit(path.join(app, "src/lib/domain/cuotas/schema.test.ts"))),
    { codigo: 0, silencio: true },
  );
  caso(
    "spec E2E no avisa",
    correr("gated-module-warning.mjs", edit(path.join(app, "tests/e2e/cuotas.spec.ts"))),
    { codigo: 0, silencio: true },
  );
  caso(
    "pantalla de pagos avisa CRIT-05",
    correr("gated-module-warning.mjs", edit(path.join(app, "src/app/(admin)/pagos/page.tsx"))),
    { codigo: 0, contiene: "CRIT-05" },
  );
  caso(
    "excursiones avisa CRIT-04",
    correr("gated-module-warning.mjs", edit(path.join(app, "src/lib/domain/pasos-viaje/metadata.ts"))),
    { codigo: 0, contiene: "CRIT-04" },
  );
  caso(
    "panel de pasos del viaje avisa CRIT-04",
    correr("gated-module-warning.mjs", edit(path.join(app, "src/app/(admin)/viajes/[id]/pasos-viaje-panel.tsx"))),
    { codigo: 0, contiene: "CRIT-04" },
  );
  caso(
    "archivo sin decisión → silencio",
    correr("gated-module-warning.mjs", edit(path.join(app, "src/lib/domain/viajes/schema.ts"))),
    { codigo: 0, silencio: true },
  );
  escribir("juk-portal/OPEN_DECISIONS.md", "| **CRIT-05** Moneda de cuotas | Multi-moneda, validado |\n");
  caso(
    "decisión validada (sin ⭐) → deja de avisar",
    correr("gated-module-warning.mjs", edit(cuotas)),
    { codigo: 0, silencio: true },
  );
}

console.log("schema-change-reminder");
{
  caso(
    "schema de cuotas recuerda la migración",
    correr("schema-change-reminder.mjs", edit(path.join(app, "src/lib/db/schema/cuotas.ts"))),
    { codigo: 0, contiene: "drizzle-kit generate --custom" },
  );
  caso(
    "schema/index.ts → silencio",
    correr("schema-change-reminder.mjs", edit(path.join(app, "src/lib/db/schema/index.ts"))),
    { codigo: 0, silencio: true },
  );
}

console.log("test-companion-check");
{
  const logica = escribir("juk-portal/src/lib/domain/prueba/logica.ts", "export function doble(n: number) {\n  return n * 2;\n}\n");
  caso("lógica sin test → avisa con el nombre", correr("test-companion-check.mjs", edit(logica)), {
    codigo: 0,
    contiene: "src/lib/domain/prueba/logica.test.ts",
  });
  const conTest = escribir("juk-portal/src/lib/utils/con-test.ts", "export const f = () => 1;\n");
  escribir("juk-portal/src/lib/utils/con-test.test.ts", "// test\n");
  caso("con test al lado → silencio", correr("test-companion-check.mjs", edit(conTest)), { codigo: 0, silencio: true });
  const barrel = escribir("juk-portal/src/lib/domain/prueba/index.ts", 'export * from "./logica";\n');
  caso("index.ts exento → silencio", correr("test-companion-check.mjs", edit(barrel)), { codigo: 0, silencio: true });
  const tipos = escribir("juk-portal/src/lib/domain/prueba/tipos-sueltos.ts", "export type A = { n: number };\n");
  caso("solo tipos → silencio", correr("test-companion-check.mjs", edit(tipos)), { codigo: 0, silencio: true });
  const accion = escribir("juk-portal/src/lib/actions/compartida.ts", "export async function hacer() {}\n");
  caso("src/lib/actions sin test → avisa", correr("test-companion-check.mjs", edit(accion)), {
    codigo: 0,
    contiene: "compartida.test.ts",
  });
  const pantalla = escribir("juk-portal/src/app/prueba/page.tsx", "export default function P() { return null; }\n");
  caso("src/app no entra en el contrato → silencio", correr("test-companion-check.mjs", edit(pantalla)), {
    codigo: 0,
    silencio: true,
  });
}

console.log("docs-sync-reminder");
{
  git("add", "-A");
  git("commit", "-q", "-m", "fixtures");
  const stop = (session_id, extra = {}) => ({ session_id, hook_event_name: "Stop", stop_hook_active: false, ...extra });

  caso("working tree limpio → silencio", correr("docs-sync-reminder.mjs", stop(sesion())), { codigo: 0, silencio: true });

  escribir("juk-portal/src/lib/domain/prueba/solo.test.ts", "// cambio solo en un test\n");
  caso("solo tests cambiados → silencio", correr("docs-sync-reminder.mjs", stop(sesion())), { codigo: 0, silencio: true });

  escribir("juk-portal/src/lib/domain/prueba/nueva-regla.ts", "export const regla = 1;\n");
  const s = sesion();
  caso("código sin docs → recuerda (exit 2)", correr("docs-sync-reminder.mjs", stop(s)), {
    codigo: 2,
    contiene: "Regla de sincronía",
  });
  caso("misma sesión, mismos archivos → no repite", correr("docs-sync-reminder.mjs", stop(s)), {
    codigo: 0,
    silencio: true,
  });
  escribir("juk-portal/src/app/prueba/otra/page.tsx", "export default function P() { return null; }\n");
  caso("aparece otro archivo → vuelve a recordar", correr("docs-sync-reminder.mjs", stop(s)), {
    codigo: 2,
    contiene: "docs/estado-actual.md",
  });
  caso(
    "stop_hook_active → silencio",
    correr("docs-sync-reminder.mjs", stop(sesion(), { stop_hook_active: true })),
    { codigo: 0, silencio: true },
  );
  caso(
    "JUK_DOCS_SYNC=off → silencio",
    correr("docs-sync-reminder.mjs", stop(sesion()), { JUK_DOCS_SYNC: "off" }),
    { codigo: 0, silencio: true },
  );
  escribir("juk-portal/CHANGELOG.md", "## [Sin publicar]\n- prueba\n");
  caso("con CHANGELOG tocado → silencio", correr("docs-sync-reminder.mjs", stop(sesion())), {
    codigo: 0,
    silencio: true,
  });
  const fueraDeRepo = path.join(tmp, "sin-repo", ".claude", "hooks");
  mkdirSync(fueraDeRepo, { recursive: true });
  for (const f of ["docs-sync-reminder.mjs", "_comun.mjs"]) cpSync(path.join(hooks, f), path.join(fueraDeRepo, f));
  caso(
    "fuera de un repo git → silencio",
    correr("docs-sync-reminder.mjs", stop(sesion()), { GIT_CEILING_DIRECTORIES: tmp }, fueraDeRepo),
    { codigo: 0, silencio: true },
  );
}

console.log("destructive-command-guard");
{
  const scratch = path.join(os.tmpdir(), "claude", "scratchpad", "tw");
  const bash = (command) => ({ session_id: sesion(), hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } });
  const ps = (command) => ({ ...bash(command), tool_name: "PowerShell" });
  const bloqueados = [
    bash("rm -rf juk-portal/drizzle"),
    bash("rm -rf /"),
    bash("cd juk-portal && rm -rf src"),
    bash("rm -r -f ~/proyectos"),
    bash('find . -name "*.ts" -exec rm -rf {} \\;'),
    bash("npm run db:push"),
    bash("npx drizzle-kit push"),
    bash("npm exec drizzle-kit drop"),
    bash("git push --force origin main"),
    bash("git push -f"),
    bash("git -C . push origin +main"),
    bash("git reset --hard HEAD~1"),
    bash("git clean -fdx"),
    bash('psql "$DATABASE_URL" -c "DROP TABLE alumnos"'),
    bash('npx tsx -e "await db.execute(sql`TRUNCATE cuotas`)"'),
    ps("Remove-Item -Recurse -Force juk-portal\\src"),
    ps("Remove-Item -Rec -Force juk-portal\\src"),
    bash("npx drizzle-kit@latest push"),
    bash("npm exec drizzle-kit@0.30 drop"),
    bash('rm -rf "$S"'),
    ps("cmd /c rd /s /q juk-portal"),
    bash('bash -c "rm -rf juk-portal/src"'),
    ps('powershell -Command "Remove-Item -Recurse -Force juk-portal"'),
    ps("git push origin main --force-with-lease"),
  ];
  for (const p of bloqueados) {
    caso(`bloquea: ${p.tool_input.command}`, correr("destructive-command-guard.mjs", p), {
      codigo: 2,
      contiene: "Bloqueado",
    });
  }
  const permitidos = [
    bash(`rm -rf "${scratch}"`),
    bash("rm -rf /c/Users/alguien/AppData/Local/Temp/claude/abc/scratchpad/tw"),
    bash("rm -rf /tmp/juk-prueba"),
    bash("rm -rf .next"),
    bash("rm -rf juk-portal/node_modules juk-portal/coverage"),
    bash("rm archivo-suelto.txt"),
    bash("git push origin main"),
    bash("git push -u origin feat/x --follow-tags"),
    bash("git reset --soft HEAD~1"),
    bash("git log --oneline -12 && git diff --stat"),
    bash('git commit -m "fix(db): DROP TABLE vieja; rm -rf ya no hace falta"'),
    bash('grep -n "DROP TABLE" juk-portal/drizzle/*.sql'),
    bash("npm run db:migrate"),
    bash("npm run typecheck && npm run lint 2>&1 | tail -5"),
    bash('gh pr create --body "truncate del texto largo"'),
    ps("Remove-Item -Recurse -Force $env:TEMP\\juk-prueba"),
    bash('rm -rf "$TMPDIR/juk-prueba"'),
    ps("Remove-Item -Recurse -Force .next"),
    ps("Get-ChildItem juk-portal | Select-Object -First 5"),
    ps("cmd /c dir juk-portal"),
    bash('bash -c "npm run typecheck"'),
    { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: {} },
  ];
  for (const p of permitidos) {
    caso(`deja pasar: ${p.tool_input.command ?? "(sin comando)"}`, correr("destructive-command-guard.mjs", p), {
      codigo: 0,
      silencio: true,
    });
  }
}

rmSync(tmp, { recursive: true, force: true });
const dirEstado = path.join(os.tmpdir(), "juk-claude-hooks");
try {
  for (const f of readdirSync(dirEstado)) {
    if (f.includes("-test-")) rmSync(path.join(dirEstado, f), { force: true });
  }
} catch {
  // sin estado guardado: nada que limpiar
}
console.log(`\n${total - fallas}/${total} casos ok${fallas ? ` · ${fallas} FALLAS` : ""}`);
process.exitCode = fallas ? 1 : 0;
