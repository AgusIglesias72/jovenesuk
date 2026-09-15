import { pgTable, text, timestamp, pgEnum, uuid, json, boolean } from "drizzle-orm/pg-core";

export const alertaNivel = pgEnum("alerta_nivel", ["critica", "alta", "media", "info"]);

export const alertaTipo = pgEnum("alerta_tipo", [
  "eta_rechazado",
  "pasaporte_vence_antes_viaje",
  "pasaporte_vence_pronto",
  "mora_cuota",
  "mora_mayor_7_dias",
  "viaje_proximo_paso_pendiente",
  "viaje_proximo_paso_bloqueado",
  "parental_consent_desactualizado",
  "police_check_vencido",
  "immigration_letter_tardia",
  "viaje_sin_cupo_minimo",
  "otro",
]);

/**
 * Alertas operativas mostradas en el dashboard.
 * Generadas por jobs diarios + algunas en tiempo real al cambiar estados.
 *
 * Las alertas son derivables del estado del sistema, pero las materializamos
 * en esta tabla para:
 *   1) performance (no recomputar 60 alumnos × N reglas en cada page load),
 *   2) permitir "descartar" alertas por sesión (PRD §2.3 US-DX-01),
 *   3) historial / auditoría.
 *
 * OJO (TEC-16): hoy NADA lee ni escribe esta tabla. Las alertas se calculan en
 * vivo en `src/lib/db/queries/alertas.ts` con las reglas puras de
 * `src/lib/domain/alertas/`. Queda decidir si se materializa o se borra.
 */
export const alertas = pgTable("alertas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nivel: alertaNivel("nivel").notNull(),
  tipo: alertaTipo("tipo").notNull(),

  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),

  // Entidad afectada
  alumnoId: uuid("alumno_id"),
  viajeId: uuid("viaje_id"),
  asignacionId: uuid("asignacion_id"),

  // Contexto adicional
  datos: json("datos").$type<Record<string, unknown>>().default({}).notNull(),

  resuelta: boolean("resuelta").default(false).notNull(),
  fechaResolucion: timestamp("fecha_resolucion"),
  resueltaPor: uuid("resuelta_por"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Alerta = typeof alertas.$inferSelect;
export type NewAlerta = typeof alertas.$inferInsert;
