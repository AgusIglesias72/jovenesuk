import { z } from "zod";

/**
 * Validación del CRM de prospectos (capa de dominio, pura).
 * Los valores de enum replican los pgEnum de `@/lib/db/schema/prospectos`.
 */

export const prospectoEstadoEnum = z.enum([
  "nuevo",
  "contactado",
  "interesado",
  "propuesta",
  "negociacion",
  "ganado",
  "perdido",
]);

export const paisEnum = z.enum([
  "reino_unido",
  "irlanda",
  "canada",
  "malta",
  "australia",
  "argentina",
  "otro",
]);

export const comunicacionTipoEnum = z.enum([
  "email",
  "nota",
  "llamada",
  "reunion",
  "cambio_estado",
  "conversion",
]);

export const comunicacionEstadoEnum = z.enum([
  "pendiente",
  "enviado",
  "entregado",
  "abierto",
  "click",
  "rebotado",
  "spam",
  "fallido",
]);

export const ESTADOS_PROSPECTO = prospectoEstadoEnum.options;
export const PAISES = paisEnum.options;
export const TIPOS_COMUNICACION = comunicacionTipoEnum.options;
export const ESTADOS_COMUNICACION = comunicacionEstadoEnum.options;

const urlOpcional = z.string().trim().url("URL inválida").optional().or(z.literal(""));

const textoOpcional = z.string().trim().optional();

// Fecha opcional: "" o null -> undefined; string -> Date (patrón de cuotas/schema.ts).
const fechaOpcional = z.preprocess(
  (v) => (v === "" || v == null ? undefined : new Date(v as string)),
  z.date({ invalid_type_error: "Fecha inválida" }).optional()
);

export const prospectoCreateSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre del prospecto"),
  estado: prospectoEstadoEnum.default("nuevo"),
  pais: paisEnum.optional(),
  ciudad: textoOpcional,
  sitioWeb: urlOpcional,
  ubicacionUrl: urlOpcional,
  emails: z.array(z.string().email("Email inválido")).default([]),
  telefonos: z.array(z.string().trim()).default([]),
  contactoNombre: textoOpcional,
  contactoCargo: textoOpcional,
  fuente: textoOpcional,
  notas: textoOpcional,
  motivoPerdida: textoOpcional,
  responsableId: z.string().uuid().optional(),
  proximaAccionAt: fechaOpcional,
});

export const prospectoUpdateSchema = prospectoCreateSchema.extend({
  id: z.string().uuid(),
});

export const prospectoFiltersSchema = z.object({
  q: z.string().trim().optional(),
  estado: prospectoEstadoEnum.optional(),
  responsableId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const moverEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: prospectoEstadoEnum,
  posicion: z.coerce.number().int().min(0),
});

export const enviarOutreachSchema = z.object({
  prospectoId: z.string().uuid(),
  asunto: z.string().trim().min(3, "El asunto es muy corto"),
  mensaje: z.string().trim().min(10, "El mensaje es muy corto"),
});

export const notaSchema = z.object({
  prospectoId: z.string().uuid(),
  texto: z.string().trim().min(1, "Escribí algo"),
});

export type ProspectoCreateData = z.output<typeof prospectoCreateSchema>;
export type ProspectoUpdateData = z.output<typeof prospectoUpdateSchema>;
export type ProspectoFilters = z.output<typeof prospectoFiltersSchema>;
export type MoverEstadoData = z.output<typeof moverEstadoSchema>;
export type EnviarOutreachData = z.output<typeof enviarOutreachSchema>;
export type NotaData = z.output<typeof notaSchema>;
