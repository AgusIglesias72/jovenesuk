#!/usr/bin/env node
/**
 * Aviso (no bloquea) al editar código de un área cuya regla de negocio se
 * decidió con ⭐ en OPEN_DECISIONS.md: decidida para desarrollo, pendiente de
 * validar con el equipo.
 *
 * - CRIT-04 excursiones: el representante aprueba o rechaza.
 * - CRIT-05 cuotas: multi-moneda, default USD.
 *
 * El aviso NO dice "no avances": dice "codeá con la regla, pero acotada y fácil
 * de revertir", porque si el equipo decide distinto el cambio tiene que ser
 * chico.
 *
 * PostToolUse (Edit|Write|MultiEdit). Reglas para que no sea ruido:
 * - solo archivos .ts/.tsx de juk-portal/src/, nunca *.test.ts ni *.spec.ts;
 * - una vez por sesión por decisión;
 * - relee OPEN_DECISIONS.md: si la línea de esa decisión ya no tiene ⭐ (el
 *   equipo la validó), el aviso deja de salir solo.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { APP_DIR, emitirContexto, esTest, leerPayload, primeraVez, rutaEnApp } from "./_comun.mjs";

const DECISIONES = [
  {
    id: "CRIT-04",
    // Las excursiones no tienen archivo propio: viven en los pasos del viaje
    // (domain/pasos-viaje/, queries y schema pasos-viaje.ts, viajes/[id]/pasos-viaje-panel.tsx).
    patrones: [/excursion/, /pasos-viaje/, /actividad[-_]viaje/, /solicitud[-_]cambio/],
    regla:
      "excursiones: aprueba el representante (estado aprobada_representante). Como la Vista del Representante " +
      "no existe, hoy el admin carga ese estado a mano, sin nota obligatoria. Las solicitudes de cambio son un " +
      "mecanismo aparte. Estados en src/lib/domain/pasos-viaje/metadata.ts (EXCURSION_ESTADOS).",
  },
  {
    id: "CRIT-05",
    patrones: [/cuota/, /(^|\/)pagos(\/|\.|-)/, /moneda/],
    regla:
      "cuotas multi-moneda (USD | GBP | ARS, default USD). No hardcodees la moneda: usá la de la cuota " +
      "y MONEDA_SIMBOLOS de src/lib/domain/cuotas/schema.ts.",
  },
];

function sigueConEstrella(id) {
  let texto;
  try {
    texto = readFileSync(path.join(APP_DIR, "OPEN_DECISIONS.md"), "utf8");
  } catch {
    return true;
  }
  const lineas = texto.split(/\r?\n/).filter((l) => l.includes(id));
  return lineas.length === 0 || lineas.some((l) => l.includes("⭐"));
}

const payload = await leerPayload();
const ruta = rutaEnApp(payload?.tool_input?.file_path);
if (!ruta || !ruta.startsWith("src/") || !/\.tsx?$/.test(ruta) || esTest(ruta)) process.exit(0);

const rutaMinuscula = ruta.toLowerCase();
const aplican = DECISIONES.filter(
  (d) =>
    d.patrones.some((re) => re.test(rutaMinuscula)) &&
    sigueConEstrella(d.id) &&
    primeraVez(payload, "gated-module-warning", d.id),
);
if (aplican.length === 0) process.exit(0);

emitirContexto(
  "PostToolUse",
  `Decisión ⭐ en juego (tomada el 11/06/2026, falta validarla con el equipo):\n` +
    aplican.map((d) => `  • ${d.id}: ${d.regla}`).join("\n") +
    `\nNo frena nada: codeá con esa regla, pero mantenela acotada y fácil de revertir ` +
    `(constantes y funciones del dominio, no condiciones sueltas en la UI). ` +
    `Detalle en juk-portal/OPEN_DECISIONS.md. Este aviso sale una vez por sesión.`,
);
process.exit(0);
