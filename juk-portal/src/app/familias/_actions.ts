"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireFamilia } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { getAlumnoById, getAlumnoByDni } from "@/lib/db/queries/alumnos";
import { alumnoIdDeAsignacion } from "@/lib/db/queries/asignaciones";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import type { NewAuditoriaEntry } from "@/lib/db/schema/auditoria";
import { documentos } from "@/lib/db/schema/documentos";
import { pasosAlumno, type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import {
  DocumentoInvalidoError,
  keyDocumento,
  validarDocumento,
} from "@/lib/domain/documentos";
import {
  ETA_SUBESTADOS,
  estadoPasoDesdeEta,
  type EtaSubEstado,
  type PasoCodigo,
} from "@/lib/domain/pasos";
import { putDocumento } from "@/lib/storage";

export type FamiliaResult = { ok: true; url?: string } | { ok: false; error: string };

type Sesion = Awaited<ReturnType<typeof requireFamilia>>;

async function safeAudit(entry: NewAuditoriaEntry) {
  try {
    await registrarAuditoria(entry);
  } catch (err) {
    Sentry.captureException(err);
  }
}

/**
 * Resuelve un paso por id y exige que el alumno dueño pertenezca a la familia
 * logueada. El ownership SIEMPRE se deriva server-side: pasoId → asignación →
 * alumno → alumno.familiaUserId === session.user.id.
 */
async function pasoConOwnership(
  pasoId: string
): Promise<
  | { ok: true; session: Sesion; paso: PasoAlumno }
  | { ok: false; error: string }
> {
  const session = await requireFamilia();

  const rows = await db.select().from(pasosAlumno).where(eq(pasosAlumno.id, pasoId)).limit(1);
  const paso = rows[0];
  if (!paso) return { ok: false, error: "El paso no existe." };

  const alumnoId = await alumnoIdDeAsignacion(paso.asignacionId);
  if (!alumnoId) return { ok: false, error: "La asignación del paso no existe." };

  const alumno = await getAlumnoById(alumnoId);
  if (!alumno || alumno.familiaUserId !== session.user.id) {
    return { ok: false, error: "No tenés acceso a este paso." };
  }

  return { ok: true, session, paso };
}

function revalidarFamilia(conDocumentacion = false) {
  revalidatePath("/familias/[dni]", "page");
  if (conDocumentacion) revalidatePath("/familias/[dni]/documentacion", "page");
}

/** Pasos del alumno que llevan documento adjunto desde el portal de familias. */
const CATEGORIA_POR_PASO: Partial<Record<PasoCodigo, (typeof documentos.$inferInsert)["categoria"]>> = {
  a1: "application_form",
  a3: "parental_consent",
  d1: "autorizacion_escribano",
  d2: "certificado_psicofisico",
  c1: "eta_screenshot",
};

export async function subirDocumentoFamiliaAction(formData: FormData): Promise<FamiliaResult> {
  const ids = z
    .object({ pasoId: z.string().uuid() })
    .safeParse({ pasoId: formData.get("pasoId") });
  if (!ids.success) return { ok: false, error: "Datos inválidos." };

  const file = formData.get("archivo");
  if (!(file instanceof File)) return { ok: false, error: "Adjuntá un archivo." };

  const owned = await pasoConOwnership(ids.data.pasoId);
  if (!owned.ok) return owned;
  const { session, paso } = owned;

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

    await db.insert(documentos).values({
      entidadTipo: "paso_alumno",
      entidadId: paso.id,
      categoria,
      nombreOriginal: file.name,
      r2Key: key,
      mimeType: mime,
      tamanoBytes: file.size,
      uploadedBy: session.user.id,
    });

    // Tras subir, el paso queda "Enviado — pendiente revisión JUK".
    const debeAvanzar =
      paso.estado === "pendiente" || paso.estado === "vencido" || paso.estado === "bloqueado";

    await db
      .update(pasosAlumno)
      .set({
        metadata: { ...(paso.metadata as Record<string, unknown>), archivoUrl: url },
        ...(debeAvanzar ? { estado: "en_progreso" as const } : {}),
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(pasosAlumno.id, paso.id));

    await safeAudit({
      accion: "subir_documento",
      entidadTipo: "paso_alumno",
      entidadId: paso.id,
      usuarioId: session.user.id,
      metadata: { categoria, nombre: file.name, bytes: file.size, origen: "familia" },
    });

    revalidarFamilia(true);
    return { ok: true, url };
  } catch (err) {
    if (err instanceof DocumentoInvalidoError) {
      return { ok: false, error: err.message };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos subir el documento. Probá de nuevo." };
  }
}

export async function reportarEtaFamiliaAction(input: {
  pasoId: string;
  subEstado: string;
}): Promise<FamiliaResult> {
  const parsed = z
    .object({
      pasoId: z.string().uuid(),
      subEstado: z.enum(ETA_SUBESTADOS),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const owned = await pasoConOwnership(parsed.data.pasoId);
  if (!owned.ok) return owned;
  const { session, paso } = owned;

  if (paso.codigo !== "c1") {
    return { ok: false, error: "Este paso no admite reporte de ETA." };
  }

  const subEstado: EtaSubEstado = parsed.data.subEstado;

  try {
    await db
      .update(pasosAlumno)
      .set({
        estado: estadoPasoDesdeEta(subEstado),
        metadata: { ...(paso.metadata as Record<string, unknown>), subEstado },
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(pasosAlumno.id, paso.id));

    await safeAudit({
      accion: "cambio_estado_paso",
      entidadTipo: "paso_alumno",
      entidadId: paso.id,
      usuarioId: session.user.id,
      metadata: { codigo: "c1", subEstado, origen: "familia" },
    });

    revalidarFamilia();
    return { ok: true };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos actualizar el ETA. Probá de nuevo." };
  }
}

export async function confirmarPasoFamiliaAction(input: {
  pasoId: string;
}): Promise<FamiliaResult> {
  const parsed = z.object({ pasoId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const owned = await pasoConOwnership(parsed.data.pasoId);
  if (!owned.ok) return owned;
  const { session, paso } = owned;

  if (paso.codigo !== "d1" && paso.codigo !== "d2") {
    return { ok: false, error: "Este paso no se confirma desde el portal." };
  }

  try {
    await db
      .update(pasosAlumno)
      .set({
        estado: "en_progreso",
        metadata: { ...(paso.metadata as Record<string, unknown>), confirmadoFamilia: true },
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(pasosAlumno.id, paso.id));

    await safeAudit({
      accion: "cambio_estado_paso",
      entidadTipo: "paso_alumno",
      entidadId: paso.id,
      usuarioId: session.user.id,
      metadata: { codigo: paso.codigo, confirmadoFamilia: true, origen: "familia" },
    });

    revalidarFamilia();
    return { ok: true };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos confirmar el paso. Probá de nuevo." };
  }
}

export async function reportarDatoFamiliaAction(input: {
  alumnoDni: string;
  campo: string;
  comentario?: string;
}): Promise<FamiliaResult> {
  const parsed = z
    .object({
      alumnoDni: z.string().min(1),
      campo: z.string().min(1),
      comentario: z.string().trim().max(2000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const session = await requireFamilia();

  const alumno = await getAlumnoByDni(parsed.data.alumnoDni);
  if (!alumno || alumno.familiaUserId !== session.user.id) {
    return { ok: false, error: "No tenés acceso a este alumno." };
  }

  await safeAudit({
    accion: "update",
    entidadTipo: "alumno",
    entidadId: alumno.id,
    usuarioId: session.user.id,
    metadata: {
      reporteDato: parsed.data.campo,
      comentario: parsed.data.comentario ?? null,
      origen: "familia",
    },
  });

  revalidarFamilia();
  return { ok: true };
}
