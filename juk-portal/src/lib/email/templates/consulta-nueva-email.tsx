import { EmailCallout, EmailHeading, EmailLayout, EmailParagraph } from "./_layout";

/**
 * ConsultaNuevaEmail — aviso interno al equipo de JUK cuando llega un lead
 * desde el formulario de consulta de la web pública.
 */

interface ConsultaNuevaEmailProps {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  paraQuien: string;
  institucion?: string | null;
  modalidad: string;
  destino?: string | null;
  cuando: string;
  mensaje?: string | null;
}

export function ConsultaNuevaEmail({
  nombre,
  apellido,
  email,
  telefono,
  paraQuien,
  institucion,
  modalidad,
  destino,
  cuando,
  mensaje,
}: ConsultaNuevaEmailProps) {
  return (
    <EmailLayout preview={`Nueva consulta de ${nombre} ${apellido}`}>
      <EmailHeading>Nueva consulta web</EmailHeading>

      <EmailParagraph>
        Llegó una consulta nueva desde el formulario de la web. Estos son los datos:
      </EmailParagraph>

      <EmailCallout>
        <strong>Nombre:</strong> {nombre} {apellido}
        <br />
        <strong>Email:</strong> {email}
        <br />
        <strong>Teléfono / WhatsApp:</strong> {telefono}
        <br />
        <strong>¿Para quién?:</strong> {paraQuien}
        {institucion ? (
          <>
            <br />
            <strong>Colegio / institución:</strong> {institucion}
          </>
        ) : null}
        <br />
        <strong>Interés:</strong> {modalidad}
        {destino ? (
          <>
            <br />
            <strong>Destino:</strong> {destino}
          </>
        ) : null}
        <br />
        <strong>¿Cuándo?:</strong> {cuando}
      </EmailCallout>

      {mensaje ? (
        <EmailParagraph>
          <strong>Mensaje:</strong> {mensaje}
        </EmailParagraph>
      ) : null}

      <EmailParagraph>
        Respondé este email para contactar directamente a la persona.
      </EmailParagraph>
    </EmailLayout>
  );
}
