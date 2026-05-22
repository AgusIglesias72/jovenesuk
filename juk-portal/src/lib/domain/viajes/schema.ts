import { z } from "zod";

import { paisEnum, tipoAlojamientoEnum } from "@/lib/domain/colegios";

export const viajeEstadoEnum = z.enum([
  "inscripcion_abierta",
  "confirmado",
  "en_curso",
  "finalizado",
  "cancelado",
]);
export const viajeOrigenEnum = z.enum([
  "representante_independiente",
  "instituto",
  "colegio_cliente",
]);
export const ultimoPagoEnum = z.enum(["si", "no"]);

export const VIAJE_ESTADOS = viajeEstadoEnum.options;
export const VIAJE_ORIGENES = viajeOrigenEnum.options;

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

// Trip codes siguen el patrón UK-YYYY-MMM-CITY (ver CLAUDE.md).
const codigoRegex = /^UK-\d{4}-[A-Z]{3}-[A-Z]+$/;

const fechaSchema = z.preprocess(
  (v) => (v === "" || v == null ? undefined : new Date(v as string)),
  z.date({ required_error: "Ingresá la fecha", invalid_type_error: "Fecha inválida" })
);

const viajeBase = z.object({
  codigo: z
    .string()
    .trim()
    .regex(codigoRegex, "Formato: UK-AAAA-MMM-CIUDAD (ej. UK-2026-JUL-LONDON)"),
  nombre: z.string().trim().min(1, "Ingresá el nombre del viaje").max(200),
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  origen: viajeOrigenEnum,
  colegioDestinoId: z.string().uuid("Elegí un colegio destino"),
  colegioClienteId: z
    .preprocess(emptyToNull, z.string().uuid().nullable())
    .default(null),
  paisDestino: paisEnum,
  curso: z.string().trim().min(1, "Ingresá el curso").max(200),
  tipoAlojamientoSolicitado: tipoAlojamientoEnum,
  cantidadGroupLeaders: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1")
    .max(20, "Máximo 20"),
  capacidadMinima: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1")
    .max(500),
  // Manual por CRIT-01: NO derivamos esto de `origen` hasta cerrar el flujo de pago NEA.
  ultimoPagoPresencial: ultimoPagoEnum,
  notasInternas: z
    .preprocess(emptyToNull, z.string().trim().max(2000).nullable())
    .default(null),
});

const fechasOk = (d: { fechaInicio: Date; fechaFin: Date }) =>
  d.fechaFin >= d.fechaInicio;
const clienteOk = (d: { origen: string; colegioClienteId: string | null }) =>
  d.origen !== "colegio_cliente" || d.colegioClienteId != null;

const FECHAS_MSG = {
  message: "La fecha de fin no puede ser anterior al inicio",
  path: ["fechaFin"],
};
const CLIENTE_MSG = {
  message: "Elegí el colegio cliente para este origen",
  path: ["colegioClienteId"],
};

export const viajeCreateSchema = viajeBase
  .refine(fechasOk, FECHAS_MSG)
  .refine(clienteOk, CLIENTE_MSG);

export const viajeUpdateSchema = viajeBase
  .extend({ id: z.string().uuid(), estado: viajeEstadoEnum })
  .refine(fechasOk, FECHAS_MSG)
  .refine(clienteOk, CLIENTE_MSG);

export const viajeFiltersSchema = z.object({
  q: z.string().trim().optional(),
  estado: viajeEstadoEnum.optional(),
  origen: viajeOrigenEnum.optional(),
});

export type ViajeCreateData = z.output<typeof viajeCreateSchema>;
export type ViajeUpdateData = z.output<typeof viajeUpdateSchema>;
export type ViajeFilters = z.output<typeof viajeFiltersSchema>;

/** Capacidad del viaje = Group Leaders × 12 (PRD §4). */
export function capacidadMaxima(cantidadGroupLeaders: number): number {
  return cantidadGroupLeaders * 12;
}
