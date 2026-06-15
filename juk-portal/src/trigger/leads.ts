import { task } from "@trigger.dev/sdk/v3";

/**
 * Aviso al equipo de JUK por una consulta nueva de la web pública.
 *
 * Se dispara desde la server action `submitLead` (fire-and-forget) para no
 * bloquear la respuesta al usuario. El lead ya quedó persistido; este job solo
 * notifica, así que un fallo de Resend no afecta la captación.
 */
export const notificarConsultaNueva = task({
  id: "notificar-consulta-nueva",
  maxDuration: 120,
  run: async (payload: { consultaId: string }) => {
    const { getConsultaById } = await import("@/lib/db/queries/leads");
    const consulta = await getConsultaById(payload.consultaId);
    if (!consulta) return { enviado: false, motivo: "consulta inexistente" };

    const { sendConsultaNuevaEmail } = await import("@/lib/email/send-consulta-nueva");
    await sendConsultaNuevaEmail(consulta);
    return { enviado: true };
  },
});
