import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  prospectoComunicaciones,
  prospectoComunicacionEstado,
  prospectos,
  type Prospecto,
} from "@/lib/db/schema/prospectos";

/**
 * Tracking de emails de outreach (webhook de Resend) y baja de suscripción.
 * Separado de queries/prospectos.ts porque lo consumen endpoints públicos
 * (webhook + página /baja), sin pasar por los guards de admin.
 */

export type ComunicacionEstado = (typeof prospectoComunicacionEstado.enumValues)[number];

/** Actualiza el estado de una comunicación por su resend_message_id. No-op si no matchea. */
export async function actualizarEstadoComunicacion(
  resendMessageId: string,
  estado: ComunicacionEstado
): Promise<void> {
  await db
    .update(prospectoComunicaciones)
    .set({ estado })
    .where(eq(prospectoComunicaciones.resendMessageId, resendMessageId));
}

export async function getProspectoByUnsubToken(token: string): Promise<Prospecto | null> {
  const rows = await db
    .select()
    .from(prospectos)
    .where(eq(prospectos.unsubscribeToken, token))
    .limit(1);
  return rows[0] ?? null;
}

/** Da de baja el outreach por token. Idempotente: devuelve el prospecto o null si el token no existe. */
export async function darDeBajaPorToken(token: string): Promise<Prospecto | null> {
  const rows = await db
    .update(prospectos)
    .set({ suscritoOutreach: false, updatedAt: new Date() })
    .where(eq(prospectos.unsubscribeToken, token))
    .returning();
  return rows[0] ?? null;
}
