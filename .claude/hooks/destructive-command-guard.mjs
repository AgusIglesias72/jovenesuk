#!/usr/bin/env node
/**
 * Freno para comandos destructivos (PreToolUse sobre Bash y PowerShell). Sale
 * con código 2 (bloquea y le explica a Claude por qué) solo ante:
 *
 * - borrado recursivo (rm -r/-rf, Remove-Item -Recurse, rd /s) de algo que no
 *   esté en un directorio temporal (scratchpad de Claude, %TEMP%, /tmp) ni sea un
 *   artefacto regenerable (.next, node_modules, coverage, test-results,
 *   playwright-report, .turbo, tsconfig.tsbuildinfo);
 * - SQL destructivo (DROP TABLE/SCHEMA/DATABASE/COLUMN…, TRUNCATE) enviado desde
 *   la línea de comandos a algo que no sea un visor de texto (grep, git, cat…);
 * - drizzle-kit push/drop y `npm run db:push`: la base de desarrollo tiene
 *   datos reales del dueño y push aplica el schema sin migración;
 * - git push --force/-f/+refspec, git reset --hard y git clean -f: pierden
 *   trabajo, propio o de otras sesiones que comparten el working tree.
 *
 * Varios de estos también están en permissions.deny de settings.json. Van acá
 * además porque una regla deny no admite excepciones ("rm -rf salvo en el
 * scratchpad"), no ve variantes (git -C . push -f) y un patrón con DROP
 * bloquearía también un grep sobre las migraciones o un mensaje de commit.
 *
 * Es un freno contra errores, no una barrera contra alguien decidido a
 * saltearla. Si un comando bloqueado hace falta de verdad, lo corre el usuario.
 */
import os from "node:os";

import { leerPayload } from "./_comun.mjs";

const ARTEFACTOS_REGENERABLES = new Set([
  ".next",
  "node_modules",
  "coverage",
  "test-results",
  "playwright-report",
  ".turbo",
  "tsconfig.tsbuildinfo",
]);

const VISORES = new Set([
  "grep", "egrep", "fgrep", "rg", "git", "cat", "head", "tail", "less", "more", "sed", "awk",
  "echo", "printf", "wc", "sort", "uniq", "diff", "ls", "cd", "jq", "select-string", "sls",
  "get-content", "gc", "type", "findstr", "write-output", "write-host", "gh",
]);

const ENVOLTORIOS = new Set([
  "sudo", "env", "time", "nice", "nohup", "command", "builtin", "exec", "xargs", "&", "call",
]);

/** Parte el comando en subcomandos por ; && || | & y saltos de línea fuera de comillas. */
function subcomandos(comando) {
  const partes = [];
  let actual = "";
  let comilla = null;
  for (let i = 0; i < comando.length; i++) {
    const c = comando[i];
    if (comilla) {
      actual += c;
      if (c === comilla && comando[i - 1] !== "\\") comilla = null;
      continue;
    }
    if (c === '"' || c === "'") {
      comilla = c;
      actual += c;
      continue;
    }
    if (c === ";" || c === "\n" || c === "|" || c === "&") {
      // `2>&1` y `&>` no separan comandos.
      if (c === "&" && (comando[i - 1] === ">" || comando[i + 1] === ">")) {
        actual += c;
        continue;
      }
      partes.push(actual);
      actual = "";
      if ((c === "|" || c === "&") && comando[i + 1] === c) i++;
      continue;
    }
    actual += c;
  }
  partes.push(actual);
  return partes.map((p) => p.trim()).filter(Boolean);
}

function tokens(subcomando) {
  const salida = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
  for (const m of subcomando.matchAll(re)) salida.push(m[1] ?? m[2] ?? m[3] ?? "");
  return salida;
}

function programa(token) {
  const base = token.replace(/\\/g, "/").split("/").pop() ?? "";
  return base.toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, "");
}

/** Índice del programa real, salteando VAR=valor y envoltorios (sudo, env, npx…). */
function inicioDelComando(tks) {
  let i = 0;
  while (i < tks.length) {
    const t = tks[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t) || ENVOLTORIOS.has(programa(t))) {
      i++;
      continue;
    }
    if (programa(t) === "timeout") {
      i += 2;
      continue;
    }
    if (programa(t) === "npx" || programa(t) === "bunx") {
      i++;
      while (i < tks.length && tks[i].startsWith("-")) i++;
      continue;
    }
    break;
  }
  return i;
}

