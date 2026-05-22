import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.EMAIL_FROM_NAME ?? "JUK"} <${process.env.EMAIL_FROM_ADDRESS ?? "info@jovenesenuk.com"}>`;
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "info@jovenesenuk.com";

/**
 * Send a transactional email.
 * `react` should be a React Email component from lib/email/templates/.
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
}) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    react: opts.react,
    replyTo: opts.replyTo ?? REPLY_TO,
  });

  if (error) {
    console.error("[email] send failed", error);
    throw new Error(`Resend error: ${error.message}`);
  }

  return data;
}
