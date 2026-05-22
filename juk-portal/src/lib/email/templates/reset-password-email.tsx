import { EmailLayout, EmailHeading, EmailParagraph, EmailButton, EmailCallout } from "./_layout";

/**
 * ResetPasswordEmail — sent when a user requests a password reset.
 *
 * Used in: PRD §1.2 US-04
 *
 * The reset link expires in 24h and is single-use.
 */

interface ResetPasswordEmailProps {
  name: string;
  resetUrl: string;
}

export function ResetPasswordEmail({ name, resetUrl }: ResetPasswordEmailProps) {
  return (
    <EmailLayout preview="Restablecé tu contraseña del Portal JUK">
      <EmailHeading>Hola {name},</EmailHeading>

      <EmailParagraph>
        Recibimos un pedido para restablecer la contraseña de tu cuenta en el Portal JUK.
      </EmailParagraph>

      <EmailButton href={resetUrl} variant="primary">
        Restablecer contraseña
      </EmailButton>

      <EmailCallout>
        Este link es válido por <strong>24 horas</strong> y puede usarse una sola vez.
        Si no lo activás a tiempo, vas a tener que solicitar uno nuevo.
      </EmailCallout>

      <EmailParagraph>
        Si no pediste restablecer tu contraseña, podés ignorar este email — tu cuenta está
        segura y la contraseña actual sigue siendo válida.
      </EmailParagraph>
    </EmailLayout>
  );
}

ResetPasswordEmail.PreviewProps = {
  name: "Felix",
  resetUrl: "https://portal.jovenesenuk.com/reset-password?token=abc123xyz",
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;
