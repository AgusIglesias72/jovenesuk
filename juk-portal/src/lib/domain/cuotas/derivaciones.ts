import { aplicaUltimoPagoPresencial, type ViajeOrigen } from "@/lib/domain/viajes";

/**
 * Derivaciones del plan de cuotas (B1/B2). Lógica pura sobre una shape mínima
 * de cuota para ser testeable sin DB.
 */

export type CuotaLike = {
  numero: number;
  esUltimaCuota: number; // 1 | 0 (schema histórico)
  monto: string | number;
  estado: "pendiente" | "pagada" | "vencida";
  canal: "agencia" | "presencial";
  fechaVencimiento: Date;
  fechaPagoEfectivo: Date | null;
};

const monto = (c: CuotaLike) => (typeof c.monto === "string" ? Number(c.monto) : c.monto);

/** Día calendario UTC (las columnas `date` parsean a medianoche UTC). */
function diaUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Canal de una cuota al crearse (PRD B1/B2, ex CRIT-01): la ÚLTIMA cuota es
 * presencial solo para Independiente/Instituto; todo lo demás va vía agencia.
 */
export function canalCuota(origen: ViajeOrigen, esUltima: boolean): "agencia" | "presencial" {
  return esUltima && aplicaUltimoPagoPresencial(origen) ? "presencial" : "agencia";
}

/**
 * Vencida = no pagada y con vencimiento en un día ANTERIOR a hoy (derivado,
 * sin job). Comparación por día calendario UTC: `fechaVencimiento` es una
 * columna `date` (medianoche UTC) y compararla con `new Date()` crudo marcaba
 * la mora desde las 21:00 ART del día previo.
 */
export function estaVencida(c: CuotaLike, hoy: Date): boolean {
  return c.estado !== "pagada" && diaUTC(c.fechaVencimiento) < diaUTC(hoy);
}

export function diasDeMora(c: CuotaLike, hoy: Date): number {
  if (!estaVencida(c, hoy)) return 0;
  return Math.round((diaUTC(hoy) - diaUTC(c.fechaVencimiento)) / 86_400_000);
}

export function totalPlan(cuotas: CuotaLike[]): number {
  return cuotas.reduce((acc, c) => acc + monto(c), 0);
}

export function totalPagado(cuotas: CuotaLike[]): number {
  return cuotas.filter((c) => c.estado === "pagada").reduce((acc, c) => acc + monto(c), 0);
}

export function saldoPendiente(cuotas: CuotaLike[]): number {
  return totalPlan(cuotas) - totalPagado(cuotas);
}

export function proximaCuotaPendiente(cuotas: CuotaLike[]): CuotaLike | null {
  return (
    [...cuotas]
      .filter((c) => c.estado !== "pagada")
      .sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime())[0] ?? null
  );
}

/** Estado del paso B1 derivado del plan (US-22). */
export function estadoPasoB1(
  cuotas: CuotaLike[]
): "pendiente" | "en_progreso" | "completado" {
  if (cuotas.length === 0) return "pendiente";
  const pagadas = cuotas.filter((c) => c.estado === "pagada").length;
  if (pagadas === 0) return "pendiente";
  return pagadas === cuotas.length ? "completado" : "en_progreso";
}

/**
 * B2 completado = la última cuota está pagada con canal presencial (US-35).
 * No es un pago aparte: es una vista sobre la última cuota de B1.
 */
export function b2Completado(cuotas: CuotaLike[]): boolean {
  const ultima = cuotas.find((c) => c.esUltimaCuota === 1);
  return !!ultima && ultima.estado === "pagada" && ultima.canal === "presencial";
}
