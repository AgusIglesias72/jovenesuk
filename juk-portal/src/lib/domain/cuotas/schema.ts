import { z } from "zod";

/**
 * Plan de cuotas (B1) — validación pura.
 * CRIT-05 (decisión 11/06/2026 ⭐): multi-moneda, default USD.
 */

export const monedaEnum = z.enum(["USD", "GBP", "ARS"]);
export const MONEDAS = monedaEnum.options;
export type Moneda = z.infer<typeof monedaEnum>;

export const MONEDA_SIMBOLOS: Record<Moneda, string> = {
  USD: "US$",
  GBP: "£",
  ARS: "$",
};

export function formatMonto(monto: number | string, moneda: Moneda): string {
  const n = typeof monto === "string" ? Number(monto) : monto;
  return `${MONEDA_SIMBOLOS[moneda]} ${n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const fechaSchema = z.preprocess(
  (v) => (v === "" || v == null ? undefined : new Date(v as string)),
  z.date({ required_error: "Ingresá la fecha", invalid_type_error: "Fecha inválida" })
);

/** Alta del plan: N cuotas mensuales iguales a partir del primer vencimiento. */
export const planCuotasSchema = z.object({
  asignacionId: z.string().uuid(),
  cantidadCuotas: z.coerce
    .number()
    .int("Tiene que ser un entero")
    .min(1, "Mínimo 1 cuota")
    .max(24, "Máximo 24 cuotas"),
  montoPorCuota: z.coerce
    .number()
    .positive("El monto tiene que ser mayor a 0")
    .max(1_000_000),
  moneda: monedaEnum.default("USD"),
  primerVencimiento: fechaSchema,
});

export type PlanCuotasData = z.output<typeof planCuotasSchema>;

/** Vencimientos mensuales: mismo día de cada mes a partir del primero. */
export function generarVencimientos(primerVencimiento: Date, cantidad: number): Date[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(primerVencimiento);
    d.setUTCMonth(d.getUTCMonth() + i);
    return d;
  });
}

export const registrarPagoSchema = z.object({
  cuotaId: z.string().uuid(),
  observaciones: z.string().trim().max(500).optional(),
});
