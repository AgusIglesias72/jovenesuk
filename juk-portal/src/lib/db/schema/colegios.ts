import { pgTable, text, timestamp, boolean, pgEnum, uuid, integer, json } from "drizzle-orm/pg-core";

export const colegioTipo = pgEnum("colegio_tipo", ["destino", "cliente"]);

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

  // Flags
  requiereCertificadoPsicofisico: boolean("requiere_certificado_psicofisico").default(false).notNull(),

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

// --- Tipos auxiliares ---
export interface Contacto {
  nombre: string;
  email: string;
  telefono?: string;
}

type TipoAlojamientoEnum = "familia_anfitriona" | "residencia" | "campus" | "otro";
