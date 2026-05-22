import { db } from "@/lib/db";
import { auditoria, type NewAuditoriaEntry } from "@/lib/db/schema/auditoria";

export async function registrarAuditoria(entry: NewAuditoriaEntry): Promise<void> {
  await db.insert(auditoria).values(entry);
}
