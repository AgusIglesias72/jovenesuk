import { pgTable, text, timestamp, pgEnum, uuid, integer, date } from "drizzle-orm/pg-core";
import { colegios, pais, tipoAlojamiento } from "./colegios";

/**
 * Estados del viaje (PRD §4.4).
 * "Borrador" del PRD original quedó fuera por decisión: el viaje arranca directo
 * en "inscripcion_abierta" al crearse (ver doc-revision-PRD).
 */
export const viajeEstado = pgEnum("viaje_estado", [
  "inscripcion_abierta",
  "confirmado",
  "en_curso",
  "finalizado",
  "cancelado",
]);

/**
 * Tipo de origen del viaje. Determina el flujo de pago final.
 * - representante_independiente / instituto → último pago es presencial JUK (sin 6% agencia)
 * - colegio_cliente (ej: NEA) → todos los pagos van directo a JUK
 */
export const viajeOrigen = pgEnum("viaje_origen", [
  "representante_independiente",
  "instituto",
  "colegio_cliente",
]);

export const viajes = pgTable("viajes", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").unique().notNull(),  // ej "UK-2026-JUL-LONDON"
  nombre: text("nombre").notNull(),           // ej "Londres en Julio · Campus"

  // Fechas (date, no timestamp — son fechas de calendario)
  fechaInicio: date("fecha_inicio", { mode: "date" }).notNull(),
  fechaFin: date("fecha_fin", { mode: "date" }).notNull(),

  // Origen y destino
  origen: viajeOrigen("origen").notNull(),
  colegioClienteId: uuid("colegio_cliente_id").references(() => colegios.id),
  paisDestino: pais("pais_destino").notNull(),
  colegioDestinoId: uuid("colegio_destino_id")
    .notNull()
    .references(() => colegios.id),

  // Programa
  curso: text("curso").notNull(),
  tipoAlojamientoSolicitado: tipoAlojamiento("tipo_alojamiento_solicitado").notNull(),

  // Capacidad
  cantidadGroupLeaders: integer("cantidad_group_leaders").notNull().default(1),
  capacidadMaxima: integer("capacidad_maxima").notNull(),  // = cantidadGroupLeaders × 12
  capacidadMinima: integer("capacidad_minima").notNull().default(5),

  estado: viajeEstado("estado").default("inscripcion_abierta").notNull(),

  // Última cuota presencial — calculado al crearse
  ultimoPagoPresencial: text("ultimo_pago_presencial").notNull().default("si"),
  // 'si' para representante_independiente / instituto; 'no' para colegio_cliente

  notasInternas: text("notas_internas"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Viaje = typeof viajes.$inferSelect;
export type NewViaje = typeof viajes.$inferInsert;
