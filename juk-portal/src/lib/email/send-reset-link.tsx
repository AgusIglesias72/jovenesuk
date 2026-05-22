import { sendEmail } from "./index";
import { ResetPasswordEmail } from "./templates/reset-password-email";

/**
 * Sends the password reset email.
 * Called by Better-Auth's `sendResetPassword` hook (see lib/auth/index.ts).
 */
export async function sendResetPasswordEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  await sendEmail({
    to: opts.to,
    subject: "Restablecé tu contraseña · Portal JUK",
    react: <ResetPasswordEmail name={opts.name} resetUrl={opts.resetUrl} />,
  });
}
