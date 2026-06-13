import { diasDeMora, estaVencida, totalPagado, totalPlan, type CuotaLike } from "./derivaciones";

/**
 * Resumen de pagos por plan (US-23/US-24) — agregados puros sobre las cuotas
 * de una asignación, para la sección Pagos del viaje y el módulo global.
 */

export type ResumenPlan = {
  cuotasPagadas: number;
  cuotasTotales: number;
  abonado: number;
  saldo: number;
  /** Mora máxima entre las cuotas vencidas del plan (0 si está al día). */
  maxDiasMora: number;
};

export function resumenPlan(cuotas: CuotaLike[], hoy: Date): ResumenPlan {
  return {
    cuotasPagadas: cuotas.filter((c) => c.estado === "pagada").length,
    cuotasTotales: cuotas.length,
    abonado: totalPagado(cuotas),
    saldo: totalPlan(cuotas) - totalPagado(cuotas),
    maxDiasMora: cuotas.reduce((acc, c) => Math.max(acc, diasDeMora(c, hoy)), 0),
  };
}

export const ORDEN_RESUMEN = ["mora", "saldo", "nombre"] as const;
export type OrdenResumen = (typeof ORDEN_RESUMEN)[number];

export const ORDEN_RESUMEN_LABELS: Record<OrdenResumen, string> = {
  mora: "Días de mora",
  saldo: "Saldo pendiente",
  nombre: "Nombre",
};

/** Orden de la sección Pagos del viaje (US-24): mora, saldo o nombre. */
export function ordenarResumenes<
  T extends ResumenPlan & { apellido: string; nombre: string },
>(rows: T[], criterio: OrdenResumen): T[] {
  const porNombre = (a: T, b: T) =>
    `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es");
  return [...rows].sort((a, b) => {
    if (criterio === "mora" && b.maxDiasMora !== a.maxDiasMora)
      return b.maxDiasMora - a.maxDiasMora;
    if (criterio === "saldo" && b.saldo !== a.saldo) return b.saldo - a.saldo;
    return porNombre(a, b);
  });
}

/** Estado efectivo de una cuota para mostrar (la mora es derivada, no persistida). */
export function estadoEfectivoCuota(
  c: CuotaLike,
  hoy: Date
): "pagada" | "vencida" | "pendiente" {
  if (c.estado === "pagada") return "pagada";
  return estaVencida(c, hoy) ? "vencida" : "pendiente";
}
