import {
  EmailLayout,
  EmailHeading,
  EmailParagraph,
  EmailButton,
  EmailCallout,
  EmailMonoCode,
} from "./_layout";

/**
 * WelcomeEmail — invitación al portal, sin contraseñas.
 *
 * Used in: PRD §1.2 US-03 (equipo) y US-19b (familias).
 *
 * El mail nunca lleva credenciales: trae el link de creación de contraseña
 * (token de Better-Auth, 24 h) y el link de login que precarga el email.
 */

type Audiencia = "equipo" | "familia";

interface WelcomeEmailProps {
  name: string;
  email: string;
  audiencia: Audiencia;
  crearPasswordUrl: string;
  loginUrl: string;
  invitedByName?: string;
}

export function WelcomeEmail({
  name,
  email,
  audiencia,
  crearPasswordUrl,
  loginUrl,
  invitedByName,
}: WelcomeEmailProps) {
  const esFamilia = audiencia === "familia";
  const portal = esFamilia ? "Portal de Familias" : "Portal de Gestión Interno";

  return (
    <EmailLayout preview={`Acceso al ${portal} de Jóvenes en UK`}>
      <EmailHeading>Hola {name},</EmailHeading>

      {esFamilia ? (
        <EmailParagraph>
          Te damos acceso al Portal de Familias de Jóvenes en UK. Desde ahí vas a
          poder seguir el viaje: la documentación que falta, el estado de cada
          trámite y el plan de pagos, todo en un solo lugar.
        </EmailParagraph>
      ) : (
        <EmailParagraph>
          {invitedByName ? `${invitedByName} te dio` : "Te dieron"} acceso al Portal
          de Gestión Interno de Jóvenes en UK. Vas a poder gestionar alumnos,
          viajes y trámites desde ahí.
        </EmailParagraph>
      )}

      <EmailParagraph>
        Tu usuario es <EmailMonoCode>{email}</EmailMonoCode>. Para entrar por
        primera vez, creá tu contraseña:
      </EmailParagraph>

      <EmailButton href={crearPasswordUrl}>Crear mi contraseña</EmailButton>

      <EmailCallout>
        El link vence en <strong>24 horas</strong> y se usa una sola vez. Si se te
        vence, pedí uno nuevo desde <EmailMonoCode>{loginUrl}</EmailMonoCode> con
        la opción &ldquo;Olvidé mi contraseña&rdquo;.
      </EmailCallout>

      <EmailParagraph>
        {esFamilia
          ? "Si no esperabas este email, escribinos respondiendo a este mensaje: puede que nos hayamos equivocado de dirección."
          : "Si no esperabas este acceso, ignorá este email: sin crear la contraseña, nadie puede entrar con tu usuario."}
      </EmailParagraph>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Tomas Méndez",
  email: "tomas@jovenesenuk.com",
  audiencia: "equipo",
  crearPasswordUrl: "https://portal.jovenesenuk.com/reset-password?token=ejemplo",
  loginUrl: "https://portal.jovenesenuk.com/login?email=tomas%40jovenesenuk.com",
  invitedByName: "María",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
