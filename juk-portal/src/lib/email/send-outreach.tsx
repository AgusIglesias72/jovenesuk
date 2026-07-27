import { sendEmail } from "./index";
import { OutreachColegioEmail } from "./templates/outreach-colegio";

/**
 * Envía un email de outreach a un colegio desde el subdominio de marketing.
 * Incluye los headers List-Unsubscribe (RFC 8058, one-click) para que los
 * clientes de correo muestren el botón de baja nativo y no penalicen la
 * reputación del dominio. Devuelve el id de Resend para persistirlo como
 * resendMessageId y poder rastrear el mensaje.
 */
export async function sendOutreachEmail(opts: {
  to: string;
  nombreColegio: string;
  nombreContacto?: string;
  asunto: string;
  cuerpo: string[];
  ctaUrl: string;
  unsubscribeUrl: string;
}): Promise<{ id: string | null }> {
  const data = await sendEmail({
    to: opts.to,
    tipo: "marketing",
    subject: opts.asunto,
    headers: {
      "List-Unsubscribe": `<${opts.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    react: (
      <OutreachColegioEmail
        nombreColegio={opts.nombreColegio}
        nombreContacto={opts.nombreContacto}
        cuerpo={opts.cuerpo}
        ctaUrl={opts.ctaUrl}
        unsubscribeUrl={opts.unsubscribeUrl}
      />
    ),
  });

  return { id: data?.id ?? null };
}
