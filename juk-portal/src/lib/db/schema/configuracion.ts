import { pgTable, text, timestamp, uuid, json } from "drizzle-orm/pg-core";

/**
 * Configuración del portal — key-value con valor JSON.
 *
 * Cada clave agrupa un bloque de settings (p. ej. "mails"); el shape del
 * valor lo define el dominio (lib/domain/configuracion) con Zod. Los
 * defaults viven en código: una clave ausente = usar defaults.
 */
export const configuracion = pgTable("configuracion", {
  clave: text("clave").primaryKey(),
  valor: json("valor").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
});

export type ConfiguracionRow = typeof configuracion.$inferSelect;
