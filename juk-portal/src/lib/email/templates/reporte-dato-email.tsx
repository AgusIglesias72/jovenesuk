import { EmailButton, EmailCallout, EmailHeading, EmailLayout, EmailParagraph } from "./_layout";

/**
 * ReporteDatoEmail — aviso interno al equipo de JUK cuando una familia reporta
 * desde su portal que un dato del alumno está mal (PRD 04 · US-2.3.3).
 */

interface ReporteDatoEmailProps {
  alumnoNombre: string;
  alumnoDni: string;
  campo: string;
  comentario?: string | null;
  reportadoPor: string;
  fichaUrl: string;
}

export function ReporteDatoEmail({
  alumnoNombre,
  alumnoDni,
  campo,
  comentario,
  reportadoPor,
  fichaUrl,
}: ReporteDatoEmailProps) {
  return (
    <EmailLayout preview={`${alumnoNombre}: dato incorrecto en "${campo}"`}>
      <EmailHeading>Una familia reportó un dato incorrecto</EmailHeading>

      <EmailParagraph>
        Desde el Portal de Familias nos avisaron que hay un dato mal cargado en la ficha de un
        alumno. Revisalo y corregilo desde el portal interno.
      </EmailParagraph>

      <EmailCallout>
        <strong>Alumno:</strong> {alumnoNombre}
        <br />
        <strong>DNI:</strong> {alumnoDni}
        <br />
        <strong>Dato reportado:</strong> {campo}
        <br />
        <strong>Reportado por:</strong> {reportadoPor}
      </EmailCallout>

      {comentario ? (
        <EmailParagraph>
          <strong>Comentario de la familia:</strong> {comentario}
        </EmailParagraph>
      ) : (
        <EmailParagraph>La familia no dejó comentario.</EmailParagraph>
      )}

      <EmailButton href={fichaUrl}>Corregir la ficha</EmailButton>

      <EmailParagraph>Respondé este email para escribirle directamente a la familia.</EmailParagraph>
    </EmailLayout>
  );
}
