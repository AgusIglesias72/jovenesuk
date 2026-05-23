import { z } from "zod";

export const policeCheckEstadoEnum = z.enum([
  "pendiente",
  "en_tramite",
  "aprobado",
  "vencido",
]);

export const POLICE_CHECK_ESTADOS = policeCheckEstadoEnum.options;

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const textoOpcional = z.preprocess(emptyToNull, z.string().trim().nullable()).default(null);
const fechaOpcional = z
  .preprocess(
    (v) => (v === "" || v == null ? null : new Date(v as string)),
    z.date({ invalid_type_error: "Fecha inválida" }).nullable()
  )
  .default(null);

export const groupLeaderCreateSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre").max(120),
  apellido: z.string().trim().min(1, "Ingresá el apellido").max(120),
  email: z.string().trim().email("Email inválido"),
  telefono: textoOpcional,
  documento: textoOpcional,
  policeCheckEstado: policeCheckEstadoEnum,
  policeCheckFechaEmision: fechaOpcional,
  policeCheckFechaVencimiento: fechaOpcional,
});

export const groupLeaderUpdateSchema = groupLeaderCreateSchema.extend({
  id: z.string().uuid(),
});

export const groupLeaderFiltersSchema = z.object({
  q: z.string().trim().optional(),
  policeCheckEstado: policeCheckEstadoEnum.optional(),
});

export type GroupLeaderCreateData = z.output<typeof groupLeaderCreateSchema>;
export type GroupLeaderUpdateData = z.output<typeof groupLeaderUpdateSchema>;
export type GroupLeaderFilters = z.output<typeof groupLeaderFiltersSchema>;
