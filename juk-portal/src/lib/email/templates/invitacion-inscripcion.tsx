import { Hr, Text } from "@react-email/components";

import { VIGENCIA_DIAS } from "@/lib/domain/inscripciones/invitacion";

import { EmailButton, EmailCallout, EmailHeading, EmailLayout, EmailParagraph } from "./_layout";

/**
 * InvitacionInscripcionEmail — el mail que abre el Application Form propio.
 * Lleva el ÚNICO link con el token en claro: de la base solo sale el hash.
 *
 * Los props son a propósito solo contexto de campaña (a quién saludamos, el
 * viaje, el link). Nada de la ficha viaja acá, y no puede: el mail sale ANTES
 * de que la familia cargue un solo dato, a una casilla que no controlamos. Si
 * mañana alguien quisiera precargar un DNI "para agilizar", tendría que sumar
 * un prop de Nivel 2 — y eso es lo que traba el test del sender
 * (`send-invitacion-inscripcion.test.ts`).
 *
 * El plazo no se escribe a mano: sale de `VIGENCIA_DIAS`, así que el mail no
 * puede prometer 90 días mientras la invitación vence a los 30.
 */

type InvitacionInscripcionEmailProps = {
  contactoNombre?: string | null;
  prospectoNombre?: string | null;
  viajeNombre?: string | null;
  formularioUrl: string;
  unsubscribeUrl: string;
  /** El vencimiento YA formateado (DD/MM/AAAA). Sin él se anuncia la vigencia estándar. */
  venceEl?: string;
  vigenciaDias?: number;
};

const TEXT_MUTED = "#66728a";

/**
 * Se saluda a la persona si la tenemos, y si no a la institución. El genérico
 * existe porque el CRM tiene prospectos cargados solo con una casilla: un
 * "Hola null" en el primer mail que ve una familia no es una opción.
 */
function saludoDe(contactoNombre?: string | null, prospectoNombre?: string | null): string {
  if (contactoNombre?.trim()) return `Hola ${contactoNombre.trim()}`;
  if (prospectoNombre?.trim()) return `Hola, equipo de ${prospectoNombre.trim()}`;
  return "¡Hola!";
}

export function InvitacionInscripcionEmail({
  contactoNombre,
  prospectoNombre,
  viajeNombre,
  formularioUrl,
  unsubscribeUrl,
  venceEl,
  vigenciaDias = VIGENCIA_DIAS,
}: InvitacionInscripcionEmailProps) {
  const saludo = saludoDe(contactoNombre, prospectoNombre);
  const viaje = viajeNombre?.trim();
  const plazo = venceEl?.trim()
    ? `El link es personal y vence el ${venceEl.trim()}.`
    : `El link es personal y vence en ${vigenciaDias} días.`;

  return (
    <EmailLayout
      preview={
        viaje ? `Completá la ficha de inscripción · ${viaje}` : "Completá la ficha de inscripción"
      }
    >
      <EmailHeading>{saludo}</EmailHeading>

      <EmailParagraph>
        Te escribimos desde <strong>Jóvenes en UK</strong>.{" "}
        {viaje ? `Ya podés completar la ficha de inscripción para ${viaje}` : "Ya podés completar la ficha de inscripción del viaje"}
        : es el formulario con el que armamos toda la documentación, así que es el primer paso para
        reservar el lugar.
      </EmailParagraph>

      <EmailParagraph>
        Son unos minutos. Pedimos los datos del alumno <strong>tal como figuran en el pasaporte</strong>,
        un teléfono de contacto y lo que necesitemos saber para el alojamiento. Si algo no lo tenés a
        mano, escribinos y lo vemos juntos.
      </EmailParagraph>

      <EmailButton href={formularioUrl}>Completar la inscripción</EmailButton>

      <EmailCallout>
        {/* La frase se arma entera arriba: intercalar `{vigenciaDias}` entre
            texto hace que React parta el nodo y meta un comentario en el medio
            ("vence en <!-- -->90<!-- --> días"), que se ve igual pero deja de ser
            buscable en el HTML renderizado. */}
        {plazo} Mejor no reenviarlo: si otra persona de la familia tiene que completar la ficha,
        avisanos y le mandamos el suyo.
      </EmailCallout>

      <EmailParagraph>
        Cualquier duda, respondé este mismo mail: lo lee alguien del equipo.
      </EmailParagraph>

      <Hr style={{ borderColor: "#e3e7ee", margin: "24px 0 12px" }} />
      <Text className="m-0 text-[11px] leading-relaxed" style={{ color: TEXT_MUTED }}>
        Recibís este correo porque estás en contacto con Jóvenes en UK por un viaje de estudios.{" "}
        <a href={unsubscribeUrl} style={{ color: TEXT_MUTED, textDecoration: "underline" }}>
          Si no querés recibir más correos, date de baja
        </a>
        .
      </Text>
    </EmailLayout>
  );
}
