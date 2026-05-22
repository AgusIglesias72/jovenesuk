import { pgTable, text, timestamp, pgEnum, uuid, json } from "drizzle-orm/pg-core";

export const auditAccion = pgEnum("audit_accion", [
  "login",
  "logout",
  "login_failed",
  "create",
  "update",
  "delete",
  "soft_delete",
  "asignar_a_viaje",
  "desasignar_de_viaje",
  "cambio_estado_paso",
  "cambio_estado_viaje",
  "registrar_pago",
  "subir_documento",
]);

/**
 * Log de auditoría — todos los cambios importantes quedan registrados.
 *
 * `entidad_tipo` + `entidad_id` indican qué se cambió.
 * `cambios` guarda diff entre before/after para updates.
 */
export const auditoria = pgTable("auditoria", {
  id: uuid("id").primaryKey().defaultRandom(),
  accion: auditAccion("accion").notNull(),
  entidadTipo: text("entidad_tipo"),  // 'alumno' | 'viaje' | 'cuota' | etc.
  entidadId: uuid("entidad_id"),

  usuarioId: uuid("usuario_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  cambios: json("cambios").$type<{
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }>(),

  metadata: json("metadata").$type<Record<string, unknown>>().default({}).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditoriaEntry = typeof auditoria.$inferSelect;
export type NewAuditoriaEntry = typeof auditoria.$inferInsert;
