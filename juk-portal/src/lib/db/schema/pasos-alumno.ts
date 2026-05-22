import { pgTable, text, timestamp, pgEnum, uuid, integer, date, unique, json } from "drizzle-orm/pg-core";
import { asignaciones } from "./asignaciones";

/**
 * Catálogo de los 10 pasos del seguimiento de alumno (PRD §6).
 * Definido como enum para garantizar consistencia y permitir queries por paso.
 */
export const pasoTipo = pgEnum("paso_tipo", [
  "application_form",        // 01
  "pagos",                    // 02
  "immigration_letter",       // 03
  "test_nivel",               // 04
  "parental_consent",         // 05
  "accommodation_letter",     // 06
  "eta",                      // 07
  "autorizacion_escribano",   // 08
  "certificado_psicofisico",  // 09
  "ultimo_pago_presencial",   // 10
]);

export const pasoEstado = pgEnum("paso_estado", [
  "pendiente",
  "en_progreso",
  "completado",
  "bloqueado",
  "na",  // no aplica (ej: paso 9 si colegio no requiere psicofísico)
]);

/**
 * Pasos del alumno por asignación.
 *
 * Una fila por (asignación × tipo de paso) = 10 filas por asignación.
 * Si el alumno tiene 2 asignaciones (= 2 viajes en el año), tiene 20 filas acá.
 */
export const pasosAlumno = pgTable(
  "pasos_alumno",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asignacionId: uuid("asignacion_id")
      .notNull()
      .references(() => asignaciones.id, { onDelete: "cascade" }),
    tipo: pasoTipo("tipo").notNull(),
    estado: pasoEstado("estado").default("pendiente").notNull(),

    // Metadata por paso, varía según el tipo
    metadata: json("metadata").$type<Record<string, unknown>>().default({}).notNull(),

    // Fecha límite (settable por tipo, ej: Application Form puede heredarla del viaje)
    fechaLimite: date("fecha_limite", { mode: "date" }),

    // Cuándo se completó (null mientras no esté completado)
    fechaCompletado: timestamp("fecha_completado"),

    // Observaciones libres por paso (motivo de bloqueo, etc.)
    notas: text("notas"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    uniqAsignacionTipo: unique("uniq_asignacion_paso_tipo").on(t.asignacionId, t.tipo),
  })
);

export type PasoAlumno = typeof pasosAlumno.$inferSelect;
export type NewPasoAlumno = typeof pasosAlumno.$inferInsert;

/**
 * Tipos de metadata por paso. Documentación para Claude Code.
 * No se enforza en el schema porque varía; los lectores deben tiparlo en
 * domain/pasos/<tipo>.ts.
 *
 * application_form: { archivoUrl?: string, fechaEntrega?: string }
 * pagos: { saldoPendiente: number, cuotasPagadas: number, cuotasTotales: number }
 * immigration_letter: { archivoUrl?: string, datosVerificados: boolean }
 * test_nivel: { nivel?: string, viaImmigrationLetter?: boolean }
 * parental_consent: { subEstado: "enviado"|"firmado"|"recibido", archivoUrl?: string }
 * accommodation_letter: { archivoUrl?: string, familiaValido?: boolean }
 * eta: { subEstado: "pendiente"|"en_tramite"|"aprobado"|"rechazado", numeroAutorizacion?: string }
 * autorizacion_escribano: { confirmadoPorFamilia?: boolean, fechaTramite?: string }
 * certificado_psicofisico: { archivoUrl?: string }
 * ultimo_pago_presencial: { fechaPago?: string, montoConfirmado?: number }
 */
