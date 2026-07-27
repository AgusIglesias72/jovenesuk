import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { colegios, pais } from "./colegios";

/**
 * CRM de prospectos (colegios/instituciones a captar): pipeline kanban +
 * bitácora de comunicaciones (notas, emails de outreach con tracking Resend).
 * El enum `pais` se reusa de colegios — misma taxonomía de países.
 */

export const prospectoEstado = pgEnum("prospecto_estado", [
  "nuevo",
  "contactado",
  "interesado",
  "propuesta",
  "negociacion",
  "ganado",
  "perdido",
]);

export const prospectoComunicacionTipo = pgEnum("prospecto_comunicacion_tipo", [
  "email",
  "nota",
  "llamada",
  "reunion",
  "cambio_estado",
  "conversion",
]);

export const prospectoComunicacionEstado = pgEnum("prospecto_comunicacion_estado", [
  "pendiente",
  "enviado",
  "entregado",
  "abierto",
  "click",
  "rebotado",
  "spam",
  "fallido",
]);

export const prospectos = pgTable(
  "prospectos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    estado: prospectoEstado("estado").notNull().default("nuevo"),
    posicion: integer("posicion").notNull().default(0),

    pais: pais("pais"),
    ciudad: text("ciudad"),
    sitioWeb: text("sitio_web"),
    ubicacionUrl: text("ubicacion_url"),

    imagenUrl: text("imagen_url"),
    imagenKey: text("imagen_key"),

    emails: json("emails").$type<string[]>().default([]).notNull(),
    telefonos: json("telefonos").$type<string[]>().default([]).notNull(),

    contactoNombre: text("contacto_nombre"),
    contactoCargo: text("contacto_cargo"),
    fuente: text("fuente"),
    notas: text("notas"),

    responsableId: uuid("responsable_id"),
    proximaAccionAt: timestamp("proxima_accion_at"),
    motivoPerdida: text("motivo_perdida"),

    colegioId: uuid("colegio_id").references(() => colegios.id),

    suscritoOutreach: boolean("suscrito_outreach").notNull().default(true),
    unsubscribeToken: text("unsubscribe_token").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqUnsubscribeToken: unique("uniq_prospecto_unsubscribe_token").on(t.unsubscribeToken),
  })
);

export type Prospecto = typeof prospectos.$inferSelect;
export type NewProspecto = typeof prospectos.$inferInsert;

export const prospectoComunicaciones = pgTable(
  "prospecto_comunicaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prospectoId: uuid("prospecto_id")
      .notNull()
      .references(() => prospectos.id, { onDelete: "cascade" }),
    tipo: prospectoComunicacionTipo("tipo").notNull(),
    asunto: text("asunto"),
    cuerpo: text("cuerpo"),
    estado: prospectoComunicacionEstado("estado"),
    destinatario: text("destinatario"),
    resendMessageId: text("resend_message_id"),
    meta: json("meta").$type<Record<string, unknown> | null>(),
    creadoPor: uuid("creado_por"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    idxProspectoId: index("idx_prospecto_com_prospecto_id").on(t.prospectoId),
    idxResendMessageId: index("idx_prospecto_com_resend_message_id").on(t.resendMessageId),
  })
);

export type ProspectoComunicacion = typeof prospectoComunicaciones.$inferSelect;
export type NewProspectoComunicacion = typeof prospectoComunicaciones.$inferInsert;
