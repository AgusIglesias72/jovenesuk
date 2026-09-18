import { z } from "zod";

import { diaCalendarioUTC } from "@/lib/utils/date";
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

const excedido = (max: number) => `Te pasaste: máximo ${max} caracteres.`;

const textoOpcional = (max: number) =>
  z.preprocess(vacioAUndefined, z.string().trim().max(max, excedido(max)).optional());

/**
 * QUÉ CARACTERES ACEPTA CADA CAMPO
 * --------------------------------
 * Los sets viven en el schema, y no en el formulario, porque son la ÚNICA
 * fuente de verdad: el mensaje que la familia ve mientras escribe sale de acá
 * (`validarCampoInscripcion`), y el que el server devuelve si igual manda la
 * ficha, también. Una segunda regla escrita en el navegador se desincroniza
 * sola, y el resultado es un formulario que marca en rojo algo que el server
 * acepta (o al revés).
 *
 * Son deliberadamente anchos: rechazan lo IMPOSIBLE (una letra en el DNI, un
 * número en el nombre), no lo raro. Un falso rechazo en un formulario público
 * es una familia perdida.
 */

/** El DNI admite el formateo que la gente tipea: "45.102.338", "45-102-338". */
export const CARACTERES_DNI = /^[\d.\-\s]+$/;
/** Un celular con código de país, paréntesis o separadores: "+54 9 11 5555-0000". */
export const CARACTERES_TELEFONO = /^[\d+()\-./\s]+$/;
/** Pasaportes de cualquier país: letras y números, sin símbolos. */
export const CARACTERES_PASAPORTE = /^[A-Za-z0-9\s-]+$/;
/** Nombres con tildes, diéresis, apóstrofes y guiones ("O'Brien", "Ana-María"). */
export const CARACTERES_NOMBRE = /^[\p{L}\p{M}\s'’.-]+$/u;
/** Un email no lleva espacios y tiene un solo arroba. */
export const CARACTERES_EMAIL = /^[^\s@]*@?[^\s@]*$/;

export const MENSAJE_EMAIL_ESPACIOS = "El email va sin espacios y con un solo @.";
export const MENSAJE_EMAIL_INVALIDO =
  "Revisá el email: parece que le falta el @ o el dominio.";
export const MENSAJE_TELEFONO_CARACTERES =
  "El celular va con números; podés usar +, espacios y guiones.";
export const MENSAJE_TELEFONO_CORTO =
  "Poné el celular con el código de área (al menos 8 números).";
/** Una fecha que no existe en el calendario, o que quedó a medio tipear. */
export const MENSAJE_FECHA_INVALIDA = "Esa fecha no existe. Va DD/MM/AAAA.";

const DIGITOS_TELEFONO_MINIMOS = 8;

const emailRequerido = (mensajeVacio: string) =>
  z
    .string({ required_error: mensajeVacio, invalid_type_error: mensajeVacio })
    .trim()
    .min(1, mensajeVacio)
    .max(160, excedido(160))
    .regex(CARACTERES_EMAIL, MENSAJE_EMAIL_ESPACIOS)
    .email(MENSAJE_EMAIL_INVALIDO);

const emailOpcional = z.preprocess(
  vacioAUndefined,
  z
    .string()
    .trim()
    .max(160, excedido(160))
    .regex(CARACTERES_EMAIL, MENSAJE_EMAIL_ESPACIOS)
    .email(MENSAJE_EMAIL_INVALIDO)
    .optional()
);

/** Un nombre de persona: el orden de los checks fija cuál mensaje se muestra primero. */
const nombrePersona = (mensajeVacio: string, mensajeCaracteres: string) =>
  z
    .string({ required_error: mensajeVacio, invalid_type_error: mensajeVacio })
    .trim()
    .min(1, mensajeVacio)
    .max(120, excedido(120))
    .regex(CARACTERES_NOMBRE, mensajeCaracteres);

const telefono = (mensajeVacio: string, max: number) =>
  z
    .string({ required_error: mensajeVacio, invalid_type_error: mensajeVacio })
    .trim()
    .min(1, mensajeVacio)
    .max(max, excedido(max))
    .regex(CARACTERES_TELEFONO, MENSAJE_TELEFONO_CARACTERES)
    .refine(
      (v) => soloDigitos(v).length >= DIGITOS_TELEFONO_MINIMOS,
      MENSAJE_TELEFONO_CORTO
    );

/**
 * Las fechas del formulario viajan como string AAAA-MM-DD (lo que emite un
 * input de fecha) y se guardan así: convertirlas a `Date` en el borde del
 * sistema mete el huso horario del navegador y corre un cumpleaños un día.
 * El refine descarta días que existen en el regex pero no en el calendario
 * (2026-02-31).
 */
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * El campo vacío y la fecha imposible son dos problemas distintos y se dicen
 * distinto: "12/05/201" a medio tipear deja el valor del form en blanco, y
 * "Ingresá la fecha" con el campo lleno a la vista no ayuda a nadie.
 */
const fechaIso = (mensajeVacio: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ required_error: mensajeVacio, invalid_type_error: mensajeVacio })
      .min(1, mensajeVacio)
      .regex(FECHA_ISO, MENSAJE_FECHA_INVALIDA)
      .refine(esFechaDeCalendario, MENSAJE_FECHA_INVALIDA)
  );

