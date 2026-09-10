import { z } from "zod";

/** URL opcional: vacía, ausente, o una URL válida (≤500). Sin upload R2 todavía. */
const optionalUrl = z.union([z.string().trim().url().max(500), z.literal("")]).optional();
const optionalText = (max: number) => z.string().trim().max(max).optional();

export type TipoViajePasajes = "grupal" | "individual";

/**
 * PRD M7 Paso 1. Grupal: JUK coordina con la agencia. Individual: el alumno
 * compra y JUK solo registra los datos del vuelo.
 */
export const PASAJE_SUBESTADOS_GRUPAL = [
  "pendiente_cotizacion",
  "cotizado",
  "confirmado",
  "emitido",
] as const;
export const PASAJE_SUBESTADOS_INDIVIDUAL = ["pendiente_datos", "datos_recibidos"] as const;
export const PASAJE_SUBESTADOS = [
  ...PASAJE_SUBESTADOS_GRUPAL,
  ...PASAJE_SUBESTADOS_INDIVIDUAL,
] as const;
export type PasajeSubEstado = (typeof PASAJE_SUBESTADOS)[number];

/** PRD M7 Paso 2 (US-38, CRIT-04 ⭐: el representante aprueba). */
export const EXCURSION_ESTADOS = [
  "propuesta",
  "aprobada_representante",
  "confirmada",
  "cancelada",
] as const;
export type ExcursionEstado = (typeof EXCURSION_ESTADOS)[number];

/**
 * Valores que guardaba la primera versión del M7 → su equivalente del PRD. Se
 * traducen al leer (no hay migración SQL) para que el cambio sea revertible
 * mientras CRIT-04 siga "a validar con el equipo".
 */
export const PASAJE_SUBESTADO_LEGACY: Readonly<Record<string, PasajeSubEstado>> = {
  sin_iniciar: "pendiente_cotizacion",
  reservado: "confirmado",
};
export const EXCURSION_ESTADO_LEGACY: Readonly<Record<string, ExcursionEstado>> = {
  reservada: "confirmada",
  pagada: "confirmada",
};

function traducirLegacy<T extends string>(
  legacy: Readonly<Record<string, T>>
): (v: unknown) => unknown {
  return (v) =>
    typeof v === "string" && Object.prototype.hasOwnProperty.call(legacy, v) ? legacy[v] : v;
}

function normalizar<T extends string>(
  validos: readonly T[],
  legacy: Readonly<Record<string, T>>,
  v: unknown
): T | undefined {
  if (typeof v !== "string" || v === "") return undefined;
  if ((validos as readonly string[]).includes(v)) return v as T;
  return Object.prototype.hasOwnProperty.call(legacy, v) ? legacy[v] : undefined;
}

/** Sub-estado vigente de un valor guardado (legacy incluido). Desconocido → undefined, nunca error. */
export function normalizarPasajeSubEstado(v: unknown): PasajeSubEstado | undefined {
  return normalizar(PASAJE_SUBESTADOS, PASAJE_SUBESTADO_LEGACY, v);
}

export function normalizarExcursionEstado(v: unknown): ExcursionEstado | undefined {
  return normalizar(EXCURSION_ESTADOS, EXCURSION_ESTADO_LEGACY, v);
}

export function pasajeSubEstadosDe(tipoViaje: TipoViajePasajes): readonly PasajeSubEstado[] {
  return tipoViaje === "individual" ? PASAJE_SUBESTADOS_INDIVIDUAL : PASAJE_SUBESTADOS_GRUPAL;
}

export function esPasajeSubEstadoDe(subEstado: string, tipoViaje: TipoViajePasajes): boolean {
  return (pasajeSubEstadosDe(tipoViaje) as readonly string[]).includes(subEstado);
}

export const pasajesMetadataSchema = z.object({
  subEstado: z.preprocess(
    traducirLegacy(PASAJE_SUBESTADO_LEGACY),
    z.enum(PASAJE_SUBESTADOS).optional()
  ),
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
  estado: z.preprocess(
    traducirLegacy(EXCURSION_ESTADO_LEGACY),
    z.enum(EXCURSION_ESTADOS).optional()
  ),
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

/**
 * Cobertura por alumno (PRD M7 P3/P4): transfers y tarjetas se marcan alumno
 * por alumno; el paso se completa cuando TODOS los activos están cubiertos.
 * `porAlumno` mapea asignacionId → cubierto.
 */
export type CoberturaPorAlumno = {
  marcados: number;
  total: number;
  completo: boolean;
};

export function coberturaPorAlumno(
  porAlumno: Record<string, boolean> | undefined,
  asignacionesActivas: string[]
): CoberturaPorAlumno {
  const marcados = asignacionesActivas.filter((id) => porAlumno?.[id] === true).length;
  const total = asignacionesActivas.length;
  return { marcados, total, completo: total > 0 && marcados === total };
}

export const PASOS_POR_ALUMNO = ["transfers", "tarjeta_transporte"] as const;
export type PasoPorAlumno = (typeof PASOS_POR_ALUMNO)[number];
