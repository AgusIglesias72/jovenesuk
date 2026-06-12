#!/usr/bin/env node
/**
 * Aviso (no bloqueante) al editar código de un módulo que está bloqueado por una
 * decisión de negocio abierta en OPEN_DECISIONS.md.
 *
 * No frena el trabajo (a veces querés andamiar con un flag), pero le recuerda a
 * Claude que la regla de negocio todavía no está cerrada, para no asumir.
 */
const raw = await readStdin();
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (!filePath) process.exit(0);

const norm = filePath.replace(/\\/g, "/").toLowerCase();
if (!/\.(ts|tsx)$/.test(norm)) process.exit(0);

// Decisiones ⭐ del 11/06/2026: decididas para desarrollo pero pendientes de validación del
// equipo. El aviso recuerda mantener la regla ACOTADA (fácil de revertir), no bloquea.
const gates = [
  {
    crit: "CRIT-04 (decidido ⭐)",
    tema: "excursiones: el representante APRUEBA (decisión 11/06, validar con equipo) — mantené el mecanismo de aprobación desacoplado/auditado",
    patterns: ["excursion", "actividad-viaje", "actividad_viaje", "solicitud-cambio", "solicitud_cambio"],
  },
  {
    crit: "CRIT-05 (decidido ⭐)",
    tema: "cuotas: multi-moneda (USD|GBP|ARS) default USD (decisión 11/06, validar con Felix) — no hardcodear la moneda en UI ni lógica",
    patterns: ["cuota", "/pagos/", "plan-de-pagos", "ultimo_pago", "mora"],
  },
];

const matched = gates.filter((g) => g.patterns.some((p) => norm.includes(p)));
if (matched.length === 0) process.exit(0);

const lines = matched
  .map((g) => `  • ${g.crit}: ${g.tema}`)
  .join("\n");

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `Estás tocando un módulo con una decisión de negocio ABIERTA:\n${lines}\n` +
        `Ver juk-portal/OPEN_DECISIONS.md. No asumas la regla de negocio: si tenés que avanzar, ` +
        `dejá la lógica detrás de un flag/constante claramente marcada y avisale al usuario que ` +
        `el módulo depende de cerrar esa decisión con el equipo (María).`,
    },
  })
);
process.exit(0);

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}
