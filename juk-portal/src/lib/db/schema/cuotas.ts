import { pgTable, text, timestamp, pgEnum, uuid, integer, date, numeric } from "drizzle-orm/pg-core";
import { asignaciones } from "./asignaciones";

/**
 * Canal de pago. Calculado al crearse según viaje.ultimoPagoPresencial:
 * - "agencia"     → cuotas N..N-1 cuando viaje pasa por agencia
 * - "presencial"  → cuota final (cuando ultimoPagoPresencial = "si")
 */
export const canalPago = pgEnum("canal_pago", ["agencia", "presencial"]);

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

  // Montos en GBP (la moneda del viaje); ARS handled separately if needed.
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  moneda: text("moneda").notNull().default("GBP"),

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
