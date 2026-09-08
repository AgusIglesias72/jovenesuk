"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk } from "@/lib/auth/helpers";
import { alumnoIdDeAsignacion } from "@/lib/db/queries/asignaciones";
import { insertDocumento } from "@/lib/db/queries/documentos";
import { getPasoAlumnoById, updatePasoAlumno } from "@/lib/db/queries/pasos-alumno";
import type { NewDocumento } from "@/lib/db/schema/documentos";
import {
  DocumentoInvalidoError,
  keyDocumento,
  validarDocumento,
} from "@/lib/domain/documentos";
import type { PasoCodigo } from "@/lib/domain/pasos";
import { putDocumento } from "@/lib/storage";

/** Pasos del alumno que llevan documento adjunto y su categoría. */
const CATEGORIA_POR_PASO: Partial<Record<PasoCodigo, NewDocumento["categoria"]>> = {
  a1: "application_form",
  a3: "parental_consent",
  c1: "eta_screenshot",
  c2: "immigration_letter",
  c3: "accommodation_letter",
  d1: "autorizacion_escribano",
  d2: "certificado_psicofisico",
};

export async function subirDocumentoPasoAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const session = await requireAdminJuk();

  const ids = z
    .object({ pasoId: z.string().uuid() })
    .safeParse({ pasoId: formData.get("pasoId") });
  if (!ids.success) return { ok: false, error: "Datos inválidos." };

  const file = formData.get("archivo");
  if (!(file instanceof File)) return { ok: false, error: "Adjuntá un archivo." };

  const paso = await getPasoAlumnoById(ids.data.pasoId);
  if (!paso) return { ok: false, error: "El paso no existe." };

  // El dueño se deriva del paso (nunca del cliente).
  const alumnoId = await alumnoIdDeAsignacion(paso.asignacionId);
  if (!alumnoId) return { ok: false, error: "La asignación del paso no existe." };

  const categoria = CATEGORIA_POR_PASO[paso.codigo as PasoCodigo];
  if (!categoria) return { ok: false, error: "Este paso no lleva documento adjunto." };

  try {
    const mime = validarDocumento({ mime: file.type, bytes: file.size });
    const key = keyDocumento({
      entidadTipo: "paso_alumno",
      entidadId: paso.id,
      nombreOriginal: file.name,
      mime,
      timestamp: new Date(),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await putDocumento(key, buffer, mime);

    await insertDocumento({
      entidadTipo: "paso_alumno",
      entidadId: paso.id,
      categoria,
      nombreOriginal: file.name,
      r2Key: key,
      mimeType: mime,
      tamanoBytes: file.size,
      uploadedBy: session.user.id,
    });

    await updatePasoAlumno(
      paso.id,
      { metadata: { ...paso.metadata, archivoUrl: url } },
      session.user.id
    );

    await safeAudit({
      accion: "subir_documento",
      entidadTipo: "paso_alumno",
      entidadId: paso.id,
      usuarioId: session.user.id,
      metadata: { categoria, nombre: file.name, bytes: file.size },
    });

    revalidatePath("/alumnos/[id]", "page");
    return { ok: true, data: { url } };
  } catch (err) {
    if (err instanceof DocumentoInvalidoError) {
      return { ok: false, error: err.message };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos subir el documento. Probá de nuevo." };
  }
}
