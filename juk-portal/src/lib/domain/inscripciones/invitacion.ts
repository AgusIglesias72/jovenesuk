/**
 * La vida de una invitación al Application Form: cuánto vale el link, en qué
 * estado está y cómo se reparte un envío masivo en tandas.
 *
 * Todo acá es puro y decide sobre timestamps. `ahora` SIEMPRE entra por
 * parámetro: sin `Date.now()` adentro, el test fija el instante y los bordes
 * (el milisegundo antes de vencer, la reserva justo en el límite) se pueden
 * probar de verdad.
 *
 * El token del link no lleva datos personales: solo contexto de campaña. Lo
 * que se decide acá es únicamente si ese link todavía abre el formulario.
 * La clasificación de los datos que se cargan vive en `niveles.ts`, y los
 * plazos de borrado de una invitación sin usar, en
 * `@/lib/domain/privacidad/retencion.ts` (que cuenta desde el vencimiento
 * que calcula `fechaDeVencimiento`).
 */

const MINUTO_MS = 60_000;
const DIA_MS = 86_400_000;

/**
 * Un link vale 90 días. Cubre de sobra el ciclo de una campaña (se invita en
 * marzo para un viaje de julio) sin dejar links eternos dando vueltas.
 */
export const VIGENCIA_DIAS = 90;

/**
 * Cuántas invitaciones se procesan por tanda antes de volver a persistir el
 * progreso. Chico a propósito: si el envío se corta a la mitad, se reintenta
 * la tanda y no los 200 destinatarios.
 */
export const LOTE_TAMANIO = 10;

/**
 * Cuánto vale la reserva de la fase 1 del claim. Cinco minutos alcanzan para
 * completar una ficha abierta y son poco para que una pestaña abandonada deje
 * la invitación trabada.
 */
export const RESERVA_VENCIDA_MS = 5 * MINUTO_MS;

/**
 * Tope de destinatarios de un envío desde el back-office. Con la pausa entre
 * envíos, 200 tardan cerca de dos minutos: más que eso deja de ser una acción
 * de pantalla y tiene que partirse en varias campañas.
 */
export const MAX_DESTINATARIOS_LOTE = 200;

/**
 * Pausa entre dos envíos consecutivos. Resend acepta 2 requests por segundo;
 * 600 ms deja margen para la latencia sin comerse el rate limit.
 */
export const PAUSA_ENTRE_ENVIOS_MS = 600;

/**
 * - vigente: el link abre el formulario.
 * - vencida: pasaron los 90 días y nadie la usó.
 * - revocada: el equipo la dio de baja a mano (se mandó al contacto equivocado,
 *   la familia se bajó del viaje).
 * - respondida: la familia ya mandó la ficha; el link no vuelve a abrirse.
 */
export type EstadoInvitacion = "vigente" | "vencida" | "revocada" | "respondida";

/** Las marcas de la fila que definen el estado. Null = todavía no pasó. */
export type MarcasInvitacion = {
  expiraEl: Date;
  revocadaEl: Date | null;
  respondidaEl: Date | null;
};

/**
 * Estado derivado de la invitación.
 *
 * La precedencia es respondida > revocada > vencida > vigente: lo que ya pasó
 * de hecho le gana a lo que pasa por reloj. Una invitación respondida sigue
 * siendo "respondida" aunque después la revoquen o se le cumpla el plazo, y
 * una revocada muestra por qué no abre aunque además esté vencida.
 *
 * El borde es exclusivo: en el instante exacto de `expiraEl` ya está vencida.
 */
export function estadoInvitacion({
  expiraEl,
  revocadaEl,
  respondidaEl,
  ahora,
}: MarcasInvitacion & { ahora: Date }): EstadoInvitacion {
  if (respondidaEl !== null) return "respondida";
  if (revocadaEl !== null) return "revocada";
  if (ahora.getTime() >= expiraEl.getTime()) return "vencida";
  return "vigente";
}

/** ¿Con este estado se puede abrir y completar el formulario? */
export function puedeCargar(estado: EstadoInvitacion): boolean {
  return estado === "vigente";
}

/**
 * Cuándo vence una invitación emitida en `desde`: 90 días exactos, contados en
 * milisegundos y no por día calendario. La vigencia arranca en el instante del
 * envío del mail, no a la medianoche de ese día.
 */
export function fechaDeVencimiento(desde: Date): Date {
  return new Date(desde.getTime() + VIGENCIA_DIAS * DIA_MS);
}

/**
 * Claim en dos fases. Fase 1: al abrir el formulario se reserva la invitación
 * (`reservadaEl`), para que dos pestañas o dos tutores no manden dos fichas del
 * mismo alumno. Fase 2: al enviar, la reserva se confirma y la invitación pasa
 * a respondida.
 *
 * Una reserva abandonada no puede trabar el link para siempre: a los
 * RESERVA_VENCIDA_MS caduca y el próximo que abra se la queda.
 *
 * El borde es inclusivo: a los 5 minutos exactos la reserva ya venció. Con dos
 * intentos simultáneos, quien resuelve el empate es el UPDATE condicional de la
 * query, no esta función.
 */
export function reservaVigente(reservadaEl: Date | null, ahora: Date): boolean {
  if (reservadaEl === null) return false;
  return ahora.getTime() - reservadaEl.getTime() < RESERVA_VENCIDA_MS;
}

/** Hay una reserva, pero ya caducó: el próximo que abra se la queda. */
export function reservaVencida(reservadaEl: Date | null, ahora: Date): boolean {
  return reservadaEl !== null && !reservaVigente(reservadaEl, ahora);
}

/** ¿Se puede tomar la reserva (fase 1)? */
export function puedeReservar(entrada: {
  estado: EstadoInvitacion;
  reservadaEl: Date | null;
  ahora: Date;
}): boolean {
  return puedeCargar(entrada.estado) && !reservaVigente(entrada.reservadaEl, entrada.ahora);
}

/** El envío no entra en una sola tanda: hay que partir la campaña. */
export function excedeMaximoDestinatarios(cantidad: number): boolean {
  return cantidad > MAX_DESTINATARIOS_LOTE;
}

/** Parte los destinatarios en tandas de LOTE_TAMANIO, respetando el orden. */
export function lotesDe<T>(destinatarios: readonly T[]): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < destinatarios.length; i += LOTE_TAMANIO) {
    lotes.push(destinatarios.slice(i, i + LOTE_TAMANIO));
  }
  return lotes;
}

/**
 * Cuánto tarda un envío de `cantidad` destinatarios: la pausa va ENTRE dos
 * envíos, así que el primero no espera. Sirve para avisar en pantalla antes de
 * disparar la campaña.
 */
export function duracionEstimadaMs(cantidad: number): number {
  return Math.max(0, cantidad - 1) * PAUSA_ENTRE_ENVIOS_MS;
}
