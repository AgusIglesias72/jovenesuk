import type { VIAJE_ORIGENES, VIAJE_TIPOS } from "./schema";

export type ViajeOrigen = (typeof VIAJE_ORIGENES)[number];
export type ViajeTipo = (typeof VIAJE_TIPOS)[number];

export const FLUJOS_PAGO = ["via_agencia", "directo_juk"] as const;
export type FlujoPago = (typeof FLUJOS_PAGO)[number];

export const FLUJO_PAGO_LABELS: Record<FlujoPago, string> = {
  via_agencia: "Vía agencia",
  directo_juk: "Directo JUK",
};

/**
 * Flujo de pago derivado del tipo de representante (PRD v1.13, ex CRIT-01).
 * Calculado, nunca persistido: si el equipo revierte la decisión, se cambia acá.
 */
export function flujoPago(origen: ViajeOrigen): FlujoPago {
  return origen === "juk_directo" ? "directo_juk" : "via_agencia";
}

/**
 * ¿El último pago se cobra presencialmente en JUK? (paso B2 del M6)
 * Solo Representante Independiente e Instituto. Colegio cliente paga TODO vía
 * agencia (sin excepción presencial) y JUK directo no tiene agencia de por medio.
 */
export function aplicaUltimoPagoPresencial(origen: ViajeOrigen): boolean {
  return origen === "representante_independiente" || origen === "instituto";
}

/** La comisión de agencia solo tiene sentido en flujo "vía agencia". */
export function aplicaComisionAgencia(origen: ViajeOrigen): boolean {
  return flujoPago(origen) === "via_agencia";
}

/** El fee del representante aplica solo a Independiente e Instituto. */
export function aplicaFeeRepresentante(origen: ViajeOrigen): boolean {
  return origen === "representante_independiente" || origen === "instituto";
}

/** JUK (directo) no tiene persona externa: no se generan credenciales de portal. */
export function generaCredencialesRepresentante(origen: ViajeOrigen): boolean {
  return origen !== "juk_directo";
}

/** Estado inicial del viaje: Grupal nace en inscripción; Individual nace confirmado. */
export function estadoInicialViaje(tipo: ViajeTipo): "inscripcion_abierta" | "confirmado" {
  return tipo === "individual" ? "confirmado" : "inscripcion_abierta";
}

/** D2 (psicofísico del alumno) aplica solo a viajes Grupales con GL (ex CRIT-03). */
export function aplicaPsicofisico(tipo: ViajeTipo): boolean {
  return tipo === "grupal";
}

/** Police checks (M7 Paso 5) son por GL: sin GLs (Individual) el paso es N/A. */
export function aplicaPoliceChecks(tipo: ViajeTipo): boolean {
  return tipo === "grupal";
}
