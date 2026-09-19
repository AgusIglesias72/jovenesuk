import { fechaDeVencimiento } from "@/lib/domain/inscripciones/invitacion";
import { formatFechaArgentina } from "@/lib/utils/date";

import { InscripcionNuevaEquipoEmail } from "./templates/inscripcion-nueva-equipo";
import { InscripcionRecibidaEmail } from "./templates/inscripcion-recibida";
import { InvitacionInscripcionEmail } from "./templates/invitacion-inscripcion";
import { OutreachColegioEmail } from "./templates/outreach-colegio";
import { PasswordChangedEmail } from "./templates/password-changed-email";
import { RecordatorioEmail } from "./templates/recordatorio-email";
import { ResetPasswordEmail } from "./templates/reset-password-email";
import { ViajeCanceladoEmail } from "./templates/viaje-cancelado-email";
import { WelcomeEmail } from "./templates/welcome-email";

/**
 * Construcción de los templates de email con datos de EJEMPLO, compartida entre
 * el envío de prueba y la previsualización de /configuracion.
 * `now` se inyecta para no usar Date.now() en contextos que lo prohíben.
 */
export function construirTemplatePrueba(
  key: string,
  destinatario: string,
  now: Date = new Date()
): { subject: string; react: React.ReactElement } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  switch (key) {
    case "reset-password":
      return {
        subject: "Restablecé tu contraseña · Portal JUK",
        react: <ResetPasswordEmail name="Nombre de Ejemplo" resetUrl={`${appUrl}/reset-password`} />,
      };
    case "password-changed":
      return {
        subject: "Tu contraseña fue cambiada · Portal JUK",
        react: (
          <PasswordChangedEmail name="Nombre de Ejemplo" changedAt="12 de junio de 2026, 10:00 (ART)" />
        ),
      };
    case "recordatorio":
      return {
        subject: "Recordatorio · Application Form de Alumno Ejemplo (7 días)",
        react: (
          <RecordatorioEmail
            tutorNombre="Tutora de Ejemplo"
            alumnoNombre="Alumno Ejemplo"
            viajeCodigo="UK-2026-JUL-LONDON"
            paso="Application Form"
            diasAntes={7}
            fechaObjetivo={new Date(now.getTime() + 7 * 86_400_000)}
          />
        ),
      };
    case "viaje-cancelado":
      return {
        subject: "Cancelación del viaje UK-2026-JUL-LONDON",
        react: (
          <ViajeCanceladoEmail
            tutorNombre="Tutora de Ejemplo"
            alumnoNombre="Alumno Ejemplo"
            viajeNombre="Londres en Julio"
            viajeCodigo="UK-2026-JUL-LONDON"
          />
        ),
      };
    // Los datos de ejemplo son de Nivel 1 a propósito: la previsualización se
    // mira en pantalla compartida y no tiene por qué mostrar un DNI, ni
    // siquiera inventado (`src/lib/domain/inscripciones/niveles.ts`).
    case "inscripcion-recibida":
      return {
        subject: "Recibimos la ficha de Alumno Ejemplo · INS-000123",
        react: (
          <InscripcionRecibidaEmail
            tutorNombre="Tutora de Ejemplo"
            alumnoNombre="Alumno Ejemplo"
            codigo="INS-000123"
            viajeNombre="Londres en Julio"
            viajeCodigo="UK-2026-JUL-LONDON"
          />
        ),
      };
    case "inscripcion-nueva-equipo":
      return {
        subject: "Inscripción para revisar · INS-000123 · Alumno Ejemplo",
        react: (
          <InscripcionNuevaEquipoEmail
            codigo="INS-000123"
            alumnoNombre="Alumno Ejemplo"
            tutorNombre="Tutora de Ejemplo"
            tutorEmail={destinatario}
            viaje="Londres en Julio (UK-2026-JUL-LONDON)"
            variante="B"
            estadoLabel="Necesita revisión"
            requiereRevision
            motivo="La carga llegó sin invitación: nadie la puede vincular a una campaña."
            fichaUrl={`${appUrl}/inscripciones/INS-000123`}
          />
        ),
      };
    // El token del ejemplo es literalmente "ejemplo": la previsualización se
    // mira en pantalla compartida y un token de verdad abriría el formulario.
    case "invitacion-inscripcion":
      return {
        subject: "Completá la inscripción · Londres en Julio",
        react: (
          <InvitacionInscripcionEmail
            contactoNombre="Prof. Laura"
            prospectoNombre="Colegio Ejemplo"
            viajeNombre="Londres en Julio"
            viajeCodigo="UK-2026-JUL-LONDON"
            viajeFechas="Del 04/07/2026 al 18/07/2026"
            viajePais="reino_unido"
            formularioUrl={`${appUrl}/inscripcion?t=ejemplo&v=b`}
            venceEl={formatFechaArgentina(fechaDeVencimiento(now))}
            unsubscribeUrl={`${appUrl}/baja?token=ejemplo`}
          />
        ),
      };
    case "outreach-colegio":
      return {
        subject: "Viajes de estudio a UK para Colegio Ejemplo",
        react: (
          <OutreachColegioEmail
            nombreColegio="Colegio Ejemplo"
            nombreContacto="Prof. Laura"
            cuerpo={[
              "Cada año viajan con nosotros grupos de secundaria de todo el país, con acompañamiento de coordinadores argentinos y familias anfitrionas seleccionadas.",
              "Nos ocupamos de la logística completa: vuelos, alojamiento, curso, excursiones y seguro, para que el colegio se concentre solo en la experiencia educativa.",
            ]}
            ctaUrl={`${appUrl}`}
            unsubscribeUrl={`${appUrl}/baja?token=ejemplo`}
          />
        ),
      };
    case "welcome":
    default:
      return {
        subject: "Acceso al Portal JUK · Ejemplo",
        react: (
          <WelcomeEmail
            name="Nombre de Ejemplo"
            email={destinatario}
            audiencia="equipo"
            crearPasswordUrl={`${appUrl}/reset-password?token=ejemplo`}
            loginUrl={`${appUrl}/login`}
            invitedByName="María"
          />
        ),
      };
  }
}
