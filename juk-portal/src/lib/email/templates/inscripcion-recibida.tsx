import {
  EmailCallout,
  EmailHeading,
  EmailLayout,
  EmailMonoCode,
  EmailParagraph,
} from "./_layout";

/**
 * InscripcionRecibidaEmail — acuse a quien completó el Application Form propio.
 *
 * CONTRATO DE PRIVACIDAD: este template recibe SOLO campos de Nivel 1
 * (`src/lib/domain/inscripciones/niveles.ts`). No hay props para DNI, pasaporte,
 * fecha de nacimiento, teléfonos ni datos de salud, y por eso no pueden
 * filtrarse aunque el llamador tenga la ficha entera a mano: el sender recorta
 * con `soloNivel1` antes de construir esto. Un mail viaja por servidores que no
 * controlamos y queda en la casilla de la familia para siempre; el único dato
 * que hace falta para reconocer la ficha es su código público.
 */

type InscripcionRecibidaEmailProps = {
  tutorNombre: string;
  /** Nombre y apellido del alumno, ya armados. */
  alumnoNombre: string;
  /** Código público INS-000123 (`codigoInscripcion`). */
  codigo: string;
  viajeNombre?: string | null;
};

export function InscripcionRecibidaEmail({
  tutorNombre,
  alumnoNombre,
  codigo,
  viajeNombre,
}: InscripcionRecibidaEmailProps) {
  return (
    <EmailLayout preview={`Recibimos la ficha de ${alumnoNombre} · ${codigo}`}>
      <EmailHeading>Hola {tutorNombre},</EmailHeading>

      <EmailParagraph>
        Recibimos la ficha de inscripción de <strong>{alumnoNombre}</strong>
        {viajeNombre ? (
          <>
            {" "}
            para <strong>{viajeNombre}</strong>
          </>
        ) : null}
        . Ya quedó registrada y el equipo de Jóvenes en UK la va a revisar.
      </EmailParagraph>

      <EmailCallout>
        Tu código de referencia es <EmailMonoCode>{codigo}</EmailMonoCode>
        <br />
        Guardalo: con ese número encontramos tu ficha enseguida si nos escribís.
      </EmailCallout>

      <EmailParagraph>
        Por tu privacidad no repetimos acá los datos que cargaste. Si alguno quedó
        mal, <strong>respondé este email</strong> contándonos qué corregir y lo
        arreglamos nosotros.
      </EmailParagraph>

      <EmailParagraph>
        No hace falta que vuelvas a completar el formulario: con una sola carga
        alcanza.
      </EmailParagraph>
    </EmailLayout>
  );
}
