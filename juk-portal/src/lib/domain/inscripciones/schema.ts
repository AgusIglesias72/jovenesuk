import { z } from "zod";

import { soloDigitos } from "@/lib/utils/dni";

import { NumeroInscripcionInvalidoError } from "./errors";

/**
 * Application Form propio (etapa 2) — la ficha que hoy entra por el webhook del
 * Google Form (`src/app/api/webhooks/google-form/route.ts`), con los mismos
 * campos obligatorios y opcionales.
 *
 * El formulario es PÚBLICO: se llega por un link tokenizado y el token no lleva
 * datos personales, solo contexto de campaña. Por eso el schema NO acepta
 * `viajeId`, `alumnoId`, `comunicacionId` ni `estado`: esos se derivan
 * server-side del token y del estado de la base. Si viajeran en el body, quien
 * tenga el link podría inscribir a cualquiera en cualquier viaje, pisar una
 * inscripción ajena o darse por procesado a sí mismo. Las claves de más se
 * descartan al parsear (zod hace strip), nunca llegan al output.
 */

/**
 * Estados de una inscripción. No son etapas de un trámite: cuentan qué pasó con
 * el alta automática, que es la información que la bandeja necesita para actuar.
 *
 * - `recibida`: la ficha entró y todavía no se intentó dar de alta al alumno.
 * - `procesada`: el alumno se creó (o se reusó) y la ficha ya no requiere nada.
 * - `duplicada`: ese DNI ya estaba cargado. No es un error: se guarda igual, sin
 *   tocar al alumno existente ni su cuenta de familia.
 * - `requiere_revision`: LA COMPUERTA. La carga llegó sin token válido, o el
 *   alta tocaría una cuenta de familia que ya existe. Un humano decide: una
 *   carga anónima no puede colgarse de la cuenta de otra familia.
 * - `error`: el alta falló por una causa real (viaje sin cupo, falla de base).
 *   Queda el motivo y se puede reintentar; nunca un fallo mudo.
 * - `anulada`: la descartó el equipo. Es el único estado que libera la
 *   invitación para que esa familia pueda volver a cargar.
 */
export const inscripcionEstadoEnum = z.enum([
  "recibida",
  "procesada",
  "duplicada",
  "requiere_revision",
  "error",
  "anulada",
]);
export const INSCRIPCION_ESTADOS = inscripcionEstadoEnum.options;
export type InscripcionEstado = z.output<typeof inscripcionEstadoEnum>;

/** Variantes visuales del formulario. Son SOLO estéticas: la ficha es la misma. */
export const VARIANTES = ["a", "b", "c"] as const;
export type Variante = (typeof VARIANTES)[number];
export const varianteEnum = z.enum(VARIANTES);
export const VARIANTE_POR_DEFECTO: Variante = "a";

const vacioAUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const textoOpcional = (max: number) =>
  z.preprocess(vacioAUndefined, z.string().trim().max(max).optional());

const emailOpcional = z.preprocess(
  vacioAUndefined,
  z.string().trim().max(160).email("Email inválido").optional()
);

/**
 * Las fechas del formulario viajan como string AAAA-MM-DD (lo que emite un
 * input de fecha) y se guardan así: convertirlas a `Date` en el borde del
 * sistema mete el huso horario del navegador y corre un cumpleaños un día.
 * El refine descarta días que existen en el regex pero no en el calendario
 * (2026-02-31).
 */
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const fechaIso = (mensaje: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ required_error: mensaje, invalid_type_error: mensaje })
      .regex(FECHA_ISO, mensaje)
      .refine(esFechaDeCalendario, mensaje)
  );

function esFechaDeCalendario(valor: string): boolean {
  const [anio, mes, dia] = valor.split("-").map(Number);
  if (anio === undefined || mes === undefined || dia === undefined) return false;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
  );
}

/**
 * TEC-12: todo punto de entrada nuevo de DNI normaliza a dígitos. El form
 * público es el caso típico de "45.102.338" tipeado a mano; si entrara con
 * puntos, la idempotencia por DNI y el slug de /alumnos/<dni> verían dos
 * alumnos distintos.
 */
const dniSchema = z.preprocess(
  (v) => (typeof v === "string" ? soloDigitos(v) : v),
  z
    .string({ required_error: "Ingresá el DNI" })
    .min(6, "Ingresá un DNI válido")
    .max(20, "Ingresá un DNI válido")
);

