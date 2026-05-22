import { EmailLayout, EmailHeading, EmailParagraph, EmailCallout } from "./_layout";

/**
 * PasswordChangedEmail — confirms that a password was successfully updated.
 *
 * Used in: PRD §1.2 US-04 — "El sistema notifica por email cuando la contraseña
 * fue cambiada exitosamente."
 *
 * Also doubles as a security notification: if the user did NOT change their
 * password, they should contact support immediately.
 */

interface PasswordChangedEmailProps {
  name: string;
  changedAt: string;  // formatted human-readable timestamp, e.g. "19 de mayo de 2026, 18:42 (ART)"
  ipAddress?: string;
}

export function PasswordChangedEmail({ name, changedAt, ipAddress }: PasswordChangedEmailProps) {
  return (
    <EmailLayout preview="Tu contraseña del Portal JUK fue cambiada">
      <EmailHeading>Hola {name},</EmailHeading>

      <EmailParagraph>
        Te confirmamos que la contraseña de tu cuenta en el Portal JUK fue cambiada exitosamente.
      </EmailParagraph>

      <EmailCallout>
        <strong>Fecha:</strong> {changedAt}
        {ipAddress && (
          <>
            <br />
            <strong>Desde la IP:</strong> {ipAddress}
          </>
        )}
      </EmailCallout>

      <EmailParagraph>
        Si fuiste vos, no hace falta que hagas nada — tu cuenta sigue normalmente.
      </EmailParagraph>

      <EmailParagraph>
        <strong>¿No fuiste vos?</strong> Contactanos lo antes posible a{" "}
        <a href="mailto:info@jovenesenuk.com" style={{ color: "#0A1F44" }}>
          info@jovenesenuk.com
        </a>{" "}
        para asegurar tu cuenta.
      </EmailParagraph>
    </EmailLayout>
  );
}

PasswordChangedEmail.PreviewProps = {
  name: "Delfina",
  changedAt: "19 de mayo de 2026, 18:42 (ART)",
  ipAddress: "200.49.x.x",
} satisfies PasswordChangedEmailProps;

export default PasswordChangedEmail;
