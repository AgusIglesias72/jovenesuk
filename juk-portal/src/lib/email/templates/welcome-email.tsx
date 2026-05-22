import {
  EmailLayout,
  EmailHeading,
  EmailParagraph,
  EmailButton,
  EmailCallout,
  EmailMonoCode,
} from "./_layout";

/**
 * WelcomeEmail — sent when a super_admin creates a new admin user.
 *
 * Used in: PRD §1.2 US-03
 *
 * The new user receives a temporary password they MUST change on first
 * login, and a link that pre-fills their email.
 */

interface WelcomeEmailProps {
  name: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  invitedByName: string;
}

export function WelcomeEmail({
  name,
  email,
  temporaryPassword,
  loginUrl,
  invitedByName,
}: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Acceso al Portal JUK — contraseña temporal adentro`}>
      <EmailHeading>Hola {name},</EmailHeading>

      <EmailParagraph>
        {invitedByName} te dio acceso al Portal de Gestión Interno de Jóvenes en UK.
        Vas a poder gestionar alumnos, viajes y trámites desde ahí.
      </EmailParagraph>

      <EmailParagraph>
        Estos son tus datos de acceso:
      </EmailParagraph>

      <EmailCallout>
        <strong>Email:</strong>{" "}<EmailMonoCode>{email}</EmailMonoCode>
        <br />
        <strong>Contraseña temporal:</strong>{" "}<EmailMonoCode>{temporaryPassword}</EmailMonoCode>
      </EmailCallout>

      <EmailParagraph>
        Por seguridad, vas a tener que cambiar la contraseña en el primer inicio de sesión.
      </EmailParagraph>

      <EmailButton href={loginUrl}>Ingresar al portal</EmailButton>

      <EmailParagraph>
        Si no esperabas este acceso o no reconocés a {invitedByName}, ignorá este email.
        Sin tu primer login, la cuenta queda inactiva.
      </EmailParagraph>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Tomas Méndez",
  email: "tomas@jovenesenuk.com",
  temporaryPassword: "Bienvenido-2026",
  loginUrl: "https://portal.jovenesenuk.com/login?email=tomas%40jovenesenuk.com",
  invitedByName: "María",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
