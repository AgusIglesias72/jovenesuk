/**
 * Plazos de retención de los datos del Application Form y la decisión PURA de
 * qué purgar (MIN-16, Ley 25.326: un dato se conserva mientras sea necesario
 * para la finalidad que lo justificó).
 *
 * Acá solo se decide; el barrido lo hace el job, que consulta por
 * `fechaDeCorte` y confirma fila por fila con `debePurgar`. La fecha SIEMPRE
 * entra por parámetro (`ahora`): sin `Date.now()` adentro el test fija el día
 * y el borde se puede probar de verdad.
 *
 * Lo que estos plazos NO cubren (y hoy no tiene borrado automático): la ficha
 * del alumno ya procesado, sus documentos y las consultas de la web pública.
 * Sigue abierto en OPEN_DECISIONS.md (MIN-16 y TEC-02) y la política lo dice
 * con todas las letras.
 */

import { diasEntre } from "@/lib/utils/date";

export type ClaseRetencion =
  | "inscripcion_procesada"
  | "inscripcion_sin_procesar"
  | "invitacion_sin_usar";

export type PlazoRetencion = {
  dias: number;
  /** Desde qué fecha se cuenta el plazo. */
  desde: string;
  /** Por qué ese plazo y no otro (lo lee quien audite, no el código). */
  motivo: string;
};

export const RETENCION: Record<ClaseRetencion, PlazoRetencion> = {
  inscripcion_procesada: {
    dias: 90,
    desde: "la fecha en que la inscripción se procesó",
    motivo:
      "Una vez volcada a la ficha del alumno, el envío crudo solo sirve para reprocesar o auditar un error de carga. Tres meses alcanzan.",
  },
  inscripcion_sin_procesar: {
    dias: 730,
    desde: "la fecha en que se recibió la inscripción",
    motivo:
      "Una inscripción que nunca se procesó puede corresponder a una familia que retomó el viaje una temporada después. Dos años cubren ese ciclo.",
  },
  invitacion_sin_usar: {
    dias: 90,
    desde: "la fecha de vencimiento de la invitación",
    motivo:
      "Vencida y nunca usada, la invitación solo guarda el email de contacto. Se conserva un trimestre por si hay que reemitirla.",
  },
};

export type EstadoInscripcion = "sin_procesar" | "procesada" | "purgada";
export type EstadoInvitacion = "sin_usar" | "usada" | "purgada";

/**
 * Fila candidata a purga. `fecha` es la de referencia de su clase:
 * la de procesamiento o la de recepción para una inscripción, la de
 * vencimiento para una invitación.
 */
export type FilaRetenible =
  | { tipo: "inscripcion"; estado: EstadoInscripcion; fecha: Date }
  | { tipo: "invitacion"; estado: EstadoInvitacion; fecha: Date };

/** Clase de retención de una fila, o null si nunca se purga. */
export function claseDe(fila: FilaRetenible): ClaseRetencion | null {
  // Una fila ya purgada no vuelve a tocarse: el dato personal no está más y
  // re-purgarla solo generaría escrituras y auditoría de la nada.
  if (fila.estado === "purgada") return null;

  if (fila.tipo === "inscripcion") {
    return fila.estado === "procesada" ? "inscripcion_procesada" : "inscripcion_sin_procesar";
  }

  // Una invitación usada deja de ser una invitación: su rastro vive en la
  // inscripción que generó y se purga con ella.
  return fila.estado === "usada" ? null : "invitacion_sin_usar";
}

/**
 * Día calendario UTC a partir del cual una fila de esta clase queda fuera de
 * plazo. El job barre las filas con `fecha` ANTERIOR a este corte.
 */
export function fechaDeCorte(clase: ClaseRetencion, ahora: Date): Date {
  const dia = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  return new Date(dia - RETENCION[clase].dias * 86_400_000);
}

