import { pgTable, text, timestamp, pgEnum, uuid, unique } from "drizzle-orm/pg-core";
import { alumnos } from "./alumnos";
import { viajes } from "./viajes";

/**
 * Estado de la asignación de un alumno a un viaje específico.
 * Diferenciado del estado del alumno (Module 5) porque un alumno puede tener
 * dos asignaciones simultáneas en estados distintos.
 */
export const asignacionEstado = pgEnum("asignacion_estado", [
  "activa",      // por defecto al asignar
  "viajando",
  "finalizada",
  "cancelada",   // cuando el alumno se da de baja del viaje
]);

/**
 * Asignación alumno ↔ viaje.
 *
 * Razón de existir: un alumno puede inscribirse en más de un viaje al año
 * (PRD §4.5). Cada asignación genera un tablero independiente de 10 pasos
 * en `pasos_alumno`.
 */
export const asignaciones = pgTable(
  "asignaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alumnoId: uuid("alumno_id")
      .notNull()
      .references(() => alumnos.id, { onDelete: "restrict" }),
    viajeId: uuid("viaje_id")
      .notNull()
      .references(() => viajes.id, { onDelete: "restrict" }),

    estado: asignacionEstado("estado").default("activa").notNull(),

    fechaAsignacion: timestamp("fecha_asignacion").defaultNow().notNull(),
    fechaCancelacion: timestamp("fecha_cancelacion"),
    motivoCancelacion: text("motivo_cancelacion"),
  },
  (t) => ({
    // Un alumno no puede estar dos veces en el mismo viaje.
    uniqAlumnoViaje: unique("uniq_alumno_viaje").on(t.alumnoId, t.viajeId),
  })
);

export type Asignacion = typeof asignaciones.$inferSelect;
export type NewAsignacion = typeof asignaciones.$inferInsert;
