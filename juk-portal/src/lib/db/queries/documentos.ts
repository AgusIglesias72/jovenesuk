import { db } from "@/lib/db";
import { documentos, type Documento, type NewDocumento } from "@/lib/db/schema/documentos";

import { unicaFila } from "./errors";

/** Registra un documento ya subido a R2 (la subida la hace lib/storage). */
export async function insertDocumento(data: NewDocumento): Promise<Documento> {
  const rows = await db.insert(documentos).values(data).returning();
  return unicaFila(rows, "documentos");
}
