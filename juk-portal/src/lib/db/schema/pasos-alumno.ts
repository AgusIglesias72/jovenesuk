import { pgTable, text, timestamp, pgEnum, uuid, date, unique, json } from "drizzle-orm/pg-core";
import { asignaciones } from "./asignaciones";

/**
 * Tablero del alumno (PRD v1.13 §6, estructura v1.8+): Paso 0 de referencia +
 * cuatro grupos temáticos. Equivalencia con la numeración vieja:
 * a1=P1 · a2=P4 · a3=P5 · b1=P2 · b2=P10 · c1=P7 · c2=P3 · c3=P6 · d1=P8 · d2=P9.
 */
export const pasoCodigo = pgEnum("paso_codigo", [
  "paso_0", // Origen del alumno en JUK (solo lectura)
  "a1",     // Application Form del colegio
  "a2",     // Test de Nivel
  "a3",     // Parental Consent
  "b1",     // Plan de cuotas
  "b2",     // Último pago presencial (vista sobre la última cuota de B1)
  "c1",     // ETA
  "c2",     // Immigration Letter (requiere B1 completado)
  "c3",     // Accommodation Letter
  "d1",     // Autorización de viaje ante escribano
  "d2",     // Certificado de aptitud psicofísica
]);

export const pasoEstado = pgEnum("paso_estado", [
  "pendiente",
  "en_progreso",
  "completado",
  "bloqueado",
  "na",       // no aplica (config del colegio, edad, representante, país, tipo de viaje)
  "vencido",  // solo A1: pasó la fecha límite sin completar (no bloquea)
]);

/**
 * Pasos del alumno por asignación: una fila por (asignación × código) = 11
 * filas por asignación, creadas por el trigger de asignación con los N/A
 * automáticos ya resueltos. Reasignación a otro viaje → se resetean.
 */
export const pasosAlumno = pgTable(
  "pasos_alumno",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asignacionId: uuid("asignacion_id")
      .notNull()
      .references(() => asignaciones.id, { onDelete: "cascade" }),
    codigo: pasoCodigo("codigo").notNull(),
    estado: pasoEstado("estado").default("pendiente").notNull(),

    // Metadata por paso (shapes tipadas en src/lib/domain/pasos/)
    metadata: json("metadata").$type<Record<string, unknown>>().default({}).notNull(),

    // Fecha límite (A1 la hereda del viaje y es sobreescribible por alumno)
    fechaLimite: date("fecha_limite", { mode: "date" }),

    fechaCompletado: timestamp("fecha_completado"),

    notas: text("notas"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    uniqAsignacionCodigo: unique("uniq_asignacion_paso_codigo").on(t.asignacionId, t.codigo),
  })
);

export type PasoAlumno = typeof pasosAlumno.$inferSelect;
export type NewPasoAlumno = typeof pasosAlumno.$inferInsert;
