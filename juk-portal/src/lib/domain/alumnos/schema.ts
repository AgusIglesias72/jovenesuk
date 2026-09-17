import { z } from "zod";

import { PASO_CODIGOS } from "@/lib/domain/pasos/codigos";

export const alumnoEstadoEnum = z.enum([
  "pre_inscripto",
  "inscripto",
  "activo",
  "viajando",
  "finalizado",
  "baja",
]);
/**
 * Cómo entró el alumno al sistema (`canal_alta` en la base). El orden es el de
 * la UI: primero el canal propio, después el Google Form que está de salida.
 */
export const canalAltaEnum = z.enum(["formulario_web", "webhook", "alta_manual"]);
export const condicionFiscalEnum = z.enum([
  "consumidor_final",
  "responsable_inscripto",
  "monotributo",
  "exento",
  "otro",
]);

export const ALUMNO_ESTADOS = alumnoEstadoEnum.options;
export const CANALES_ALTA = canalAltaEnum.options;
export const CONDICIONES_FISCALES = condicionFiscalEnum.options;

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const fechaSchema = z.preprocess(
  (v) => (v === "" || v == null ? undefined : new Date(v as string)),
  z.date({ required_error: "Ingresá la fecha", invalid_type_error: "Fecha inválida" })
);

const textoOpcional = z.preprocess(emptyToNull, z.string().trim().nullable()).default(null);
const emailOpcional = z
  .preprocess(emptyToNull, z.string().trim().email("Email inválido").nullable())
  .default(null);

const facturacionSchema = z.object({
  razonSocial: z.string().trim().min(1, "Requerido"),
  direccion: z.string().trim().min(1, "Requerido"),
  localidad: z.string().trim().min(1, "Requerido"),
  provincia: z.string().trim().min(1, "Requerido"),
  codigoPostal: z.string().trim().min(1, "Requerido"),
  cuilCuit: z.string().trim().min(1, "Requerido"),
  condicionFiscal: condicionFiscalEnum,
});

// Facturación opcional: si no se cargó ningún dato, queda null.
const facturacionOpcional = z.preprocess((v) => {
  if (v == null) return null;
  const f = v as Record<string, string | undefined>;
  const algoCargado = [
    f.razonSocial,
    f.direccion,
    f.localidad,
    f.provincia,
    f.codigoPostal,
    f.cuilCuit,
  ].some((x) => x?.trim());
  return algoCargado ? v : null;
}, facturacionSchema.nullable());

export const alumnoCreateSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre").max(120),
  apellido: z.string().trim().min(1, "Ingresá el apellido").max(120),
  fechaNacimiento: fechaSchema,
  dni: z.string().trim().min(1, "Ingresá el DNI").max(30),
  numeroPasaporte: z.string().trim().min(1, "Ingresá el número de pasaporte").max(30),
  fechaVencimientoPasaporte: fechaSchema,

  telefonoAlumno: textoOpcional,
  emailAlumno: emailOpcional,
  alergiasSalud: textoOpcional,

  tutor1Nombre: z.string().trim().min(1, "Ingresá el nombre del tutor").max(120),
  tutor1Celular: z.string().trim().min(1, "Ingresá el celular del tutor").max(50),
  tutor1Email: z.string().trim().email("Email inválido"),

  tutor2Nombre: textoOpcional,
  tutor2Celular: textoOpcional,
  tutor2Email: emailOpcional,

  facturacion: facturacionOpcional,

  preferenciasAlojamiento: textoOpcional,
  nivelInglesAutoevaluacion: textoOpcional,

  notasInternas: textoOpcional,
});

export const alumnoUpdateSchema = alumnoCreateSchema.extend({
  id: z.string().uuid(),
  estado: alumnoEstadoEnum,
});

const vacioAUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

/**
 * Los filtros llegan desde la URL: un valor inválido se descarta solo, en vez
 * de invalidar el objeto entero y tirar abajo el resto de los filtros.
 */
const filtroUrl = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(vacioAUndefined, schema.optional()).catch(undefined);

/** El Paso 0 es de solo lectura (lo setea el sistema): nunca queda "pendiente". */
export const pasoFiltrableEnum = z.enum(PASO_CODIGOS).exclude(["paso_0"]);
export const PASOS_FILTRABLES = pasoFiltrableEnum.options;

/**
 * US-17: viaje, estado general, alertas activas y paso de trámite pendiente.
 * `canalAlta` se suma para poder ver de un vistazo los que entraron por el
 * formulario público.
 */
export const alumnoFiltersSchema = z.object({
  q: filtroUrl(z.string().trim()),
  estado: filtroUrl(alumnoEstadoEnum),
  alerta: filtroUrl(z.enum(["pasos_bloqueados"])),
  viajeId: filtroUrl(z.string().uuid()),
  paso: filtroUrl(pasoFiltrableEnum),
  canalAlta: filtroUrl(canalAltaEnum),
});

export type AlumnoCreateData = z.output<typeof alumnoCreateSchema>;
export type AlumnoUpdateData = z.output<typeof alumnoUpdateSchema>;
export type AlumnoFilters = z.output<typeof alumnoFiltersSchema>;
