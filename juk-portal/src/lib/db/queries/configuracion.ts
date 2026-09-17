import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { configuracion } from "@/lib/db/schema/configuracion";
import {
  MAIL_SETTINGS_DEFAULT,
  mailSettingsSchema,
  type MailSettings,
} from "@/lib/domain/configuracion";
import {
  FORMULARIO_SETTINGS_DEFAULT,
  parsearFormularioSettings,
  type FormularioSettings,
} from "@/lib/domain/configuracion/formulario";

const CLAVE_MAILS = "mails";
const CLAVE_FORMULARIO = "formulario";

/** Defaults de mails: constantes del dominio, pisables por env (deploy) y por DB (UI). */
function defaultsConEnv(): MailSettings {
  return {
    nombreRemitente: process.env.EMAIL_FROM_NAME ?? MAIL_SETTINGS_DEFAULT.nombreRemitente,
    remitenteAutomaticos:
      process.env.EMAIL_FROM_ADDRESS ?? MAIL_SETTINGS_DEFAULT.remitenteAutomaticos,
    remitenteComunicaciones:
      process.env.EMAIL_FROM_COMUNICACIONES ?? MAIL_SETTINGS_DEFAULT.remitenteComunicaciones,
    remitenteMarketing:
      process.env.EMAIL_FROM_OUTREACH ?? MAIL_SETTINGS_DEFAULT.remitenteMarketing,
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

/**
 * Variante visual activa del Application Form. Lo consume una página PÚBLICA,
 * así que la lectura no puede fallar por el contenido: el merge con el default
 * y el `safeParse` viven en `parsearFormularioSettings` (dominio), que devuelve
 * el default ante cualquier basura guardada. Mismo criterio que
 * `getMailSettings` con los remitentes.
 */
export async function getFormularioSettings(): Promise<FormularioSettings> {
  const rows = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.clave, CLAVE_FORMULARIO))
    .limit(1);
  const guardado = rows[0]?.valor;
  // Clave todavía no escrita (el equipo nunca entró a /configuracion): default.
  if (!guardado) return FORMULARIO_SETTINGS_DEFAULT;

  return parsearFormularioSettings(guardado);
}

export async function setFormularioSettings(
  valor: FormularioSettings,
  userId: string
): Promise<void> {
  await db
    .insert(configuracion)
    .values({ clave: CLAVE_FORMULARIO, valor, updatedAt: new Date(), updatedBy: userId })
    .onConflictDoUpdate({
      target: configuracion.clave,
      set: { valor, updatedAt: new Date(), updatedBy: userId },
    });
}
