import {
  marcarEnviada,
  marcarFallida,
  reclamarReservasVencidas,
  reservarTanda,
  resumenLote,
  type InvitacionReservada,
} from "@/lib/db/queries/invitaciones";
import { getProspectoById } from "@/lib/db/queries/prospectos";
import { getViajeById } from "@/lib/db/queries/viajes";
import type { Prospecto } from "@/lib/db/schema/prospectos";
import type { Viaje } from "@/lib/db/schema/viajes";
import { LOTE_TAMANIO, PAUSA_ENTRE_ENVIOS_MS } from "@/lib/domain/inscripciones/invitacion";
import type { InvitacionParaEnviar } from "@/lib/email/send-invitacion-inscripcion";

/**
 * El motor del envío masivo de invitaciones al Application Form: reciclar,
 * reservar, mandar y sellar UNA tanda del lote.
 *
 * Vive acá y no en la server action porque es lo único de la campaña que no se
 * puede probar con un mock: el claim en dos fases es comportamiento del motor
 * (ver `db/queries/invitaciones.ts`). La action queda en tres líneas —
 * autorización, llamada, `ActionResult` — y la pantalla vuelve a llamarla
 * mientras `restantes` sea mayor que cero.
 *
 * Trigger.dev no está desplegado: quien empuja el lote es el navegador del
 * admin, tanda tras tanda. De ahí las dos propiedades que ordenan todo el
 * archivo:
 *  - REANUDABLE: cerrar la pestaña no pierde progreso ni traba el lote. Lo que
 *    quedó reservado sin mandar vuelve a `pendiente` a los RESERVA_VENCIDA_MS y
 *    la próxima llamada se lo lleva (paso 1);
 *  - SIN DUPLICADOS: una fila se marca `enviado` DESPUÉS de que Resend la
 *    aceptó, nunca antes. Marcarla antes dejaría filas fantasma indistinguibles
 *    de una entrega real.
 */

/** Lo que devuelve un envío: `{ id }` de Resend, o nada si el sender no lo trae. */
type ResultadoEnvio = { id?: string | null } | null | undefined;

/** El sender de una invitación ya reservada (con su token en claro). */
export type EnviarInvitacion = (invitacion: InvitacionReservada) => Promise<ResultadoEnvio>;

export type OpcionesTanda = {
  /** Cuántas invitaciones entran en esta tanda. */
  tamanio?: number;
  /** Pausa ENTRE dos envíos (el primero no espera). El default es la real. */
  pausaMs?: number;
  /** El instante que decide qué reserva venció. */
  ahora?: Date;
  /**
   * El asunto de la campaña. La fila lo guarda, pero `reservarTanda` no lo
   * devuelve: lo pasa la pantalla, que es la que lo escribió. Sin él vale el
   * asunto por defecto del mail.
   */
  asunto?: string | null;
  /** Seam del test: sin esto habría que mandar mails de verdad. */
  enviar?: EnviarInvitacion;
  /** Seam del test: sin esto una tanda de 10 tardaría seis segundos reales. */
  dormir?: (ms: number) => Promise<void>;
};

export type ResultadoTanda = {
  enviados: number;
  fallidos: number;
  /**
   * Cuántas invitaciones MANDABLES quedan en el lote (pendientes y sin revocar):
   * exactamente lo que se llevaría la próxima tanda. Las que otro envío tiene
   * reservadas no se cuentan — si se contaran, una pestaña que ve el trabajo de
   * la otra volvería a llamar sin nada que hacer, en loop. Que una reserva
   * abandonada vuelva a la cola lo resuelve el paso 1 de la llamada siguiente.
   */
  restantes: number;
};