/**
 * ¿Esta fila hay que purgarla?
 *
 * El plazo se cumple entero: con 90 días de retención, el día 90 todavía se
 * conserva y recién el 91 se purga.
 */
export function debePurgar(entrada: FilaRetenible & { ahora: Date }): boolean {
  const clase = claseDe(entrada);
  if (clase === null) return false;

  return diasEntre(entrada.fecha, entrada.ahora) > RETENCION[clase].dias;
}

/**
 * Con qué queda un campo de texto personal después de la purga.
 *
 * Vacío y no un "(purgado)": lo que la fila dice de una persona tiene que ser
 * NADA, y el cartel de que los datos se purgaron lo pone la pantalla leyendo
 * `datos_purgados_el`, que es el dato verdadero. Guardar copy en la base sería
 * además una segunda fuente de verdad para algo que ya está dicho.
 */
export const TEXTO_PURGADO = "";

/**
 * Con qué queda una fecha personal (nacimiento, vencimiento del pasaporte).
 *
 * Esas dos columnas son NOT NULL y aflojarlas pide una migración sobre una
 * tabla con datos reales de familias. Una fecha imposible es inequívoca: nadie
 * la va a leer como un cumpleaños, y `datos_purgados_el` dice por qué está ahí.
 */
export const FECHA_PURGADA = "1900-01-01";

/**
 * Los campos de la ficha que se vacían, y con qué. QUÉ es un dato personal se
 * decide acá; ejecutarlo (el UPDATE, los lotes) es del job.
 *
 * Lo que NO está en esta lista es el TALÓN, y queda a propósito: `id`, `numero`,
 * `estado`, `variante`, `viaje_id`, `comunicacion_id` (el lote de la campaña),
 * `created_at`, el consentimiento (versión, hash e instante) y los tres campos
 * de borrado. Sin el talón, las métricas de campaña mentirían hacia atrás —una
 * inscripción de marzo desaparecería del embudo en junio— y la prueba de a qué
 * aceptó esa familia se perdería justo cuando alguien la reclame. Ninguno de
 * ellos dice quién es la persona.
 *
 * `motivo` también queda: son frases fijas del alta ("Ese DNI ya estaba
 * cargado…"), sin un solo dato de la ficha adentro, y son lo único que explica
 * el estado que sobrevive. `alumno_id` queda porque la ficha del alumno tiene su
 * propio ciclo de vida (fuera de estos plazos, MIN-16/TEC-02): borrar el vínculo
 * no borraría nada de esa persona y sí rompería el "esta inscripción dio de alta
 * a un alumno" de las métricas.
 *
 * `token_hash` sí se va: es la llave de un formulario que esta ficha ya cerró.
 */
export type DatosPurgadosInscripcion = {
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  dni: string;
  numeroPasaporte: string;
  fechaVencimientoPasaporte: string;
  telefonoAlumno: null;
  emailAlumno: null;
  alergiasSalud: null;
  tutor1Nombre: string;
  tutor1Celular: string;
  tutor1Email: string;
  preferenciasAlojamiento: null;
  nivelInglesAutoevaluacion: null;
  tokenHash: null;
};

/** Objeto nuevo en cada llamada: nadie puede mutar la decisión por referencia. */
export function datosPurgadosDeInscripcion(): DatosPurgadosInscripcion {
  return {
    nombre: TEXTO_PURGADO,
    apellido: TEXTO_PURGADO,
    fechaNacimiento: FECHA_PURGADA,
    dni: TEXTO_PURGADO,
    numeroPasaporte: TEXTO_PURGADO,
    fechaVencimientoPasaporte: FECHA_PURGADA,
    telefonoAlumno: null,
    emailAlumno: null,
    alergiasSalud: null,
    tutor1Nombre: TEXTO_PURGADO,
    tutor1Celular: TEXTO_PURGADO,
    tutor1Email: TEXTO_PURGADO,
    preferenciasAlojamiento: null,
    nivelInglesAutoevaluacion: null,
    tokenHash: null,
  };
}
