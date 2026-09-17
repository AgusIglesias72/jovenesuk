import { getMailSettings } from "@/lib/db/queries/configuracion";
import { listEmailsAdmins } from "@/lib/db/queries/usuarios";
import type { Inscripcion } from "@/lib/db/schema/inscripciones";
import {
  INSCRIPCION_ESTADO_LABELS,
  VARIANTE_LABELS_CORTOS,
} from "@/lib/domain/inscripciones/labels";
import { soloNivel1 } from "@/lib/domain/inscripciones/niveles";
import { codigoInscripcion } from "@/lib/domain/inscripciones/schema";

import { sendEmail } from "./index";
import {
  fichaDeLaFila,
  nombreDelAlumno,
  type ViajeDeLaInscripcion,
} from "./send-inscripcion-recibida";
import { InscripcionNuevaEquipoEmail } from "./templates/inscripcion-nueva-equipo";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.jovenesenuk.com";
}

/**
 * Link a la ficha en el back-office. La ruta nace con slug: el código público
 * `INS-000123`, el mismo que resuelve `getInscripcionByNumero`. El uuid de la
 * fila no viaja nunca por mail.
 */
export function fichaInscripcionUrl(numero: number, base = appUrl()): string {
  return `${base.replace(/\/+$/, "")}/inscripciones/${codigoInscripcion(numero)}`;
}

export function asuntoInscripcionNueva(inscripcion: Inscripcion): string {
  const alumno = nombreDelAlumno(soloNivel1(fichaDeLaFila(inscripcion)));
  const encabezado =
    inscripcion.estado === "requiere_revision" ? "Inscripción para revisar" : "Nueva inscripción";
  const codigo = codigoInscripcion(inscripcion.numero);
  return alumno ? `${encabezado} · ${codigo} · ${alumno}` : `${encabezado} · ${codigo}`;
}

function viajeParaMostrar(viaje?: ViajeDeLaInscripcion | null): string | null {
  if (!viaje) return null;
  if (viaje.nombre && viaje.codigo) return `${viaje.nombre} (${viaje.codigo})`;
  return viaje.nombre ?? viaje.codigo ?? null;
}

/**
 * Aviso interno por una ficha nueva del Application Form. Misma cadena de
 * destinatarios que `sendConsultaNuevaEmail` y `sendReporteDatoEmail`: TODOS los
 * admins activos; si no hubiera ninguno, `LEADS_NOTIFY_TO` o el reply-to
 * configurado, para que el aviso no se pierda.
 *
 * El `replyTo` apunta al tutor (Nivel 1): el equipo le contesta directo desde su
 * casilla, sin tener que abrir el portal para copiar un email.
 *
 * El cuerpo se arma con `soloNivel1`, igual que el acuse a la familia: la ficha
 * se mira dentro del portal, con sesión, no en una casilla de mail del equipo.
 */
export async function sendInscripcionNuevaEmail(
  inscripcion: Inscripcion,
  viaje?: ViajeDeLaInscripcion | null
): Promise<void> {
  const visible = soloNivel1(fichaDeLaFila(inscripcion));

  const admins = await listEmailsAdmins();
  const to =
    admins.length > 0
      ? admins
      : (process.env.LEADS_NOTIFY_TO ?? (await getMailSettings()).replyTo);

  await sendEmail({
    to,
    tipo: "automatico",
    replyTo: visible.tutor1Email,
    subject: asuntoInscripcionNueva(inscripcion),
    react: (
      <InscripcionNuevaEquipoEmail
        codigo={codigoInscripcion(inscripcion.numero)}
        alumnoNombre={nombreDelAlumno(visible)}
        tutorNombre={visible.tutor1Nombre ?? "—"}
        tutorEmail={visible.tutor1Email ?? "—"}
        viaje={viajeParaMostrar(viaje)}
        variante={VARIANTE_LABELS_CORTOS[inscripcion.variante]}
        estadoLabel={INSCRIPCION_ESTADO_LABELS[inscripcion.estado]}
        requiereRevision={inscripcion.estado === "requiere_revision"}
        motivo={inscripcion.motivo}
        fichaUrl={fichaInscripcionUrl(inscripcion.numero)}
      />
    ),
  });
}
