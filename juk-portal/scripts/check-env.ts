#!/usr/bin/env node
/**
 * Qué está configurado y qué falta, desde la terminal.
 *
 * Lee `.env.local` (más lo que ya esté en el entorno) y lo evalúa contra el
 * catálogo de `src/lib/domain/configuracion/env.ts`, el mismo que alimenta la
 * tarjeta "Estado de servicios" de /configuracion. Detecta tres cosas:
 *
 *   ✗ falta        una variable sin la que algo no anda en este perfil;
 *   ⚠ placeholder  quedó el valor de `.env.example` (peor que faltar: una
 *                  RESEND_API_KEY de ejemplo apaga el dry-run y rompe envíos);
 *   ⚠ prohibida    algo que aflojaría producción (EMAIL_DRY_RUN, el tweaker).
 *
 * Uso (desde juk-portal/):
 *   npm run check:env                 perfil local (lo que necesitás para desarrollar)
 *   npm run check:env:prod            perfil producción (lo que tiene que estar en Vercel)
 *   npx tsx scripts/check-env.ts --prod --env <archivo>
 *   npx tsx scripts/check-env.ts --soft      nunca falla (solo informa)
 *   npx tsx scripts/check-env.ts --nombres   evalúa solo si la variable EXISTE
 *
 * En PowerShell los flags van por `npx tsx …`: el `--` de `npm run … -- --flag` se pierde.
 *
 * `--nombres` existe por `vercel env pull`: Vercel devuelve los nombres con el
 * valor VACÍO (no deja leer variables encriptadas desde el CLI). Sin este modo,
 * ese archivo diría que falta todo. Se activa solo al detectarlo.
 *
 * Sale con código 1 si hay errores para el perfil pedido. Nunca imprime valores.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  evaluarEntorno,
  SERVICIOS_ENV,
  SERVICIO_LABELS,
  VARIABLES_ENV,
  type Evaluacion,
  type PerfilEnv,
} from "@/lib/domain/configuracion/env";

const args = process.argv.slice(2);
const perfil: PerfilEnv = args.includes("--prod") ? "produccion" : "local";
const soft = args.includes("--soft");
const forzarNombres = args.includes("--nombres");
const archivoEnv = (() => {
  const i = args.indexOf("--env");
  return i >= 0 && args[i + 1] ? args[i + 1]! : ".env.local";
})();

const RAIZ = process.cwd();

/**
 * Parser mínimo de .env: NOMBRE=valor, con comillas opcionales. Con
 * `incluirComentadas` toma también las líneas `# NOMBRE=…`, que en la plantilla
 * son las opcionales: están documentadas, no ausentes.
 */
