import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

/**
 * Tracking de notificaciones automáticas (TEC-06): sin esto, una falla del
 * scheduler duplica emails o los pierde sin que nadie se entere.
 * Dedup por (tipo, entidad_id, clave): la clave identifica la ocurrencia
 * (ej: "14d" para el recordatorio de 14 días antes).
 */
export const notificacionesEnviadas = pgTable(
  "notificaciones_enviadas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: text("tipo").notNull(),            // 'recordatorio_a1' | 'recordatorio_d1' | 'resumen_semanal' | …
    entidadTipo: text("entidad_tipo").notNull(),
    entidadId: uuid("entidad_id").notNull(),
    clave: text("clave").notNull(),          // ocurrencia: '14d', '7d', '2026-W24', …
    canal: text("canal").notNull().default("email"),
    destinatario: text("destinatario").notNull(),
    resendMessageId: text("resend_message_id"),
    estado: text("estado").notNull().default("sent"), // sent | failed
    enviadoAt: timestamp("enviado_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqOcurrencia: unique("uniq_notificacion_ocurrencia").on(
      t.tipo,
      t.entidadId,
      t.clave
    ),
  })
);

export type NotificacionEnviada = typeof notificacionesEnviadas.$inferSelect;
export type NewNotificacionEnviada = typeof notificacionesEnviadas.$inferInsert;