const TEMPORALES = [
  os.tmpdir(),
  process.env.TEMP,
  process.env.TMP,
  process.env.TMPDIR,
]
  .filter(Boolean)
  .map((p) => normalizar(p));

function normalizar(p) {
  let r = p.replace(/\\/g, "/").toLowerCase();
  const msys = /^\/([a-z])\/(.*)$/.exec(r);
  if (msys) r = `${msys[1]}:/${msys[2]}`;
  return r.replace(/\/+$/, "");
}

function destinoPermitido(destino) {
  const d = normalizar(destino.trim());
  if (!d || d.includes("..")) return false;
  if (/^(\$\{?(tmpdir|temp|tmp)\}?|\$env:(temp|tmp)|%(temp|tmp)%)(\/|$)/.test(d)) return true;
  if (d === "/tmp" || d.startsWith("/tmp/")) return true;
  if (d.includes("/appdata/local/temp/")) return true;
  if (TEMPORALES.some((t) => d === t || d.startsWith(`${t}/`))) return true;
  if (/[*?[\]{}$`]/.test(d)) return false;
  const ultimo = d.replace(/^\.\//, "").split("/").pop() ?? "";
  return ARTEFACTOS_REGENERABLES.has(ultimo);
}

function revisarBorrado(tks, i) {
  const prog = programa(tks[i] ?? "");
  const resto = tks.slice(i + 1);
  let recursivo = false;
  const destinos = [];

  if (prog === "rm") {
    for (const t of resto) {
      if (t === "--") continue;
      if (t === "--recursive" || /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(t)) recursivo = true;
      else if (!t.startsWith("-")) destinos.push(t);
    }
  } else if (["remove-item", "ri", "del", "erase", "rmdir", "rd"].includes(prog)) {
    const cmdStyle = prog === "rmdir" || prog === "rd" || prog === "del" || prog === "erase";
    for (const t of resto) {
      // PowerShell acepta cualquier prefijo del parámetro: -r, -Rec, -Recu…
      if (/^-r(e(c(u(r(se?)?)?)?)?)?$/i.test(t) || (cmdStyle && /^\/s$/i.test(t))) recursivo = true;
      else if (/^-(path|literalpath)$/i.test(t)) continue;
      else if (!t.startsWith("-") && !(cmdStyle && /^\/[a-z]$/i.test(t))) destinos.push(t);
    }
  } else {
    return null;
  }

  if (!recursivo || destinos.length === 0) return null;
  const prohibidos = destinos.filter((d) => !destinoPermitido(d));
  if (prohibidos.length === 0) return null;
  return (
    `borrado recursivo de ${prohibidos.map((d) => `"${d}"`).join(", ")}, que no está en un directorio temporal. ` +
    `Solo se borra en recursivo dentro del scratchpad/%TEMP% (ruta literal o con prefijo $TMPDIR, $TEMP, $env:TEMP o %TEMP%; ` +
    `cualquier otra variable se bloquea porque no se puede resolver) o artefactos regenerables (.next, node_modules, coverage…). ` +
    `Para un archivo del proyecto usá la herramienta de edición o pedile al usuario que lo borre.`
  );
}

function revisarGit(tks, i) {
  if (programa(tks[i] ?? "") !== "git") return null;
  let j = i + 1;
  while (j < tks.length && tks[j].startsWith("-")) {
    if (tks[j] === "-C" || tks[j] === "-c") j++;
    j++;
  }
  const sub = tks[j];
  const resto = tks.slice(j + 1);
  if (sub === "push" && resto.some((t) => t === "-f" || t.startsWith("--force") || /^-[a-z]*f[a-z]*$/.test(t) || /^\+/.test(t))) {
    return "git push forzado reescribe la historia remota. Pusheá sin --force; si hace falta, que lo decida y lo corra el usuario.";
  }
  if (sub === "reset" && resto.includes("--hard")) {
    return "git reset --hard descarta cambios sin commitear (tuyos o de otras sesiones sobre el mismo working tree). Usá git stash o pedile al usuario.";
  }
  if (sub === "clean" && resto.some((t) => t === "--force" || /^-[a-z]*f[a-z]*$/i.test(t))) {
    return "git clean -f borra archivos sin trackear (con -x también .env.local). Pedile al usuario que lo corra si hace falta.";
  }
  return null;
}

function revisarDrizzle(tks, i) {
  const prog = programa(tks[i] ?? "");
  const resto = tks.slice(i + 1);
  // `npx drizzle-kit@latest push` llega como programa "drizzle-kit@latest".
  const esDrizzleKit = (t) => programa(t) === "drizzle-kit" || programa(t).startsWith("drizzle-kit@");
  const viaDrizzleKit =
    esDrizzleKit(tks[i] ?? "") || (["npm", "pnpm", "yarn", "bun"].includes(prog) && resto.some(esDrizzleKit));
  if (viaDrizzleKit && resto.some((t) => t === "push" || t === "drop")) {
    return "drizzle-kit push/drop cambia la base sin migración (y la de desarrollo tiene datos reales). Usá /juk-migracion: db:generate + db:migrate.";
  }
  if (["npm", "pnpm", "yarn", "bun"].includes(prog) && resto.includes("db:push")) {
    return "npm run db:push aplica el schema sin migración sobre una base con datos reales. Usá /juk-migracion: db:generate + db:migrate.";
  }
  return null;
}

/** `bash -c "…"`, `cmd /c …`, `powershell -Command "…"`: el comando de adentro. */
function comandoInterno(tks, i) {
  const prog = programa(tks[i] ?? "");
  const siguiente = tks[i + 1] ?? "";
  if (["sh", "bash", "zsh"].includes(prog) && siguiente === "-c") return tks.slice(i + 2).join(" ");
  if (prog === "cmd" && /^\/[ck]$/i.test(siguiente)) return tks.slice(i + 2).join(" ");
  if (prog === "powershell" || prog === "pwsh") {
    const k = tks.findIndex((t, j) => j > i && /^-(c|command)$/i.test(t));
    if (k > 0) return tks.slice(k + 1).join(" ");
  }
  return null;
}

const SQL_DESTRUCTIVO =
  /\b(drop\s+(table|schema|database|view|materialized\s+view|index|type|sequence|column|constraint|owned|role|user)\b|truncate\s+(table\s+)?["\w])/i;

function revisar(comando) {
  const subs = subcomandos(comando);
  for (const sub of subs) {
    const tks = tokens(sub);
    if (tks.length === 0) continue;
    const i = inicioDelComando(tks);
    const interno = comandoInterno(tks, i);
    if (interno) {
      const motivoInterno = revisar(interno);
      if (motivoInterno) return motivoInterno;
      continue;
    }
    const motivo =
      revisarBorrado(tks, i) ??
      revisarGit(tks, i) ??
      revisarDrizzle(tks, i) ??
      (() => {
        const k = tks.findIndex((t) => t === "-exec" || t === "-execdir" || t === "-ok");
        return k >= 0 ? revisarBorrado(tks, k + 1) : null;
      })();
    if (motivo) return motivo;
  }
  if (SQL_DESTRUCTIVO.test(comando)) {
    const soloVisores = subs.every((sub) => {
      const tks = tokens(sub);
      return tks.length === 0 || VISORES.has(programa(tks[inicioDelComando(tks)] ?? ""));
    });
    if (!soloVisores) {
      return "SQL destructivo (DROP/TRUNCATE) mandado a la base desde la terminal. Los cambios de estructura van por migración (/juk-migracion) y los borrados de datos los confirma el usuario.";
    }
  }
  return null;
}

const payload = await leerPayload();
const comando = payload?.tool_input?.command;
if (typeof comando !== "string" || !comando.trim()) process.exit(0);

let motivo = null;
try {
  motivo = revisar(comando);
} catch {
  process.exit(0);
}
if (!motivo) process.exit(0);

console.error(`Bloqueado por .claude/hooks/destructive-command-guard.mjs: ${motivo}`);
process.exit(2);
