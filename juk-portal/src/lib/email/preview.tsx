import { render } from "@react-email/render";

import { PasswordChangedEmail } from "./templates/password-changed-email";
import { RecordatorioEmail } from "./templates/recordatorio-email";
import { ResetPasswordEmail } from "./templates/reset-password-email";
import { ViajeCanceladoEmail } from "./templates/viaje-cancelado-email";
import { WelcomeEmail } from "./templates/welcome-email";

/**
 * Construcción de los templates de email con datos de EJEMPLO, compartida entre
 * el envío de prueba (Configuración / Tests) y la previsualización del Portal.
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
    case "welcome":
    default:
      return {
        subject: "Acceso al Portal JUK · Ejemplo",
        react: (
          <WelcomeEmail
            name="Nombre de Ejemplo"
            email={destinatario}
            temporaryPassword="Temporal123!"
            loginUrl={`${appUrl}/login`}
            invitedByName="María"
          />
        ),
      };
  }
}

/** Renderiza el template a HTML para previsualizarlo en un iframe. */
export async function renderTemplatePruebaHTML(key: string, destinatario: string): Promise<string> {
  const { react } = construirTemplatePrueba(key, destinatario);
  return render(react);
}