export function parsearEnv(contenido: string, incluirComentadas = false): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const linea of contenido.split(/\r?\n/)) {
    const patron = incluirComentadas
      ? /^\s*#?\s*([A-Z0-9_]+)\s*=\s*(.*)$/
      : /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/;
    const m = patron.exec(linea);
    if (!m) continue;
    const [, nombre, crudo = ""] = m;
    vars[nombre!] = crudo.trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

function leerArchivo(relativo: string, incluirComentadas = false): Record<string, string> | null {
  // resolve, no join: `--env` acepta una ruta absoluta (ej. el archivo que baja
  // `vercel env pull` a un directorio temporal, fuera del repo).
  const ruta = path.resolve(RAIZ, relativo);
  if (!existsSync(ruta)) return null;
  return parsearEnv(readFileSync(ruta, "utf8"), incluirComentadas);
}

const MARCA = { ok: "✓", aviso: "⚠", error: "✗", neutro: "·" } as const;

function marcaDe(v: Evaluacion): string {
  if (v.estado === "ok" && !v.prohibida) return MARCA.ok;
  if (v.severidad === "error") return MARCA.error;
  if (v.severidad === "aviso") return MARCA.aviso;
  return MARCA.neutro;
}

function lineaDe(v: Evaluacion): string {
  if (v.estado === "ok" && !v.prohibida) return `  ${MARCA.ok} ${v.nombre}`;
  const nota = v.prohibida
    ? "seteada donde no debería"
    : v.estado === "placeholder"
      ? "quedó el valor de ejemplo"
      : v.nivel === "opcional"
        ? "sin setear (opcional)"
        : "falta";
  return `  ${marcaDe(v)} ${v.nombre} — ${nota}`;
}

function main(): number {
  const delArchivo = leerArchivo(archivoEnv);
  if (!delArchivo && perfil === "local") {
    console.log(`No encontré ${archivoEnv} en ${RAIZ}.`);
    console.log("Arrancá con: cp .env.example .env.local\n");
  }

  // Un archivo con varias variables del catálogo declaradas y vacías es lo que
  // deja `vercel env pull`: los nombres están, los valores no se pueden leer.
  const vaciasDelCatalogo = delArchivo
    ? VARIABLES_ENV.filter((v) => v.nombre in delArchivo && !delArchivo[v.nombre]).length
    : 0;
  const modoNombres = forzarNombres || vaciasDelCatalogo >= 3;

  const delArchivoUsable =
    delArchivo && modoNombres
      ? Object.fromEntries(Object.entries(delArchivo).map(([k, v]) => [k, v || "(definida)"]))
      : delArchivo;

  const env: Record<string, string | undefined> = { ...process.env, ...(delArchivoUsable ?? {}) };
  const resumen = evaluarEntorno(env, perfil);
  const porNombre = new Map(resumen.variables.map((v) => [v.nombre, v]));

  console.log(
    `\nPerfil: ${perfil === "produccion" ? "producción (lo que va en Vercel)" : "local"}` +
      `${delArchivo ? ` · leído ${archivoEnv}` : " · solo variables del entorno"}\n`
  );

  if (modoNombres) {
    console.log(
      "Modo nombres: el archivo trae las variables sin valor (es lo que devuelve\n" +
        "`vercel env pull`: Vercel no deja leer las encriptadas). Se chequea que la\n" +
        "variable EXISTA, no qué dice. Un valor de ejemplo cargado allá no se detecta.\n"
    );
  }

  for (const servicio of SERVICIOS_ENV) {
    const suyas = resumen.variables.filter((v) => v.servicio === servicio);
    const estado = suyas.some((v) => v.severidad === "error")
      ? MARCA.error
      : suyas.some((v) => v.severidad === "aviso")
        ? MARCA.aviso
        : MARCA.ok;
    console.log(`${estado} ${SERVICIO_LABELS[servicio]}`);
    for (const v of suyas) console.log(lineaDe(v));
    console.log("");
  }

  const errores = resumen.variables.filter((v) => v.severidad === "error");
  const avisos = resumen.variables.filter((v) => v.severidad === "aviso");

  if (errores.length > 0) {
    console.log("QUE TENÉS QUE RESOLVER:");
    for (const v of errores) {
      console.log(`  ✗ ${v.nombre}${v.prohibida ? " (no debería estar seteada acá)" : ""}`);
      console.log(`      ${v.prohibida ? "Aflojaría una protección de producción." : v.siFalta}`);
    }
    console.log("");
  }

  if (avisos.length > 0) {
    console.log("AVISOS (no frenan el desarrollo):");
    for (const v of avisos) console.log(`  ⚠ ${v.nombre} — ${v.siFalta}`);
    console.log("");
  }

  // La plantilla y el catálogo tienen que coincidir: si divergen, el próximo
  // que clone el repo arranca con un .env.local incompleto.
  const plantilla = leerArchivo(".env.example", true);
  if (plantilla) {
    const enPlantilla = new Set(Object.keys(plantilla));
    const faltanEnPlantilla = VARIABLES_ENV.filter(
      (v) => v.enPlantilla && !enPlantilla.has(v.nombre)
    ).map((v) => v.nombre);
    const sobranEnPlantilla = [...enPlantilla].filter((n) => !porNombre.has(n));
    if (faltanEnPlantilla.length > 0 || sobranEnPlantilla.length > 0) {
      console.log("PLANTILLA DESALINEADA (.env.example vs. el catálogo):");
      if (faltanEnPlantilla.length > 0) console.log(`  faltan: ${faltanEnPlantilla.join(", ")}`);
      if (sobranEnPlantilla.length > 0) console.log(`  sobran: ${sobranEnPlantilla.join(", ")}`);
      console.log("  El catálogo manda: src/lib/domain/configuracion/env.ts\n");
    }
  }

  console.log(
    resumen.ok
      ? `Listo: el entorno alcanza para el perfil ${perfil}.` +
          (avisos.length > 0 ? ` Quedan ${avisos.length} avisos.` : "")
      : `Faltan ${errores.length} variables para el perfil ${perfil}.`
  );
  console.log("Paso a paso de cada servicio: docs/setup-servicios.md\n");

  return resumen.ok || soft ? 0 : 1;
}

process.exit(main());
