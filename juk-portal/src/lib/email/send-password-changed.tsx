import { sendEmail } from "./index";
import { PasswordChangedEmail } from "./templates/password-changed-email";

/**
 * Sends the password-changed confirmation/security notification.
 * Should be called from a Better-Auth hook OR explicitly after password update.
 */
export async function sendPasswordChangedEmail(opts: {
  to: string;
  name: string;
  changedAt: Date;
  ipAddress?: string;
}) {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const formatted = `${formatter.format(opts.changedAt)} (ART)`;

  await sendEmail({
    to: opts.to,
    subject: "Tu contraseña fue cambiada · Portal JUK",
    react: (
      <PasswordChangedEmail
        name={opts.name}
        changedAt={formatted}
        ipAddress={opts.ipAddress}
      />
    ),
  });
}
