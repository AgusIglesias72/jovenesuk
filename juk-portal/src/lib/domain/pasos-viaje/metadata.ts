import { z } from "zod";

/** URL opcional: vacía, ausente, o una URL válida (≤500). Sin upload R2 todavía. */
const optionalUrl = z.union([z.string().trim().url().max(500), z.literal("")]).optional();
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const PASAJE_SUBESTADOS = ["sin_iniciar", "reservado", "emitido"] as const;
export const EXCURSION_ESTADOS = ["propuesta", "reservada", "pagada"] as const;

export const pasajesMetadataSchema = z.object({
  subEstado: z.enum(PASAJE_SUBESTADOS).optional(),
  aerolinea: optionalText(120),
  numeroVuelo: optionalText(40),
  fechaSalida: optionalText(40),
  fechaLlegada: optionalText(40),
  eTicketUrl: optionalUrl,
  notas: optionalText(2000),
});

export const excursionItemSchema = z.object({
  nombre: z.string().trim().min(1, "Poné un nombre").max(160),
  fecha: optionalText(40),
  proveedor: optionalText(160),
  costoGbp: z.number().nonnegative().optional(),
  estado: z.enum(EXCURSION_ESTADOS).optional(),
});

export const excursionesMetadataSchema = z.object({
  excursiones: z.array(excursionItemSchema).max(50).default([]),
});

export const transfersMetadataSchema = z.object({
  proveedor: optionalText(160),
  costoPorAlumnoGbp: z.number().nonnegative().optional(),
  llegadaConfirmada: z.boolean().optional(),
  notas: optionalText(2000),
});

export const tarjetaTransporteMetadataSchema = z.object({
  tipo: optionalText(120),
  cantidad: z.number().int().nonnegative().optional(),
  costoGbp: z.number().nonnegative().optional(),
  proveedor: optionalText(160),
  comprobanteUrl: optionalUrl,
});

/** Schemas por tipo editable. police_checks queda afuera: es derivado. */
export const METADATA_SCHEMAS = {
  pasajes: pasajesMetadataSchema,
  excursiones: excursionesMetadataSchema,
  transfers: transfersMetadataSchema,
  tarjeta_transporte: tarjetaTransporteMetadataSchema,
} as const;

export type EditablePasoTipo = keyof typeof METADATA_SCHEMAS;

export type PasajesMetadata = z.infer<typeof pasajesMetadataSchema>;
export type ExcursionItem = z.infer<typeof excursionItemSchema>;
export type ExcursionesMetadata = z.infer<typeof excursionesMetadataSchema>;
export type TransfersMetadata = z.infer<typeof transfersMetadataSchema>;
export type TarjetaTransporteMetadata = z.infer<typeof tarjetaTransporteMetadataSchema>;
