import { pgTable, text, timestamp, pgEnum, uuid, integer } from "drizzle-orm/pg-core";

/**
 * Entidad a la que pertenece un documento.
 * Como hay varios tipos (alumno, viaje, colegio, paso), usamos polimorfismo
 * vía columna `entidad_tipo` + `entidad_id` (sin FK constraint estricta).
 */
export const documentoEntidad = pgEnum("documento_entidad", [
  "alumno",
  "viaje",
  "colegio",
  "paso_alumno",
  "paso_viaje",
  "group_leader",
]);

export const documentoCategoria = pgEnum("documento_categoria", [
  "application_form",
  "immigration_letter",
  "parental_consent",
  "accommodation_letter",
  "eta_screenshot",
  "autorizacion_escribano",
  "certificado_psicofisico",
  "police_check",
  "e_ticket",
  "comprobante_pago",
  "comprobante_transporte",
  "otro",
]);

/**
 * Documento almacenado en R2.
 * `r2Key` es la key dentro del bucket (sin URL completa).
 * Nunca hay URL pública: se sirven por /api/uploads/<r2Key> (proxy autenticado).
 */
export const documentos = pgTable("documentos", {
  id: uuid("id").primaryKey().defaultRandom(),

  entidadTipo: documentoEntidad("entidad_tipo").notNull(),
  entidadId: uuid("entidad_id").notNull(),
  categoria: documentoCategoria("categoria").notNull(),

  nombreOriginal: text("nombre_original").notNull(),
  r2Key: text("r2_key").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  tamanoBytes: integer("tamano_bytes").notNull(),

  // Para versionado del Parental Consent (PRD §3.5)
  versionAnio: integer("version_anio"),

  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedBy: uuid("uploaded_by"),
});

export type Documento = typeof documentos.$inferSelect;
export type NewDocumento = typeof documentos.$inferInsert;
