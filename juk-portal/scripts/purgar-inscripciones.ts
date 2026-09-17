#!/usr/bin/env node
/**
 * Corre la purga por retención a mano (MIN-16).
 *
 * Vacía los datos personales de las inscripciones fuera de plazo y borra el
 * hash del token de las invitaciones vencidas que nadie usó. La lógica está en
 * `src/lib/jobs/purgar-inscripciones.ts`; acá solo se la invoca y se imprime el
 * resumen.
 *
 * Existe porque Trigger.dev todavía no está desplegado (docs/estado-actual.md
 * §7) y la política publicada promete estos plazos igual. El día que Trigger
 * exista, el task lo llama al mismo job y este script sigue sirviendo para
 * correrlo fuera de horario o para verificarlo.
 *
 * Uso (desde juk-portal/):
 *   npm run job:purga
 *
 * Lee `.env.local` solo (no hace falta sourcearlo en la shell) y no pisa lo que
 * ya esté en el entorno: en un runner, DATABASE_URL viene inyectada y manda.
 *
 * ⚠️ Escribe sobre la base a la que apunte DATABASE_URL, y lo que se purga NO se
 * recupera: por eso imprime a qué host apunta y desde qué fechas barre ANTES de
 * tocar una fila.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { formatFecha } from "@/lib/utils/date";

const RAIZ = process.cwd();

/** Mismo loader que `tests/integration/setup.ts`: no pisa lo ya definido. */
function cargarEnvLocal(): void {
  try {
    const contenido = readFileSync(path.resolve(RAIZ, ".env.local"), "utf8");
    for (const linea of contenido.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linea);
      if (m && m[1] && process.env[m[1]] === undefined) {
        process.env[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // sin .env.local (CI, o el entorno ya cargado en la shell): seguir.
  }
}

/** El host, para que se vea contra qué base se está por escribir. Nunca la credencial. */
function hostDe(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(no pude leer el host)";
  }
}

async function main(): Promise<number> {
  cargarEnvLocal();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("\nFalta DATABASE_URL (en .env.local o en el entorno): la purga no puede correr.\n");
    return 1;
  }

  // El import es perezoso a propósito: `@/lib/db` lanza al evaluarse sin
  // DATABASE_URL, así que primero se carga el entorno y recién después el job.
  const { purgarPorRetencion } = await import("@/lib/jobs/purgar-inscripciones");
  const { RETENCION, fechaDeCorte } = await import("@/lib/domain/privacidad/retencion");

  const ahora = new Date();

  console.log(`\nPurga por retención · base ${hostDe(url)}`);
  console.log(`Corrida del ${formatFecha(ahora)}\n`);
  console.log("Se purga todo lo anterior a:");
  console.log(
    `  · inscripciones ya volcadas a un alumno (${RETENCION.inscripcion_procesada.dias} días): ` +
      formatFecha(fechaDeCorte("inscripcion_procesada", ahora))
  );
  console.log(
    `  · inscripciones sin procesar (${RETENCION.inscripcion_sin_procesar.dias} días): ` +
      formatFecha(fechaDeCorte("inscripcion_sin_procesar", ahora))
  );
  console.log(
    `  · invitaciones vencidas sin usar (${RETENCION.invitacion_sin_usar.dias} días desde el vencimiento): ` +
      formatFecha(fechaDeCorte("invitacion_sin_usar", ahora))
  );
  console.log("");

  const resumen = await purgarPorRetencion(ahora);

  console.log(`Inscripciones purgadas (datos personales vaciados): ${resumen.inscripcionesPurgadas}`);
  console.log(`Invitaciones limpiadas (token borrado):             ${resumen.invitacionesLimpiadas}`);
  console.log(
    "\nLas filas siguen existiendo: queda el talón (número, estado, variante, fechas y campaña)\n" +
      "para que las métricas no cambien hacia atrás. Detalle: docs/prd/ y OPEN_DECISIONS.md (MIN-16).\n"
  );

  return 0;
}

main().then(
  (codigo) => process.exit(codigo),
  (err: unknown) => {
    console.error("\nLa purga falló:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
);
