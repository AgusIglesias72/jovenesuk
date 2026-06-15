import { getMailSettings } from "@/lib/db/queries/configuracion";
import { listEmailsAdmins } from "@/lib/db/queries/usuarios";
import {
  CUANDO_LABELS,
  DESTINO_LABELS,
  MODALIDAD_LABELS,
  PARA_QUIEN_LABELS,
} from "@/lib/domain/leads";
import type { Consulta } from "@/lib/db/schema/leads";

import { sendEmail } from "./index";
import { ConsultaNuevaEmail } from "./templates/consulta-nueva-email";

/**
 * Aviso interno por una consulta nueva de la web pública. Va a TODOS los admins
 * activos del portal; si no hubiera ninguno, cae a `LEADS_NOTIFY_TO` o al
 * reply-to configurado para no perder el aviso.
 */
export async function sendConsultaNuevaEmail(consulta: Consulta): Promise<void> {
  const admins = await listEmailsAdmins();
  const to =
    admins.length > 0
      ? admins
      : (process.env.LEADS_NOTIFY_TO ?? (await getMailSettings()).replyTo);

  await sendEmail({
    to,
    tipo: "automatico",
    replyTo: consulta.email,
    subject: `Nueva consulta web · ${consulta.nombre} ${consulta.apellido}`,
    react: (
      <ConsultaNuevaEmail
        nombre={consulta.nombre}
        apellido={consulta.apellido}
        email={consulta.email}
        telefono={consulta.telefono}
        paraQuien={PARA_QUIEN_LABELS[consulta.paraQuien]}
        institucion={consulta.institucion}
        modalidad={MODALIDAD_LABELS[consulta.modalidad]}
        destino={consulta.destino ? DESTINO_LABELS[consulta.destino] : null}
        cuando={CUANDO_LABELS[consulta.cuando]}
        mensaje={consulta.mensaje}
      />
    ),
  });
}
