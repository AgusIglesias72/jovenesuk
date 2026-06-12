import { EmailLayout, EmailHeading, EmailParagraph, EmailCallout } from "./_layout";

/** Aviso a la familia de que el viaje fue cancelado (US-13). */

interface ViajeCanceladoEmailProps {
  tutorNombre: string;
  alumnoNombre: string;
  viajeNombre: string;
  viajeCodigo: string;
}

export function ViajeCanceladoEmail({
  tutorNombre,
  alumnoNombre,
  viajeNombre,
  viajeCodigo,
}: ViajeCanceladoEmailProps) {
  return (
    <EmailLayout preview={`Cancelación del viaje ${viajeCodigo}`}>
      <EmailHeading>Hola {tutorNombre},</EmailHeading>

      <EmailParagraph>
        Te escribimos para avisarte que el viaje <strong>{viajeNombre}</strong> (
        {viajeCodigo}), en el que estaba inscripto/a <strong>{alumnoNombre}</strong>,
        fue <strong>cancelado</strong>.
      </EmailParagraph>

      <EmailCallout>
        El equipo de JUK se va a contactar con vos a la brevedad para contarte los
        próximos pasos y las alternativas disponibles.
      </EmailCallout>

      <EmailParagraph>
        Ante cualquier duda, respondé este email y te ayudamos.
      </EmailParagraph>
    </EmailLayout>
  );
}
