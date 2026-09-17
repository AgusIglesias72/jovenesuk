import {
  EmailButton,
  EmailCallout,
  EmailHeading,
  EmailLayout,
  EmailMonoCode,
  EmailParagraph,
} from "./_layout";

/**
 * InscripcionNuevaEquipoEmail — aviso interno cuando entra una ficha del
 * Application Form propio.
 *
 * CONTRATO DE PRIVACIDAD: igual que el acuse a la familia, este template solo
 * tiene props de Nivel 1 (`src/lib/domain/inscripciones/niveles.ts`). El aviso
 * NO es la ficha: es el empujón para abrirla en el portal, donde hay sesión y
 * permisos. El DNI, el pasaporte, la fecha de nacimiento, los teléfonos y los
 * datos de salud se miran ahí, nunca en una casilla de mail del equipo.
 */

type InscripcionNuevaEquipoEmailProps = {
  /** Código público INS-000123 (`codigoInscripcion`). */
  codigo: string;
  /** Nombre y apellido del alumno, ya armados. */
  alumnoNombre: string;
  tutorNombre: string;
  tutorEmail: string;
  viaje?: string | null;
  variante?: string | null;
  estadoLabel: string;
  /** La ficha quedó en `requiere_revision`: alguien del equipo tiene que decidir. */
  requiereRevision: boolean;
  /** Por qué quedó para revisar (el `motivo` de la fila). */
  motivo?: string | null;
  /** Link directo a la ficha en el back-office. */
  fichaUrl: string;
};

export function InscripcionNuevaEquipoEmail({
  codigo,
  alumnoNombre,
  tutorNombre,
  tutorEmail,
  viaje,
  variante,
  estadoLabel,
  requiereRevision,
  motivo,
  fichaUrl,
}: InscripcionNuevaEquipoEmailProps) {
  return (
    <EmailLayout
      preview={
        requiereRevision
          ? `${codigo} · ${alumnoNombre} entró para revisar`
          : `${codigo} · nueva ficha de ${alumnoNombre}`
      }
    >
      <EmailHeading>
        {requiereRevision ? "Una ficha entró para revisar" : "Nueva ficha de inscripción"}
      </EmailHeading>

      <EmailParagraph>
        Se cargó el Application Form de <strong>{alumnoNombre}</strong>. La ficha
        quedó guardada con el código <EmailMonoCode>{codigo}</EmailMonoCode>{" "}
        y <strong>todavía no creó ningún alumno</strong>: eso se resuelve desde la
        bandeja.
      </EmailParagraph>

      {requiereRevision ? (
        <EmailCallout>
          <strong>Necesita una decisión del equipo.</strong>
          <br />
          {motivo ?? "La carga llegó sin una invitación válida."}
        </EmailCallout>
      ) : null}

      <EmailCallout>
        <strong>Código:</strong> {codigo}
        <br />
        <strong>Alumno:</strong> {alumnoNombre}
        <br />
        <strong>Tutor:</strong> {tutorNombre}
        <br />
        <strong>Email del tutor:</strong> {tutorEmail}
        {viaje ? (
          <>
            <br />
            <strong>Viaje:</strong> {viaje}
          </>
        ) : (
          <>
            <br />
            <strong>Viaje:</strong> sin asignar
          </>
        )}
        {variante ? (
          <>
            <br />
            <strong>Variante del formulario:</strong> {variante}
          </>
        ) : null}
        <br />
        <strong>Estado:</strong> {estadoLabel}
      </EmailCallout>

      <EmailButton href={fichaUrl} variant={requiereRevision ? "critical" : "primary"}>
        Abrir la ficha
      </EmailButton>

      <EmailParagraph>
        Este aviso no incluye DNI, pasaporte, fecha de nacimiento, teléfonos ni
        datos de salud: están en la ficha, dentro del portal.
      </EmailParagraph>

      <EmailParagraph>
        Respondé este email para escribirle directamente a la familia.
      </EmailParagraph>
    </EmailLayout>
  );
}
