import { EmailLayout, EmailHeading, EmailParagraph, EmailCallout } from "./_layout";

/**
 * RecordatorioEmail — recordatorio automático a la familia de un trámite
 * próximo a vencer (A1, US-20) o de un hito del viaje (D1, US-33).
 */

interface RecordatorioEmailProps {
  tutorNombre: string;
  alumnoNombre: string;
  viajeCodigo: string;
  paso: string;
  diasAntes: number;
  fechaObjetivo: Date;
}

export function RecordatorioEmail({
  tutorNombre,
  alumnoNombre,
  viajeCodigo,
  paso,
  diasAntes,
  fechaObjetivo,
}: RecordatorioEmailProps) {
  const fecha = fechaObjetivo.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return (
    <EmailLayout preview={`Recordatorio: ${paso} de ${alumnoNombre}`}>
      <EmailHeading>Hola {tutorNombre},</EmailHeading>

      <EmailParagraph>
        Te recordamos que el trámite <strong>{paso}</strong> de{" "}
        <strong>{alumnoNombre}</strong> (viaje {viajeCodigo}) todavía está pendiente.
      </EmailParagraph>

      <EmailCallout>
        <strong>Fecha clave:</strong> {fecha}
        <br />
        <strong>Faltan:</strong> {diasAntes} día{diasAntes === 1 ? "" : "s"}
      </EmailCallout>

      <EmailParagraph>
        Si ya lo resolviste, no hace falta que hagas nada: el equipo de JUK lo va a
        registrar. Ante cualquier duda, respondé este email y te ayudamos.
      </EmailParagraph>
    </EmailLayout>
  );
}
