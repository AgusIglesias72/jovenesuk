import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  integer,
  date,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { colegios, pais, tipoAlojamiento } from "./colegios";

/**
 * Estados del viaje (PRD v1.13 §4.4). No existe "Borrador": el Grupal nace en
 * "inscripcion_abierta" y el Individual nace en "confirmado".
 */
export const viajeEstado = pgEnum("viaje_estado", [
  "inscripcion_abierta",
  "confirmado",
  "en_curso",
  "finalizado",
  "cancelado",
]);

/**
 * Tipo de viaje (PRD v1.13 / US-10b). Individual: sin GLs, capacidad fija 1,
 * nace Confirmado, sin regla de 5 alumnos; D2 y Police Checks = N/A.
 */
export const viajeTipo = pgEnum("viaje_tipo", ["grupal", "individual"]);

/**
 * Tipo de representante del viaje (PRD v1.13, "origen" histórico del schema).
 * Deriva el flujo de pago (ex CRIT-01, resuelto):
 * - representante_independiente / instituto → vía agencia, ÚLTIMO pago presencial (B2 activo)
 * - colegio_cliente → vía agencia SIN excepción presencial (B2 = N/A)
 * - juk_directo → directo JUK; comisión de agencia y fee = N/A; B2 = N/A
 * La derivación vive en `lib/domain/viajes/flujo-pago.ts` — no se persiste.
 */
export const viajeOrigen = pgEnum("viaje_origen", [
  "representante_independiente",
  "instituto",
  "colegio_cliente",
  "juk_directo",
]);

export const viajes = pgTable("viajes", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").unique().notNull(),  // ej "UK-2026-JUL-LONDON"
  nombre: text("nombre").notNull(),           // ej "Londres en Julio · Campus"

  tipo: viajeTipo("tipo").notNull().default("grupal"),

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

  // Comisiones — referencia interna, visibles solo para admins (v1 no calcula precios).
  // N/A para juk_directo (la UI/domain lo fuerzan a null); el fee aplica solo a
  // representante_independiente e instituto.
  comisionAgenciaPct: integer("comision_agencia_pct"),
  feeRepresentante: numeric("fee_representante", { precision: 12, scale: 2 }),
  feeRepresentanteEsPorcentaje: boolean("fee_representante_es_porcentaje")
    .notNull()
    .default(false),

  notasInternas: text("notas_internas"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Viaje = typeof viajes.$inferSelect;
export type NewViaje = typeof viajes.$inferInsert;
