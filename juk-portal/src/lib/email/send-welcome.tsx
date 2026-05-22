import { sendEmail } from "./index";
import { WelcomeEmail } from "./templates/welcome-email";

/**
 * Sends the welcome email with a temporary password.
 * Called from the "create user" server action in (admin)/usuarios.
 */
export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  temporaryPassword: string;
  invitedByName: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.jovenesenuk.com";
  const loginUrl = `${appUrl}/login?email=${encodeURIComponent(opts.to)}`;

  await sendEmail({
    to: opts.to,
    subject: `Acceso al Portal JUK · ${opts.name}`,
    react: (
      <WelcomeEmail
        name={opts.name}
        email={opts.to}
        temporaryPassword={opts.temporaryPassword}
        loginUrl={loginUrl}
        invitedByName={opts.invitedByName}
      />
    ),
  });
}
