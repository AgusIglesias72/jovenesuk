import { z } from "zod";

/**
 * Validación de Colegios (capa de dominio, pura).
 * Fuente de verdad de la validación: la usan las server actions hoy y la
 * futura API REST. Los valores de enum replican los pgEnum de
 * `@/lib/db/schema/colegios` (no hay derivación automática pgEnum -> Zod).
 */

export const tipoColegioEnum = z.enum(["destino", "cliente"]);
export const estadoColegioEnum = z.enum(["activo", "inactivo"]);
export const paisEnum = z.enum([
  "reino_unido",
  "irlanda",
  "canada",
  "malta",
  "australia",
  "argentina",
  "otro",
]);
export const tipoAlojamientoEnum = z.enum([
  "familia_anfitriona",
  "residencia",
  "campus",
  "otro",
]);

export const TIPOS_COLEGIO = tipoColegioEnum.options;
export const ESTADOS_COLEGIO = estadoColegioEnum.options;
export const PAISES = paisEnum.options;
export const TIPOS_ALOJAMIENTO = tipoAlojamientoEnum.options;

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const contactoSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre del contacto").max(120),
  email: z.string().trim().email("Email inválido"),
  telefono: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => v || undefined),
});

// Contacto opcional: si llega vacío (sin nombre ni email) lo tratamos como null.
const contactoOpcionalSchema = z.preprocess((v) => {
  if (v == null) return null;
  const c = v as { nombre?: string; email?: string };
  if (!c.nombre?.trim() && !c.email?.trim()) return null;
  return v;
}, contactoSchema.nullable());

export const colegioCreateSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre del colegio").max(200),
  tipo: tipoColegioEnum,
  pais: paisEnum,
  ciudad: z.string().trim().min(1, "Ingresá la ciudad").max(120),

  contactoAcademico: contactoSchema,
  contactoAdministrativo: contactoSchema,
  contactoAlojamientos: contactoOpcionalSchema.default(null),
  contactoJuniors: contactoOpcionalSchema.default(null),

  cursosDisponibles: z.array(z.string().trim().min(1)).default([]),
  tiposAlojamiento: z.array(tipoAlojamientoEnum).default([]),

  // CRIT-03: flag editable, sin lógica de negocio asociada todavía.
  requiereCertificadoPsicofisico: z.boolean().default(false),

  comisionAgenciaPorcentaje: z.preprocess(
    (v) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s === "" ? null : Number(s);
    },
    z
      .number()
      .int("Tiene que ser un número entero")
      .min(0, "No puede ser negativo")
      .max(100, "No puede superar 100")
      .nullable()
  ).default(null),

  sitioWeb: z
    .preprocess(emptyToNull, z.string().trim().url("URL inválida").nullable())
    .default(null),
  notas: z
    .preprocess(emptyToNull, z.string().trim().max(2000).nullable())
    .default(null),
});

export const colegioUpdateSchema = colegioCreateSchema.extend({
  id: z.string().uuid(),
});

export const colegioFiltersSchema = z.object({
  q: z.string().trim().optional(),
  tipo: tipoColegioEnum.optional(),
  pais: paisEnum.optional(),
  incluirInactivos: z.coerce.boolean().optional(),
});

export type ColegioCreateData = z.output<typeof colegioCreateSchema>;
export type ColegioUpdateData = z.output<typeof colegioUpdateSchema>;
export type ColegioFilters = z.output<typeof colegioFiltersSchema>;