export const inscripcionSchema = z.object({
  // Personales (como figuran en el pasaporte)
  nombre: z.string().trim().min(1, "Ingresá el nombre").max(120),
  apellido: z.string().trim().min(1, "Ingresá el apellido").max(120),
  fechaNacimiento: fechaIso("Ingresá la fecha de nacimiento"),
  dni: dniSchema,
  numeroPasaporte: z.string().trim().min(1, "Ingresá el número de pasaporte").max(30),
  fechaVencimientoPasaporte: fechaIso("Ingresá el vencimiento del pasaporte"),

  // Tutor 1 (siempre requerido)
  tutor1Nombre: z.string().trim().min(1, "Ingresá el nombre del tutor").max(120),
  tutor1Celular: z.string().trim().min(1, "Ingresá el celular del tutor").max(50),
  tutor1Email: z.string().trim().max(160).email("Email inválido"),

  // Contacto y preferencias del alumno (opcionales, como en el webhook)
  telefonoAlumno: textoOpcional(50),
  emailAlumno: emailOpcional,
  alergiasSalud: textoOpcional(2000),
  preferenciasAlojamiento: textoOpcional(500),
  nivelInglesAutoevaluacion: textoOpcional(100),

  /**
   * Honeypot: campo oculto que una persona nunca completa y un bot sí. Se
   * acepta para poder detectarlo (`esHoneypotRelleno`) y responder como si
   * todo hubiera salido bien, en vez de rechazar y enseñarle al bot qué falló.
   */
  website: textoOpcional(200),

  /** Consentimiento explícito: sin esto no hay inscripción (no es opt-out). */
  acepta: z.literal(true, {
    required_error: "Tenés que aceptar para continuar",
    invalid_type_error: "Tenés que aceptar para continuar",
  }),
});

export type InscripcionData = z.output<typeof inscripcionSchema>;
export type InscripcionInput = z.input<typeof inscripcionSchema>;

/** Un envío con el honeypot relleno se descarta en silencio (ver `website`). */
export function esHoneypotRelleno(datos: { website?: string | null }): boolean {
  return typeof datos.website === "string" && datos.website.trim() !== "";
}

function aVariante(valor: unknown): Variante | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim().toLowerCase();
  return (VARIANTES as readonly string[]).includes(v) ? (v as Variante) : null;
}

/**
 * Precedencia: parámetro del link > variante de la campaña > variante de
 * /configuracion > "a". Las tres entradas son `unknown` a propósito: el param
 * llega de la URL y un `?v=<script>` tiene que caer al siguiente escalón, no
 * romper la página pública.
 */
export function resolverVariante(entrada: {
  param?: unknown;
  campana?: unknown;
  setting?: unknown;
}): Variante {
  return (
    aVariante(entrada.param) ??
    aVariante(entrada.campana) ??
    aVariante(entrada.setting) ??
    VARIANTE_POR_DEFECTO
  );
}

const CODIGO_INSCRIPCION = /^INS-(\d{6,})$/;
const DIGITOS_CODIGO = 6;

/**
 * Código público de la inscripción: INS-000123. Correlativo y sin año — el
 * número no se reinicia, así que el código identifica una sola inscripción
 * para siempre y se puede dictar por teléfono.
 */
export function codigoInscripcion(numero: number): string {
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new NumeroInscripcionInvalidoError(numero);
  }
  return `INS-${String(numero).padStart(DIGITOS_CODIGO, "0")}`;
}

/** Inversa de `codigoInscripcion`. Devuelve null si el código no es válido. */
export function parsearCodigoInscripcion(codigo: unknown): number | null {
  if (typeof codigo !== "string") return null;
  const match = CODIGO_INSCRIPCION.exec(codigo.trim().toUpperCase());
  if (!match?.[1]) return null;
  const numero = Number(match[1]);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Los filtros de la bandeja llegan desde la URL: un valor inválido se descarta
 * solo, en vez de invalidar el objeto entero y tirar abajo el resto de los
 * filtros (mismo criterio que `alumnoFiltersSchema`).
 */
const filtroUrl = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(vacioAUndefined, schema.optional()).catch(undefined);

export const inscripcionFiltersSchema = z.object({
  q: filtroUrl(z.string().trim()),
  estado: filtroUrl(inscripcionEstadoEnum),
  viajeId: filtroUrl(z.string().uuid()),
  variante: filtroUrl(varianteEnum),
});

export type InscripcionFilters = z.output<typeof inscripcionFiltersSchema>;
