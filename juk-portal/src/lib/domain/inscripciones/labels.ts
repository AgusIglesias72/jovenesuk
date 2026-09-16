import type { InscripcionEstado, Variante } from "./schema";

/** Labels y tonos de Badge en español rioplatense para los enums del módulo. */

type BadgeTone = "neutral" | "info" | "brand" | "warning" | "success" | "danger";

export const INSCRIPCION_ESTADO_LABELS: Record<InscripcionEstado, string> = {
  recibida: "Recibida",
  procesada: "Procesada",
  duplicada: "DNI ya cargado",
  requiere_revision: "Necesita revisión",
  error: "Falló el alta",
  anulada: "Anulada",
};

export const INSCRIPCION_ESTADO_TONE: Record<InscripcionEstado, BadgeTone> = {
  recibida: "info",
  procesada: "success",
  duplicada: "neutral",
  // Las dos que piden acción del equipo: revisión en ámbar, fallo en rojo.
  requiere_revision: "warning",
  error: "danger",
  anulada: "neutral",
};

/** Solo estéticas: el nombre es para el equipo, la familia nunca lo ve. */
export const VARIANTE_LABELS: Record<Variante, string> = {
  a: "A — Legajo (sobria, como el portal)",
  b: "B — Cuaderno (editorial y cálida)",
  c: "C — Embarque (una columna, pensada para el teléfono)",
};

export const VARIANTE_LABELS_CORTOS: Record<Variante, string> = {
  a: "A",
  b: "B",
  c: "C",
};

export const NIVEL_LABELS = {
  nivel1: "Nivel 1 — puede salir en un mail o un aviso",
  nivel2: "Nivel 2 — no sale del sistema",
} as const;
