import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import {
  CUANDO,
  DESTINO,
  ESTADO_CONSULTA,
  MODALIDAD,
  PARA_QUIEN,
  values,
} from "@/lib/domain/leads";

/**
 * Captación desde la web pública: newsletter (`suscriptores`) y consultas de
 * leads calificados (`consultas`). Los valores de los enums salen del dominio
 * (src/lib/domain/leads.ts) — única fuente de verdad compartida con el form.
 */

export const suscriptorEstado = pgEnum("suscriptor_estado", ["activo", "baja"]);

export const suscriptores = pgTable("suscriptores", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  estado: suscriptorEstado("estado").notNull().default("activo"),
  origen: text("origen").notNull().default("hero"),
  creadoEl: timestamp("creado_el").notNull().defaultNow(),
});

export type Suscriptor = typeof suscriptores.$inferSelect;
export type NewSuscriptor = typeof suscriptores.$inferInsert;

export const consultaParaQuien = pgEnum("consulta_para_quien", values(PARA_QUIEN));
export const consultaModalidad = pgEnum("consulta_modalidad", values(MODALIDAD));
export const consultaDestino = pgEnum("consulta_destino", values(DESTINO));
export const consultaCuando = pgEnum("consulta_cuando", values(CUANDO));
export const consultaEstado = pgEnum("consulta_estado", values(ESTADO_CONSULTA));

export const consultas = pgTable("consultas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  email: text("email").notNull(),
  telefono: text("telefono").notNull(),
  paraQuien: consultaParaQuien("para_quien").notNull(),
  institucion: text("institucion"),
  modalidad: consultaModalidad("modalidad").notNull(),
  destino: consultaDestino("destino"),
  cuando: consultaCuando("cuando").notNull(),
  mensaje: text("mensaje"),
  estado: consultaEstado("estado").notNull().default("nueva"),
  creadoEl: timestamp("creado_el").notNull().defaultNow(),
});

export type Consulta = typeof consultas.$inferSelect;
export type NewConsulta = typeof consultas.$inferInsert;
