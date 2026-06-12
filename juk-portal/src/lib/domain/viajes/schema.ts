import { z } from "zod";

import { paisEnum, tipoAlojamientoEnum } from "@/lib/domain/colegios";

export const viajeEstadoEnum = z.enum([
  "inscripcion_abierta",
  "confirmado",
  "en_curso",
  "finalizado",
  "cancelado",
]);
export const viajeTipoEnum = z.enum(["grupal", "individual"]);
export const viajeOrigenEnum = z.enum([
  "representante_independiente",
  "instituto",
  "colegio_cliente",
  "juk_directo",
]);

export const VIAJE_ESTADOS = viajeEstadoEnum.options;
export const VIAJE_TIPOS = viajeTipoEnum.options;
export const VIAJE_ORIGENES = viajeOrigenEnum.options;

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

// Trip codes siguen el patrón UK-YYYY-MMM-CITY (ver CLAUDE.md).
const codigoRegex = /^UK-\d{4}-[A-Z]{3}-[A-Z]+$/;

const fechaSchema = z.preprocess(
  (v) => (v === "" || v == null ? undefined : new Date(v as string)),
  z.date({ required_error: "Ingresá la fecha", invalid_type_error: "Fecha inválida" })
);

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    schema.nullable()
  ).default(null);

const viajeBase = z.object({
  codigo: z
    .string()
    .trim()
    .regex(codigoRegex, "Formato: UK-AAAA-MMM-CIUDAD (ej. UK-2026-JUL-LONDON)"),
  nombre: z.string().trim().min(1, "Ingresá el nombre del viaje").max(200),
  tipo: viajeTipoEnum.default("grupal"),
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
  // 0 solo para viajes Individuales (refinement glOk); Grupales: 1..20.
  cantidadGroupLeaders: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(0, "Mínimo 0")
    .max(20, "Máximo 20"),
  capacidadMinima: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1")
    .max(500),
  // Referencia interna (v1 no calcula precios). Visibles solo para admins.
  comisionAgenciaPct: optionalNumber(
    z.number().int("Debe ser un entero").min(0).max(100)
  ),
  feeRepresentante: optionalNumber(z.number().nonnegative("No puede ser negativo")),
  feeRepresentanteEsPorcentaje: z.coerce.boolean().default(false),
  notasInternas: z
    .preprocess(emptyToNull, z.string().trim().max(2000).nullable())
    .default(null),
});

type ViajeBaseShape = z.output<typeof viajeBase>;

const fechasOk = (d: { fechaInicio: Date; fechaFin: Date }) =>
  d.fechaFin >= d.fechaInicio;
const clienteOk = (d: { origen: string; colegioClienteId: string | null }) =>
  d.origen !== "colegio_cliente" || d.colegioClienteId != null;
// Grupal necesita al menos 1 GL; Individual viaja sin GL (US-10b).
const glOk = (d: ViajeBaseShape) =>
  d.tipo === "individual" ? d.cantidadGroupLeaders === 0 : d.cantidadGroupLeaders >= 1;

const FECHAS_MSG = {
  message: "La fecha de fin no puede ser anterior al inicio",
  path: ["fechaFin"],
};
const CLIENTE_MSG = {
  message: "Elegí el colegio cliente para este origen",
  path: ["colegioClienteId"],
};
const GL_MSG = {
  message: "Grupal: al menos 1 group leader. Individual: sin group leaders (0).",
  path: ["cantidadGroupLeaders"],
};

export const viajeCreateSchema = viajeBase
  .refine(fechasOk, FECHAS_MSG)
  .refine(clienteOk, CLIENTE_MSG)
  .refine(glOk, GL_MSG);

export const viajeUpdateSchema = viajeBase
  .extend({ id: z.string().uuid(), estado: viajeEstadoEnum })
  .refine(fechasOk, FECHAS_MSG)
  .refine(clienteOk, CLIENTE_MSG)
  .refine(glOk, GL_MSG);

export const viajeFiltersSchema = z.object({
  q: z.string().trim().optional(),
  estado: viajeEstadoEnum.optional(),
  origen: viajeOrigenEnum.optional(),
  tipo: viajeTipoEnum.optional(),
});

export type ViajeCreateData = z.output<typeof viajeCreateSchema>;
export type ViajeUpdateData = z.output<typeof viajeUpdateSchema>;
export type ViajeFilters = z.output<typeof viajeFiltersSchema>;

/**
 * Capacidad del viaje (PRD §4): Grupal = GL × 12 (editable solo hacia abajo);
 * Individual = fija en 1.
 */
export function capacidadMaxima(
  cantidadGroupLeaders: number,
  tipo: "grupal" | "individual" = "grupal"
): number {
  if (tipo === "individual") return 1;
  return cantidadGroupLeaders * 12;
}