function esFechaDeCalendario(valor: string): boolean {
  const [anio, mes, dia] = valor.split("-").map(Number);
  if (anio === undefined || mes === undefined || dia === undefined) return false;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
  );
}

/** Día de calendario UTC de un ISO ya validado (para comparar vencimientos). */
export function diaDeFechaIso(valor: string): number {
  const [anio, mes, dia] = valor.split("-").map(Number);
  return Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1);
}

/**
 * Un año anterior a este no es una fecha de nacimiento: es un dedo que se fue
 * al año equivocado ("1009") y una ficha que después hay que perseguir.
 */
const ANIO_NACIMIENTO_MINIMO = 1900;

const fechaNacimientoSchema = fechaIso("Ingresá la fecha de nacimiento")
  .refine(
    (v) => diaDeFechaIso(v) <= diaCalendarioUTC(new Date()),
    "La fecha de nacimiento no puede ser futura."
  )
  .refine(
    (v) => Number(v.slice(0, 4)) >= ANIO_NACIMIENTO_MINIMO,
    "Revisá el año de nacimiento."
  );

/**
 * TEC-12: todo punto de entrada nuevo de DNI normaliza a dígitos. El form
 * público es el caso típico de "45.102.338" tipeado a mano; si entrara con
 * puntos, la idempotencia por DNI y el slug de /alumnos/<dni> verían dos
 * alumnos distintos.
 *
 * El regex corre ANTES de normalizar: si `soloDigitos` limpiara primero, un DNI
 * con una letra ("45102a") llegaría a validarse como "45102" y el mensaje
 * hablaría del largo en vez de decir lo que realmente pasó. Es el pedido
 * textual del dueño: marcar la letra, no el síntoma.
 */
const dniSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z
    .string({ required_error: "Ingresá el DNI", invalid_type_error: "Ingresá el DNI" })
    .min(1, "Ingresá el DNI")
    .regex(CARACTERES_DNI, "El DNI va solo con números.")
    .transform(soloDigitos)
    .pipe(
      z
        .string()
        .min(6, "El DNI tiene que tener al menos 6 números.")
        .max(20, "Ese DNI tiene demasiados números.")
    )
);

export const inscripcionSchema = z.object({
  // Personales (como figuran en el pasaporte)
  nombre: nombrePersona("Ingresá el nombre", "El nombre va solo con letras."),
  apellido: nombrePersona("Ingresá el apellido", "El apellido va solo con letras."),
  fechaNacimiento: fechaNacimientoSchema,
  dni: dniSchema,
  numeroPasaporte: z
    .string({
      required_error: "Ingresá el número de pasaporte",
      invalid_type_error: "Ingresá el número de pasaporte",
    })
    .trim()
    .min(1, "Ingresá el número de pasaporte")
    .min(5, "Ingresá el número completo del pasaporte.")
    .max(30, excedido(30))
    .regex(CARACTERES_PASAPORTE, "El pasaporte va con letras y números, sin símbolos."),
  fechaVencimientoPasaporte: fechaIso("Ingresá el vencimiento del pasaporte"),

  // Tutor 1 (siempre requerido)
  tutor1Nombre: nombrePersona(
    "Ingresá el nombre y el apellido",
    "El nombre va solo con letras."
  ),
  tutor1Celular: telefono("Ingresá el celular del tutor", 50),
  tutor1Email: emailRequerido("Ingresá el email del adulto responsable"),

  // Contacto y preferencias del alumno (opcionales, como en el webhook)
  telefonoAlumno: z.preprocess(
    vacioAUndefined,
    z
      .string()
      .trim()
      .max(50, excedido(50))
      .regex(CARACTERES_TELEFONO, MENSAJE_TELEFONO_CARACTERES)
      .optional()
  ),
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

  /**
   * Consentimiento explícito: sin esto no hay inscripción (no es opt-out).
   *
   * El mensaje va por `errorMap` y no por `required_error`: un literal que no
   * coincide emite `invalid_literal`, que ningún `*_error` cubre, y la familia
   * terminaba leyendo "Invalid literal value, expected true".
   */
  acepta: z.literal(true, {
    errorMap: () => ({ message: "Tenés que aceptar para continuar" }),
  }),
});

export type InscripcionData = z.output<typeof inscripcionSchema>;
export type InscripcionInput = z.input<typeof inscripcionSchema>;

/**
 * El checkbox del consentimiento, tal como lo manda un form HTML: "on" cuando
 * está tildado, ausente cuando no. Vive acá para que el server y la validación
 * en vivo del navegador coercionen el MISMO valor: dos reglas para el mismo
 * casillero terminan marcando en rojo algo que el server acepta.
 */
export function aceptaDesdeFormulario(valor: string | undefined | null): boolean {
  return valor === "on" || valor === "true";
}

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
