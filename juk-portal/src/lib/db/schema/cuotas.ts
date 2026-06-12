import { pgTable, text, timestamp, pgEnum, uuid, integer, date, numeric } from "drizzle-orm/pg-core";
import { asignaciones } from "./asignaciones";

/**
 * Canal de pago. Calculado al crearse según el tipo de representante del viaje
 * (`aplicaUltimoPagoPresencial` en lib/domain/viajes/flujo-pago.ts):
 * - "agencia"     → todas las cuotas del flujo vía agencia
 * - "presencial"  → la última cuota cuando el origen es independiente/instituto (B2)
 */
export const canalPago = pgEnum("canal_pago", ["agencia", "presencial"]);

// CRIT-05 (decisión 11/06/2026 ⭐ validar con Felix): multi-moneda, default USD.
export const monedaCuota = pgEnum("moneda_cuota", ["USD", "GBP", "ARS"]);

export const cuotaEstado = pgEnum("cuota_estado", [
  "pendiente",
  "pagada",
  "vencida",  // calculado por job diario
]);

/**
 * Cuotas del plan de pagos de un alumno por viaje.
 *
 * NOTA IMPORTANTE: el "Paso 10 - Último pago presencial" del M6 NO genera un
 * registro separado. Es la última cuota de este plan, marcada con
 * canal="presencial". Esto evita doble contabilización (ver PRD §6.12).
 */
export const cuotas = pgTable("cuotas", {
  id: uuid("id").primaryKey().defaultRandom(),
  asignacionId: uuid("asignacion_id")
    .notNull()
    .references(() => asignaciones.id, { onDelete: "cascade" }),

  numero: integer("numero").notNull(),  // 1, 2, 3...
  esUltimaCuota: integer("es_ultima_cuota").notNull().default(0),  // 1 si lo es

  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),  // en la moneda acordada
  moneda: monedaCuota("moneda").notNull().default("USD"),
  // Cotización aplicada si el pago se registró en otra moneda (opcional).
  cotizacionAplicada: numeric("cotizacion_aplicada", { precision: 12, scale: 4 }),

  fechaVencimiento: date("fecha_vencimiento", { mode: "date" }).notNull(),
  fechaPagoEfectivo: timestamp("fecha_pago_efectivo"),

  canal: canalPago("canal").notNull(),
  estado: cuotaEstado("estado").default("pendiente").notNull(),

  observaciones: text("observaciones"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Cuota = typeof cuotas.$inferSelect;
export type NewCuota = typeof cuotas.$inferInsert;
