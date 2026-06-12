import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  integer,
  json,
  unique,
} from "drizzle-orm/pg-core";

export const colegioTipo = pgEnum("colegio_tipo", ["destino", "cliente"]);

/**
 * Documentos estándar del programa (PRD US-05b). La configuración por colegio
 * determina qué pasos del M6 se activan al asignar un alumno — sin hardcodes.
 */
export const documentoPrograma = pgEnum("documento_programa", [
  "application_form",        // → paso A1
  "test_nivel",              // → paso A2
  "parental_consent",        // → paso A3 (además de la regla de edad ≥18)
  "confirmation_letter",     // campo de control en el tablero (no inicializa pasos)
  "visa_immigration_letter", // campo de control en el tablero (no inicializa pasos)
]);

export const requisitoDocumento = pgEnum("requisito_documento", [
  "requerido",
  "opcional",  // MIN-13: paso activo pero excluido de completitud y alertas
  "na",
]);

/**
 * Documentación de entrada al país (MIN-14): vive en el colegio destino, con
 * default derivado de su país (domain/colegios/documentos.ts). Rige el paso C1.
 */
export const tipoEntrada = pgEnum("tipo_entrada", ["eta", "visa", "ninguna"]);

export const colegioEstado = pgEnum("colegio_estado", ["activo", "inactivo"]);

export const pais = pgEnum("pais", [
  "reino_unido",
  "irlanda",
  "canada",
  "malta",
  "australia",
  "argentina",
  "otro",
]);

export const tipoAlojamiento = pgEnum("tipo_alojamiento", [
  "familia_anfitriona",
  "residencia",
  "campus",
  "otro",
]);

/**
 * Colegio — destino (UK, etc.) o cliente (Argentina, ej: NEA).
 * PRD §3 distingue ambos tipos con campos compartidos y específicos.
 */
export const colegios = pgTable("colegios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  tipo: colegioTipo("tipo").notNull(),
  pais: pais("pais").notNull(),
  ciudad: text("ciudad").notNull(),

  // Contactos (jsonb porque son embebidos y no se accede por columna)
  contactoAcademico: json("contacto_academico").$type<Contacto>().notNull(),
  contactoAdministrativo: json("contacto_administrativo").$type<Contacto>().notNull(),
  contactoAlojamientos: json("contacto_alojamientos").$type<Contacto | null>(),
  contactoJuniors: json("contacto_juniors").$type<Contacto | null>(),

  // Documentos vivos (URLs a R2)
  applicationFormUrl: text("application_form_url"),
  parentalConsentUrl: text("parental_consent_url"),
  parentalConsentYear: integer("parental_consent_year"),
  parentalConsentUpdatedAt: timestamp("parental_consent_updated_at"),

  // Oferta del colegio
  cursosDisponibles: json("cursos_disponibles").$type<string[]>().default([]).notNull(),
  tiposAlojamiento: json("tipos_alojamiento").$type<TipoAlojamientoEnum[]>().default([]).notNull(),

  // Documentación de entrada (rige C1; default por país al crear — MIN-14)
  tipoEntradaRequerida: tipoEntrada("tipo_entrada_requerida").notNull().default("eta"),

  // Misc
  comisionAgenciaPorcentaje: integer("comision_agencia_porcentaje"),  // sólo admins ven esto
  sitioWeb: text("sitio_web"),
  notas: text("notas"),
  estado: colegioEstado("estado").default("activo").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Colegio = typeof colegios.$inferSelect;
export type NewColegio = typeof colegios.$inferInsert;

/**
 * Config documental por colegio (PRD US-05b): una fila por documento, NO
 * columnas fijas — extensible a documentos personalizados en v2. Los documentos
 * sin fila usan el default del dominio (MIN-11). Cambios de config aplican solo
 * a asignaciones nuevas; los tableros existentes no se tocan.
 */
export const colegioDocumentoConfig = pgTable(
  "colegio_documento_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    colegioId: uuid("colegio_id")
      .notNull()
      .references(() => colegios.id, { onDelete: "cascade" }),
    documento: documentoPrograma("documento").notNull(),
    requisito: requisitoDocumento("requisito").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    uniqColegioDocumento: unique("uniq_colegio_documento").on(t.colegioId, t.documento),
  })
);

export type ColegioDocumentoConfig = typeof colegioDocumentoConfig.$inferSelect;
export type NewColegioDocumentoConfig = typeof colegioDocumentoConfig.$inferInsert;

// --- Tipos auxiliares ---
export type Contacto = {
  nombre: string;
  email: string;
  telefono?: string;
};

type TipoAlojamientoEnum = "familia_anfitriona" | "residencia" | "campus" | "otro";
