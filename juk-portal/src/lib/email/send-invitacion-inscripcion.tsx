import { mailConAsunto } from "@/lib/contact";
import type { Variante } from "@/lib/domain/inscripciones/schema";
import { formatFecha } from "@/lib/utils/date";

import { sendEmail } from "./index";
import { InvitacionInscripcionEmail } from "./templates/invitacion-inscripcion";

/**
 * El mail de la invitación al Application Form: el único lugar del mundo donde
 * el token existe en claro (`reservarTanda` lo acuña, la base guarda el hash).
 *
 * Sale como `comunicacion` —desde info@— y no como `marketing`, por dos
 * razones: el remitente de marketing (mkt.*) todavía no tiene DNS, así que la
 * feature nacería en dry-run; y este mail NO es contacto en frío, es el trámite
 * que la familia espera para anotar al chico. Que pueda responder y le conteste
 * alguien es parte del flujo.
 *
 * Igual lleva los headers de baja: la lista sale del CRM, y el que se dio de
 * baja de los correos ya quedó afuera antes (`destinatariosDesdeProspectos`).
 * El header es lo que hace que Gmail muestre su propio botón de baja en vez de
 * ofrecer "marcar como spam", que es lo que hunde la reputación del dominio.
 */

const RUTA_FORMULARIO = "/inscripcion";

/** Respaldo de baja cuando no hay link con token: una casilla que alguien lee. */
const MAILTO_BAJA = mailConAsunto("Baja de comunicaciones");

/** Sin la variable configurada, el link igual apunta a producción y no a localhost. */
function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.jovenesenuk.com";
}

/**
 * El link del mail. Es pura a propósito: el token es una credencial y el
 * armado de la URL tiene que poder probarse sin tocar Resend ni la base.
 *
 * Los parámetros van por `URLSearchParams` y no interpolados: el token es
 * base64url (no necesita escape hoy), pero un `+` o un `=` que se colara sin
 * encodear rompería el link en silencio y la familia vería "este link no está
 * disponible" sin que nadie entienda por qué. Los nombres `t` y `v` son los que
 * lee `src/app/inscripcion/page.tsx`.
 *
 * `base` entra por parámetro para fijarlo en el test; en producción sale del
 * entorno en cada llamada (no al importar el módulo: en el build no está).
 */
export function urlInscripcion(
  token: string,
  variante?: Variante | null,
  base: string = baseUrl()
): string {
  const params = new URLSearchParams({ t: token });
  if (variante) params.set("v", variante);
  return `${base.replace(/\/+$/, "")}${RUTA_FORMULARIO}?${params.toString()}`;
}

/** El asunto por defecto, cuando la campaña no trae uno propio. */
export function asuntoInvitacion(viajeNombre?: string | null): string {
  const viaje = viajeNombre?.trim();
  return viaje ? `Completá la inscripción · ${viaje}` : "Completá la inscripción al viaje";
}

export type InvitacionParaEnviar = {
  to: string;
  /** El token EN CLARO, recién acuñado por `reservarTanda`. */
  token: string;
  variante?: Variante | null;
  contactoNombre?: string | null;
  prospectoNombre?: string | null;
  viajeNombre?: string | null;
  asunto?: string | null;
  /** El vencimiento real de la fila. Sin él, el mail promete la vigencia estándar. */
  expiraEl?: Date | null;
  /**
   * El link de baja CON el token del prospecto (`/baja?token=…`). Es opcional
   * porque `reservarTanda` todavía no devuelve ese token: mientras tanto, el
   * mail cae en el `mailto:` de abajo. Pasarlo es lo que habilita la baja de un
   * click.
   */
  unsubscribeUrl?: string | null;
};

/**
 * Los headers de baja (RFC 8058). El de `List-Unsubscribe` va SIEMPRE: es lo
 * que hace que Gmail muestre su propio botón de baja en vez de empujar al
 * "marcar como spam", que es lo que hunde la reputación del dominio.
 *
 * `List-Unsubscribe-Post` (la baja de un click, sin abrir nada) va solo cuando
 * hay una URL que identifica al destinatario. Sobre el `mailto:` de respaldo
 * sería mentira: el cliente mostraría "listo, te diste de baja" y no se habría
 * dado de baja nadie, porque `/baja` sin token no sabe a quién sacar.
 */
function headersDeBaja(unsubscribeUrl?: string | null): Record<string, string> {
  const url = unsubscribeUrl?.trim();
  if (!url) return { "List-Unsubscribe": `<${MAILTO_BAJA}>` };

  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/**
 * Devuelve el id de Resend para que el envío lo selle con `marcarEnviada`: es
 * lo que después usa el webhook para mover la fila a entregado/abierto/rebotado.
 * Si Resend rechaza, `sendEmail` lanza y el lote lo sella con `marcarFallida`.
 */
export async function sendInvitacionInscripcionEmail(
  opts: InvitacionParaEnviar
): Promise<{ id: string | null }> {
  const data = await sendEmail({
    to: opts.to,
    tipo: "comunicacion",
    subject: opts.asunto?.trim() || asuntoInvitacion(opts.viajeNombre),
    headers: headersDeBaja(opts.unsubscribeUrl),
    react: (
      <InvitacionInscripcionEmail
        contactoNombre={opts.contactoNombre}
        prospectoNombre={opts.prospectoNombre}
        viajeNombre={opts.viajeNombre}
        formularioUrl={urlInscripcion(opts.token, opts.variante)}
        // El mail dice la fecha exacta cuando la sabe: "vence el 15/12/2026" es
        // accionable y "vence en 90 días" obliga a contar desde un mail que se
        // lee tres semanas después.
        venceEl={opts.expiraEl ? formatFecha(opts.expiraEl) : undefined}
        unsubscribeUrl={opts.unsubscribeUrl?.trim() || MAILTO_BAJA}
      />
    ),
  });

  return { id: data?.id ?? null };
}
