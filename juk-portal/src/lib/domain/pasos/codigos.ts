/**
 * Tablero del alumno (PRD v1.13 §6): Paso 0 + Grupos A/B/C/D.
 * Spec completa: docs/prd/02-portal-interno.md (M6).
 */

export const PASO_CODIGOS = [
  "paso_0",
  "a1",
  "a2",
  "a3",
  "b1",
  "b2",
  "c1",
  "c2",
  "c3",
  "d1",
  "d2",
] as const;

export type PasoCodigo = (typeof PASO_CODIGOS)[number];

export const GRUPOS_PASO = ["referencia", "a", "b", "c", "d"] as const;
export type GrupoPaso = (typeof GRUPOS_PASO)[number];

export function grupoDePaso(codigo: PasoCodigo): GrupoPaso {
  if (codigo === "paso_0") return "referencia";
  return codigo[0] as GrupoPaso;
}

export const GRUPO_LABELS: Record<GrupoPaso, string> = {
  referencia: "Origen",
  a: "Inscripción y programa",
  b: "Pagos",
  c: "Documentación de viaje",
  d: "Documentación legal argentina",
};

export const PASO_LABELS: Record<PasoCodigo, string> = {
  paso_0: "Application Form JUK (origen)",
  a1: "Application Form del colegio",
  a2: "Test de Nivel",
  a3: "Parental Consent",
  b1: "Plan de cuotas",
  b2: "Último pago presencial",
  c1: "ETA",
  c2: "Immigration Letter",
  c3: "Accommodation Letter",
  d1: "Autorización ante escribano",
  d2: "Certificado psicofísico",
};

/** Equivalencia con la numeración 1-10 de las versiones viejas del PRD. */
export const PASO_NUMERACION_VIEJA: Record<Exclude<PasoCodigo, "paso_0">, number> = {
  a1: 1,
  b1: 2,
  c2: 3,
  a2: 4,
  a3: 5,
  c3: 6,
  c1: 7,
  d1: 8,
  d2: 9,
  b2: 10,
};

/** El Paso 0 es de solo lectura: lo setea el sistema al crear el alumno. */
export function esPasoEditable(codigo: PasoCodigo): boolean {
  return codigo !== "paso_0";
}
