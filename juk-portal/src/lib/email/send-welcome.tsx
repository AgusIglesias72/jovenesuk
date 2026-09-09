import { sendEmail } from "./index";
import { WelcomeEmail } from "./templates/welcome-email";

/**
 * Invitación al portal con el link de creación de contraseña (nunca una
 * contraseña). El link lo genera Better-Auth: este módulo solo lo maqueta,
 * así que el llamador es el hook `sendResetPassword` de lib/auth.
 */
export type AudienciaAcceso = "equipo" | "familia";

export function loginUrlDe(email: string, audiencia: AudienciaAcceso): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.jovenesenuk.com";
  const query = new URLSearchParams(
    audiencia === "familia" ? { portal: "familias", email } : { email }
  );
  return `${appUrl}/login?${query.toString()}`;
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  audiencia: AudienciaAcceso;
  crearPasswordUrl: string;
  invitedByName?: string;
}) {
  const esFamilia = opts.audiencia === "familia";

  await sendEmail({
    to: opts.to,
    tipo: "comunicacion",
    subject: esFamilia
      ? `Acceso al Portal de Familias · Jóvenes en UK`
      : `Acceso al Portal JUK · ${opts.name}`,
    react: (
      <WelcomeEmail
        name={opts.name}
        email={opts.to}
        audiencia={opts.audiencia}
        crearPasswordUrl={opts.crearPasswordUrl}
        loginUrl={loginUrlDe(opts.to, opts.audiencia)}
        {...(opts.invitedByName ? { invitedByName: opts.invitedByName } : {})}
      />
    ),
  });
}
