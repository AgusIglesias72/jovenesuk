import { pgTable, text, timestamp, pgEnum, uuid, json, unique } from "drizzle-orm/pg-core";
import { viajes } from "./viajes";

export const pasoViajeTipo = pgEnum("paso_viaje_tipo", [
  "pasajes",                  // 01
  "excursiones",              // 02
  "transfers",                // 03
  "tarjeta_transporte",       // 04
  "police_checks",            // 05
]);

export const pasoViajeEstado = pgEnum("paso_viaje_estado", [
  "pendiente",
  "en_progreso",
  "completado",
  "bloqueado",
]);

/**
 * Pasos del viaje — los 5 trámites coordinados a nivel de viaje (PRD M7).
 * Son a nivel viaje, no por alumno.
 */
export const pasosViaje = pgTable(
  "pasos_viaje",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    viajeId: uuid("viaje_id")
      .notNull()
      .references(() => viajes.id, { onDelete: "cascade" }),
    tipo: pasoViajeTipo("tipo").notNull(),
    estado: pasoViajeEstado("estado").default("pendiente").notNull(),

    metadata: json("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    /*
     * Por tipo:
     * pasajes:            { subEstado, aerolinea, numeroVuelo, horaSalida, horaLlegada, eTicketUrl? }
     * excursiones:        { excursiones: Array<{ nombre, fecha, proveedor, costo, estado }> }
     * transfers:          { proveedor, costoPorAlumno, asignaciones: Array<{ alumnoId, transferId }> }
     * tarjeta_transporte: { tipo, cantidad, costo, proveedor, comprobanteUrl? }
     * police_checks:      { glChecks: Array<{ groupLeaderId, fechaVencimiento }> } -- derived
     */

    notas: text("notas"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    uniqViajePaso: unique("uniq_viaje_paso_tipo").on(t.viajeId, t.tipo),
  })
);

export type PasoViaje = typeof pasosViaje.$inferSelect;
export type NewPasoViaje = typeof pasosViaje.$inferInsert;

/**
 * Asignación N:M de Group Leaders a Viajes.
 */
export const groupLeadersViaje = pgTable(
  "group_leaders_viaje",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    viajeId: uuid("viaje_id")
      .notNull()
      .references(() => viajes.id, { onDelete: "cascade" }),
    groupLeaderId: uuid("group_leader_id").notNull(),
    esPrincipal: text("es_principal").default("no").notNull(),  // 'si' para el GL principal
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqGlViaje: unique("uniq_gl_viaje").on(t.viajeId, t.groupLeaderId),
  })
);

export type GroupLeaderViaje = typeof groupLeadersViaje.$inferSelect;
export type NewGroupLeaderViaje = typeof groupLeadersViaje.$inferInsert;
