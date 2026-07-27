import { Hr, Text } from "@react-email/components";

import { EmailButton, EmailHeading, EmailLayout, EmailParagraph } from "./_layout";

/**
 * OutreachColegioEmail — email de contacto en frío a un colegio, enviado desde
 * el subdominio de marketing (mkt.*). Presenta a Jóvenes en UK y sus servicios,
 * con CTA a la web y link de baja obligatorio (cuidado de reputación / CAN-SPAM).
 */

interface OutreachColegioEmailProps {
  nombreColegio: string;
  nombreContacto?: string;
  cuerpo: string[];
  ctaUrl: string;
  unsubscribeUrl: string;
}

const TEXT_MUTED = "#66728a";

export function OutreachColegioEmail({
  nombreColegio,
  nombreContacto,
  cuerpo,
  ctaUrl,
  unsubscribeUrl,
}: OutreachColegioEmailProps) {
  const saludo = nombreContacto ? `Hola ${nombreContacto}` : `Hola, equipo de ${nombreColegio}`;

  return (
    <EmailLayout preview={`Viajes de estudio a UK para ${nombreColegio}`}>
      <EmailHeading>{saludo}</EmailHeading>

      <EmailParagraph>
        Te escribimos desde <strong>Jóvenes en UK</strong>, una agencia argentina especializada en
        viajes de estudio al Reino Unido. Acompañamos a colegios como {nombreColegio} a organizar
        experiencias académicas en el exterior, de punta a punta.
      </EmailParagraph>

      {cuerpo.map((parrafo, i) => (
        <EmailParagraph key={i}>{parrafo}</EmailParagraph>
      ))}

      <EmailParagraph>
        Ofrecemos <strong>cursos de inglés</strong> en instituciones del Reino Unido,{" "}
        <strong>viajes grupales para colegios</strong> con programa a medida y un{" "}
        <strong>acompañamiento integral</strong>: desde la primera reunión con las familias hasta el
        regreso, con coordinación local en UK durante todo el viaje.
      </EmailParagraph>

      <EmailParagraph>
        Si te interesa, nos encantaría contarte más y armar una propuesta pensada para tu
        institución.
      </EmailParagraph>

      <EmailButton href={ctaUrl}>Conocé más</EmailButton>

      <Hr style={{ borderColor: "#e3e7ee", margin: "24px 0 12px" }} />
      <Text className="m-0 text-[11px] leading-relaxed" style={{ color: TEXT_MUTED }}>
        Recibís este correo porque creemos que Jóvenes en UK puede sumarle a tu colegio.{" "}
        <a href={unsubscribeUrl} style={{ color: TEXT_MUTED, textDecoration: "underline" }}>
          Si no querés recibir más correos, date de baja
        </a>
        .
      </Text>
    </EmailLayout>
  );
}
