import * as Sentry from "@sentry/nextjs";

import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";

/**
 * Auditoría best-effort para server actions y route handlers: si falla, se
 * reporta a Sentry pero no se rompe la operación que el usuario ya vio como
 * exitosa. Vive acá y no en queries/auditoria.ts porque ese módulo lo importan
 * los jobs de Trigger.dev, que no deben arrastrar @sentry/nextjs.
 */
export async function safeAudit(entry: NewAuditoriaEntry): Promise<void> {
  try {
    await registrarAuditoria(entry);
  } catch (err) {
    Sentry.captureException(err);
  }
}