/** El motivo es para que una persona entienda qué pasó, no para guardar un stack. */
function motivoDe(err: unknown): string {
  const mensaje = err instanceof Error ? err.message : String(err);
  return mensaje.trim() || "Error desconocido al enviar";
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * El viaje de la campaña, pedido UNA vez por tanda: las diez invitaciones
 * comparten viaje, y cada query es un round-trip HTTP. Se memoiza la promesa y
 * no el resultado para que dos envíos encimados no disparen dos pedidos. El
 * `Map` vive lo que vive la tanda, así que no hay caché rancia.
 *
 * Se guarda el viaje entero y no solo el nombre: el mail muestra también las
 * fechas, la bandera y una foto elegida por la ciudad del código, y todo sale
 * de la misma fila sin otra query.
 */
function viajeDeLaCampana(
  viajeId: string | null,
  memo: Map<string, Promise<Viaje | null>>
): Promise<Viaje | null> {
  if (!viajeId) return Promise.resolve(null);

  const pedido = memo.get(viajeId) ?? getViajeById(viajeId);
  memo.set(viajeId, pedido);
  return pedido;
}

/** Sin la variable configurada, el link igual apunta a producción y no a localhost. */
function urlBaja(unsubscribeToken: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.jovenesenuk.com";
  return `${base.replace(/\/+$/, "")}/baja?token=${unsubscribeToken}`;
}

/** Lo que el mail necesita del prospecto, además de lo que ya trae la fila. */
export type ProspectoDelMail = Pick<Prospecto, "unsubscribeToken">;

/**
 * El armado del mail a partir de la fila reservada, el viaje de la campaña y el
 * prospecto. Es pura y exportada por una razón: que el mail diga la fecha exacta
 * de vencimiento y no "vence en 90 días" depende de que `expiraEl` llegue hasta
 * acá, y el test de integración del job inyecta su propio sender, así que sin
 * esto nada fallaría si alguien lo vuelve a sacar.
 */
export function invitacionParaEnviar(
  invitacion: InvitacionReservada,
  viaje: Pick<Viaje, "nombre" | "codigo" | "fechaInicio" | "fechaFin" | "paisDestino"> | null,
  prospecto: ProspectoDelMail,
  asunto: string | null
): InvitacionParaEnviar {
  return {
    to: invitacion.destinatario,
    token: invitacion.token,
    variante: invitacion.variante,
    contactoNombre: invitacion.contactoNombre,
    prospectoNombre: invitacion.prospectoNombre,
    viajeNombre: viaje?.nombre ?? null,
    viajeCodigo: viaje?.codigo ?? null,
    viajeDesde: viaje?.fechaInicio ?? null,
    viajeHasta: viaje?.fechaFin ?? null,
    viajePais: viaje?.paisDestino ?? null,
    expiraEl: invitacion.expiraEl,
    asunto,
    unsubscribeUrl: urlBaja(prospecto.unsubscribeToken),
  };
}

/**
 * El sender real. Es una fábrica y no una función suelta porque el mail necesita
 * dos datos que la fila reservada no trae —el link de baja (el token vive en el
 * prospecto) y el viaje—, y la memoización del viaje tiene que durar
 * exactamente lo que dura la tanda.
 *
 * El import del módulo de mails es dinámico por el mismo motivo que en
 * `scan-recordatorios`: arrastra la configuración de Resend y el job se importa
 * desde contextos que no la necesitan.
 *
 * Los dos `throw` son deliberados: lo que lanza acá lo sella `marcarFallida` con
 * su motivo, que es exactamente lo que el equipo tiene que leer en la campaña.
 * La baja se re-chequea al mandar y no solo al armar el lote — entre que se creó
 * la campaña y que sale el mail puede pasar una semana, y el que se dio de baja
 * en el medio no recibe nada.
 */
function senderPorDefecto(asunto: string | null): EnviarInvitacion {
  const viajes = new Map<string, Promise<Viaje | null>>();

  return async (invitacion) => {
    const { sendInvitacionInscripcionEmail } = await import(
      "@/lib/email/send-invitacion-inscripcion"
    );

    const [prospecto, viaje] = await Promise.all([
      getProspectoById(invitacion.prospectoId),
      viajeDeLaCampana(invitacion.viajeId, viajes),
    ]);

    if (!prospecto) throw new Error("El prospecto ya no existe.");
    if (!prospecto.suscritoOutreach) {
      throw new Error("El prospecto se dio de baja de los correos.");
    }

    return sendInvitacionInscripcionEmail(invitacionParaEnviar(invitacion, viaje, prospecto, asunto));
  };
}

/**
 * Una tanda del lote, de punta a punta.
 *
 * El orden importa y es este:
 *  1. reciclar las reservas vencidas del lote (lo que hace reanudable la campaña);
 *  2. reservar la tanda — `enviando` + lease, ANTES de hablar con Resend;
 *  3. mandar una por una, con la pausa entre envíos;
 *  4. sellar cada fila: `enviado` con el id de Resend, o `fallido` con el motivo.
 *
 * Un rechazo de Resend NO corta la tanda: esa fila queda `fallido` con su motivo
 * (una casilla mal escrita no puede dejar sin mail a los otros nueve) y no
 * vuelve sola a la cola — reintentar un fallo es una decisión del equipo.
 *
 * Un error de BASE al sellar, en cambio, SÍ corta: si la base no responde, los
 * envíos que siguieran no se podrían sellar y el reciclado de los 5 minutos los
 * mandaría de nuevo. Cortar deja como mucho una fila en `enviando` en vez de
 * una tanda entera de mails duplicados.
 */
export async function enviarTandaDelLote(
  loteId: string,
  opciones: OpcionesTanda = {}
): Promise<ResultadoTanda> {
  const {
    tamanio = LOTE_TAMANIO,
    pausaMs = PAUSA_ENTRE_ENVIOS_MS,
    ahora = new Date(),
    asunto = null,
    dormir = esperar,
  } = opciones;
  const enviar = opciones.enviar ?? senderPorDefecto(asunto);

  await reclamarReservasVencidas(loteId, ahora);
  const tanda = await reservarTanda(loteId, tamanio, ahora);

  let enviados = 0;
  let fallidos = 0;

  for (const [i, invitacion] of tanda.entries()) {
    if (i > 0 && pausaMs > 0) await dormir(pausaMs);

    let resultado: ResultadoEnvio;
    try {
      resultado = await enviar(invitacion);
    } catch (err) {
      await marcarFallida(invitacion.comunicacionId, motivoDe(err));
      fallidos += 1;
      continue;
    }

    // El sello puede devolver false si el webhook de Resend ya movió la fila:
    // el mail salió igual, así que cuenta como enviado.
    await marcarEnviada(invitacion.comunicacionId, resultado?.id ?? null);
    enviados += 1;
  }

  const resumen = await resumenLote(loteId);
  return { enviados, fallidos, restantes: resumen?.pendientes ?? 0 };
}
