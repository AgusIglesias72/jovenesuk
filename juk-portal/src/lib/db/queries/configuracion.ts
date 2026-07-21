import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { configuracion } from "@/lib/db/schema/configuracion";
import {
  MAIL_SETTINGS_DEFAULT,
  mailSettingsSchema,
  type MailSettings,
} from "@/lib/domain/configuracion";

const CLAVE_MAILS = "mails";

/** Defaults de mails: constantes del dominio, pisables por env (deploy) y por DB (UI). */
function defaultsConEnv(): MailSettings {
  return {
    nombreRemitente: process.env.EMAIL_FROM_NAME ?? MAIL_SETTINGS_DEFAULT.nombreRemitente,
    remitenteAutomaticos:
      process.env.EMAIL_FROM_ADDRESS ?? MAIL_SETTINGS_DEFAULT.remitenteAutomaticos,
    remitenteComunicaciones:
      process.env.EMAIL_FROM_COMUNICACIONES ?? MAIL_SETTINGS_DEFAULT.remitenteComunicaciones,
    replyTo: process.env.EMAIL_REPLY_TO ?? MAIL_SETTINGS_DEFAULT.replyTo,
  };
}

export async function getMailSettings(): Promise<MailSettings> {
  const rows = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.clave, CLAVE_MAILS))
    .limit(1);
  const guardado = rows[0]?.valor;
  if (!guardado) return defaultsConEnv();

  const parsed = mailSettingsSchema.safeParse({ ...defaultsConEnv(), ...guardado });
  // Valor corrupto en DB → defaults (nunca romper el envío de mails por esto).
  return parsed.success ? parsed.data : defaultsConEnv();
}

export async function setMailSettings(valor: MailSettings, userId: string): Promise<void> {
  await db
    .insert(configuracion)
    .values({ clave: CLAVE_MAILS, valor, updatedAt: new Date(), updatedBy: userId })
    .onConflictDoUpdate({
      target: configuracion.clave,
      set: { valor, updatedAt: new Date(), updatedBy: userId },
    });
}
