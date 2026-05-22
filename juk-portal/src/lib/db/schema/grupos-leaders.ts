import { pgTable, text, timestamp, pgEnum, uuid, date } from "drizzle-orm/pg-core";

/**
 * Group Leader — persona externa que viaja con el grupo.
 * Importante: faltaba como entidad en el PRD v1.1; se modela acá para soportar
 * el M7 paso 5 (Police Checks por GL).
 */
export const policeCheckEstado = pgEnum("police_check_estado", [
  "pendiente",
  "en_tramite",
  "aprobado",
  "vencido",
]);

export const groupLeaders = pgTable("group_leaders", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  email: text("email").unique().notNull(),
  telefono: text("telefono"),
  documento: text("documento"),  // DNI/pasaporte del GL

  // Police check (datos directos en el GL — son del GL, no del viaje)
  policeCheckEstado: policeCheckEstado("police_check_estado").default("pendiente").notNull(),
  policeCheckUrl: text("police_check_url"),
  policeCheckFechaEmision: date("police_check_fecha_emision", { mode: "date" }),
  policeCheckFechaVencimiento: date("police_check_fecha_vencimiento", { mode: "date" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GroupLeader = typeof groupLeaders.$inferSelect;
export type NewGroupLeader = typeof groupLeaders.$inferInsert;
