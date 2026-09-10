import { getMailSettings } from "@/lib/db/queries/configuracion";
import { listEmailsAdmins } from "@/lib/db/queries/usuarios";

import { sendEmail } from "./index";
import { ReporteDatoEmail } from "./templates/reporte-dato-email";

export type ReporteDato = {
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoDni: string;
  campo: string;
  comentario?: string | null;
  /** Email de la cuenta de familia que reporta: el equipo le responde directo. */
  reportadoPor: string;
};

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.jovenesenuk.com";
}

export function asuntoReporteDato(r: Pick<ReporteDato, "alumnoNombre" | "alumnoApellido" | "alumnoDni">): string {
  return `Dato incorrecto reportado · ${r.alumnoNombre} ${r.alumnoApellido} (${r.alumnoDni})`;
}

export function fichaEdicionUrl(alumnoDni: string, base = appUrl()): string {
  return `${base.replace(/\/+$/, "")}/alumnos/${encodeURIComponent(alumnoDni)}/editar`;
}

/**
 * Aviso interno por un dato incorrecto reportado desde el Portal de Familias.
 * Mismo criterio de destinatarios que `sendConsultaNuevaEmail`: TODOS los
 * admins activos; si no hubiera ninguno, `LEADS_NOTIFY_TO` o el reply-to
 * configurado, para que el aviso no se pierda. Respeta EMAIL_DRY_RUN vía
 * `sendEmail`.
 */
export async function sendReporteDatoEmail(reporte: ReporteDato): Promise<void> {
  const admins = await listEmailsAdmins();
  const to =
    admins.length > 0
      ? admins
      : (process.env.LEADS_NOTIFY_TO ?? (await getMailSettings()).replyTo);

  await sendEmail({
    to,
    tipo: "automatico",
    replyTo: reporte.reportadoPor,
    subject: asuntoReporteDato(reporte),
    react: (
      <ReporteDatoEmail
        alumnoNombre={`${reporte.alumnoNombre} ${reporte.alumnoApellido}`}
        alumnoDni={reporte.alumnoDni}
        campo={reporte.campo}
        comentario={reporte.comentario}
        reportadoPor={reporte.reportadoPor}
        fichaUrl={fichaEdicionUrl(reporte.alumnoDni)}
      />
    ),
  });
}
