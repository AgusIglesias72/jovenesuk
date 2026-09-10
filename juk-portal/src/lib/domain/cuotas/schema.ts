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

/**
 * Vencimientos mensuales: mismo día de cada mes a partir del primero. Si el mes
 * destino no tiene ese día (ej. 31-ene + 1 mes), se usa el último día del mes
 * para no "desbordar" al mes siguiente (31-ene → 28/29-feb, no 3-mar).
 */
export function generarVencimientos(primerVencimiento: Date, cantidad: number): Date[] {
  const dia = primerVencimiento.getUTCDate();
  const anioBase = primerVencimiento.getUTCFullYear();
  const mesBase = primerVencimiento.getUTCMonth();
  return Array.from({ length: cantidad }, (_, i) => {
    const anio = anioBase + Math.floor((mesBase + i) / 12);
    const mes = (mesBase + i) % 12;
    const ultimoDiaDelMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    const d = new Date(primerVencimiento);
    d.setUTCFullYear(anio, mes, Math.min(dia, ultimoDiaDelMes));
    return d;
  });
}

/**
 * Una fecha de pago es futura si cae después del día calendario (UTC) de `hoy`.
 * Se compara por día y no por instante: el DateInput manda medianoche UTC, y
 * "hoy" tiene que valer a cualquier hora.
 */
export function esFechaPagoFutura(fecha: Date, hoy: Date = new Date()): boolean {
  const finDeHoy = Date.UTC(
    hoy.getUTCFullYear(),
    hoy.getUTCMonth(),
    hoy.getUTCDate(),
    23,
    59,
    59,
    999
  );
  return fecha.getTime() > finDeHoy;
}

export const OBSERVACIONES_PAGO_MAX = 500;

/** US-22: fecha efectiva del pago (retroactiva sí, futura no). Vacía = hoy. */
const fechaPagoSchema = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v instanceof Date ? v : new Date(v as string)),
  z
    .date({ invalid_type_error: "Fecha inválida" })
    .refine((d) => !esFechaPagoFutura(d), "La fecha del pago no puede ser futura")
    .optional()
);

const observacionesPagoSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .trim()
    .max(OBSERVACIONES_PAGO_MAX, `Máximo ${OBSERVACIONES_PAGO_MAX} caracteres`)
    .optional()
);

/** Lo que se carga al registrar cualquier pago (el diálogo valida con esto antes de enviar). */
export const datosPagoSchema = z.object({
  fechaPago: fechaPagoSchema,
  observaciones: observacionesPagoSchema,
});

export const registrarPagoSchema = datosPagoSchema.extend({
  cuotaId: z.string().uuid(),
});

export type RegistrarPagoData = z.output<typeof registrarPagoSchema>;

/** B2 (US-35): confirmar la última cuota presencial, con los mismos datos del pago. */
export const confirmarPagoPresencialSchema = datosPagoSchema.extend({
  asignacionId: z.string().uuid(),
});
