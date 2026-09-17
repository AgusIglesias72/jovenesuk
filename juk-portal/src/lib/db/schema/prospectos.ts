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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { colegios, pais } from "./colegios";
// El enum vive en su propio módulo, y no en `inscripciones.ts`, porque esa tabla
// referencia a ésta: declararlo allá cerraba un ciclo que explotaba al evaluar
// los módulos (la FK es un callback y se resuelve tarde, pero el enum se invoca
// en el acto). Ver el comentario de ./enums-inscripciones.
import { varianteFormulario } from "./enums-inscripciones";
import { viajes } from "./viajes";

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

/**
 * `enviando` es el estado intermedio que hace reanudable un envío por lote: la
 * fila se marca ANTES de llamar a Resend, así un corte no deja "enviado"
 * fantasmas indistinguibles de una entrega real.
 */
export const prospectoComunicacionEstado = pgEnum("prospecto_comunicacion_estado", [
  "pendiente",
  "enviando",
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

/**
 * Una invitación al Application Form ES una comunicación más, no una tabla de
 * campañas aparte. El mail de invitación sale por el mismo camino que el resto
 * del outreach, así que hereda gratis lo que ya está resuelto acá: el respeto
 * por la baja (`prospectos.suscritoOutreach`), el destinatario, el
 * `resendMessageId` y el tracking del webhook de Resend sobre `estado`. Una
 * tabla propia obligaría a duplicar las cuatro cosas y a que el webhook
 * adivinara en cuál de las dos buscar el mensaje que le rebotó.
 *
 * Las columnas `invitacion*` son NULL en toda comunicación que no sea una
 * invitación (notas, llamadas, cambios de estado), que son la mayoría.
 */
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

    // Solo el hash del token, nunca el token en claro (`hashToken` de
    // @/lib/utils/token-opaco): con un dump de la tabla nadie abre una
    // invitación ajena.
    invitacionTokenHash: text("invitacion_token_hash"),
    invitacionViajeId: uuid("invitacion_viaje_id").references(() => viajes.id),
    /** Variante forzada por la campaña; gana sobre la de /configuracion y pierde con el `?v=` del link. */
    invitacionVariante: varianteFormulario("invitacion_variante"),
    invitacionExpiraEl: timestamp("invitacion_expira_el"),
    /** Botón de pánico: revocar corta el link sin borrar la bitácora del envío. */
    invitacionRevocadaEl: timestamp("invitacion_revocada_el"),
    /** Agrupa los envíos de una misma tanda. Un uuid alcanza: la campaña no tiene datos propios. */
    invitacionLoteId: uuid("invitacion_lote_id"),
    /** Lease de la fase 1 del claim (`reservaVigente`): hace reanudable el envío por lote. */
    invitacionReservadoEl: timestamp("invitacion_reservado_el"),
  },
  (t) => ({
    idxProspectoId: index("idx_prospecto_com_prospecto_id").on(t.prospectoId),
    idxResendMessageId: index("idx_prospecto_com_resend_message_id").on(t.resendMessageId),
    // Un token abre UNA invitación. El unique de Postgres no compara NULL con
    // NULL, así que las comunicaciones que no son invitación no colisionan
    // entre sí y no hace falta un índice parcial.
    uniqInvitacionToken: uniqueIndex("uniq_prospecto_com_invitacion_token").on(
      t.invitacionTokenHash
    ),
    // El envío por lote busca "qué falta de esta tanda" (lote + estado): las dos
    // columnas juntas, en ese orden, resuelven el filtro con un solo índice.
    idxLote: index("idx_prospecto_com_lote").on(t.invitacionLoteId, t.estado),
  })
);

export type ProspectoComunicacion = typeof prospectoComunicaciones.$inferSelect;
export type NewProspectoComunicacion = typeof prospectoComunicaciones.$inferInsert;
