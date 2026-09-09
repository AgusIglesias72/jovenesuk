"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk } from "@/lib/auth/helpers";
import {
  convertirAColegio,
  crearProspectosMasivo,
  createProspecto,
  darDeBajaOutreach,
  getProspectoById,
  moverProspecto,
  registrarComunicacion,
  reordenarColumna,
  updateProspecto,
} from "@/lib/db/queries/prospectos";
import {
  ProspectoNotFoundError,
  enviarOutreachSchema,
  moverEstadoSchema,
  notaSchema,
  parseProspectosCsv,
  prospectoCreateSchema,
  prospectoUpdateSchema,
  reordenarSchema,
} from "@/lib/domain/prospectos";
import { sendOutreachEmail } from "@/lib/email/send-outreach";
import { putDocumento } from "@/lib/storage";
import type {
  Prospecto,
  ProspectoComunicacion,
} from "@/lib/db/schema/prospectos";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

export async function createProspectoAction(
  input: unknown
): Promise<ActionResult<Prospecto>> {
  const session = await requireAdminJuk();

  const parsed = prospectoCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const prospecto = await createProspecto({
      ...parsed.data,
      createdBy: session.user.id,
    });
    await safeAudit({
      accion: "create",
      entidadTipo: "prospecto",
      entidadId: prospecto.id,
      usuarioId: session.user.id,
    });
    revalidatePath("/prospectos");
    return { ok: true, data: prospecto };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos crear el prospecto. Probá de nuevo." };
  }
}

export async function updateProspectoAction(
  id: string,
  input: unknown
): Promise<ActionResult<Prospecto>> {
  await requireAdminJuk();

  const parsed = prospectoUpdateSchema.safeParse({
    ...(input && typeof input === "object" ? input : {}),
    id,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos del formulario.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { id: prospectoId, ...data } = parsed.data;
  try {
    const prospecto = await updateProspecto(prospectoId, data);
    revalidatePath("/prospectos");
    revalidatePath(`/prospectos/${prospectoId}`);
    return { ok: true, data: prospecto };
  } catch (err) {
    if (err instanceof ProspectoNotFoundError) {
      return { ok: false, error: "El prospecto no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar los cambios." };
  }
}

export async function moverProspectoAction(
  input: unknown
): Promise<ActionResult<Prospecto>> {
  const session = await requireAdminJuk();

  const parsed = moverEstadoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Movimiento inválido." };
  }

  const { id, estado, posicion } = parsed.data;
  try {
    const anterior = await getProspectoById(id);
    if (!anterior) return { ok: false, error: "El prospecto no existe." };

    const prospecto = await moverProspecto(id, estado, posicion);

    if (anterior.estado !== estado) {
      await registrarComunicacion({
        prospectoId: id,
        tipo: "cambio_estado",
        meta: { estadoAnterior: anterior.estado, estadoNuevo: estado },
        creadoPor: session.user.id,
      });
    }

    revalidatePath("/prospectos");
    revalidatePath(`/prospectos/${id}`);
    return { ok: true, data: prospecto };
  } catch (err) {
    if (err instanceof ProspectoNotFoundError) {
      return { ok: false, error: "El prospecto no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos mover el prospecto." };
  }
}

export async function reordenarProspectosAction(
  input: unknown
): Promise<ActionResult<null>> {
  await requireAdminJuk();

  const parsed = reordenarSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Orden inválido." };
  }

  try {
    await reordenarColumna(parsed.data.estado, parsed.data.ids);
    revalidatePath("/prospectos");
    return { ok: true, data: null };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos reordenar la columna." };
  }
}

const importarSchema = z.object({
  texto: z.string().min(1, "Pegá el contenido del CSV"),
});

export async function importarProspectosAction(
  input: unknown
): Promise<ActionResult<{ creadas: number; errores: string[] }>> {
  const session = await requireAdminJuk();

  const parsed = importarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Pegá el contenido del CSV.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { filas, errores } = parseProspectosCsv(parsed.data.texto);
  if (filas.length === 0) {
    return {
      ok: false,
      error: errores[0] ?? "No se encontró ninguna fila válida para importar.",
    };
  }

  try {
    const creadas = await crearProspectosMasivo(filas, session.user.id);
    revalidatePath("/prospectos");
    return { ok: true, data: { creadas, errores } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos importar los prospectos." };
  }
}

export async function enviarOutreachAction(
  input: unknown
): Promise<ActionResult<ProspectoComunicacion>> {
  const session = await requireAdminJuk();

  const parsed = enviarOutreachSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá el asunto y el mensaje.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { prospectoId, asunto, mensaje } = parsed.data;

  const prospecto = await getProspectoById(prospectoId);
  if (!prospecto) return { ok: false, error: "El prospecto no existe." };
  if (!prospecto.suscritoOutreach) {
    return { ok: false, error: "El prospecto se dio de baja de los correos." };
  }

  const destinatario = prospecto.emails[0];
  if (!destinatario) {
    return { ok: false, error: "El prospecto no tiene un email cargado." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const unsubscribeUrl = `${appUrl}/baja?token=${prospecto.unsubscribeToken}`;
  const ctaUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://jovenesenuk.com";

  const cuerpo = mensaje
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  try {
    const { id } = await sendOutreachEmail({
      to: destinatario,
      nombreColegio: prospecto.nombre,
      nombreContacto: prospecto.contactoNombre ?? undefined,
      asunto,
      cuerpo,
      ctaUrl,
      unsubscribeUrl,
    });

    const comunicacion = await registrarComunicacion({
      prospectoId,
      tipo: "email",
      estado: "enviado",
      destinatario,
      resendMessageId: id,
      asunto,
      cuerpo: mensaje,
      creadoPor: session.user.id,
    });

    await safeAudit({
      accion: "update",
      entidadTipo: "prospecto",
      entidadId: prospectoId,
      usuarioId: session.user.id,
    });

    revalidatePath("/prospectos");
    revalidatePath(`/prospectos/${prospectoId}`);
    return { ok: true, data: comunicacion };
  } catch (err) {
    Sentry.captureException(err);
    await registrarComunicacion({
      prospectoId,
      tipo: "email",
      estado: "fallido",
      destinatario,
      asunto,
      cuerpo: mensaje,
      creadoPor: session.user.id,
    });
    return { ok: false, error: "No pudimos enviar el correo. Probá de nuevo." };
  }
}

export async function agregarNotaAction(
  input: unknown
): Promise<ActionResult<ProspectoComunicacion>> {
  const session = await requireAdminJuk();

  const parsed = notaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Escribí la nota.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { prospectoId, texto } = parsed.data;
  try {
    const comunicacion = await registrarComunicacion({
      prospectoId,
      tipo: "nota",
      cuerpo: texto,
      creadoPor: session.user.id,
    });
    revalidatePath(`/prospectos/${prospectoId}`);
    return { ok: true, data: comunicacion };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos guardar la nota." };
  }
}

export async function convertirAColegioAction(
  id: string
): Promise<ActionResult<{ colegioId: string }>> {
  const session = await requireAdminJuk();

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: "Prospecto inválido." };
  }

  try {
    const { colegio } = await convertirAColegio(parsedId.data, session.user.id);
    await safeAudit({
      accion: "create",
      entidadTipo: "colegio",
      entidadId: colegio.id,
      usuarioId: session.user.id,
    });
    revalidatePath("/prospectos");
    revalidatePath("/colegios");
    return { ok: true, data: { colegioId: colegio.id } };
  } catch (err) {
    if (err instanceof ProspectoNotFoundError) {
      return { ok: false, error: "El prospecto no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos convertir el prospecto en colegio." };
  }
}

const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;

export async function subirImagenAction(
  formData: FormData
): Promise<ActionResult<{ imagenUrl: string }>> {
  await requireAdminJuk();

  const prospectoId = formData.get("prospectoId");
  const file = formData.get("file");

  if (typeof prospectoId !== "string" || !z.string().uuid().safeParse(prospectoId).success) {
    return { ok: false, error: "Prospecto inválido." };
  }
  if (!(file instanceof File)) {
    return { ok: false, error: "No se recibió ninguna imagen." };
  }
  // La allowlist coincide con la que valida el storage por magic bytes: si acá
  // pasara un GIF o un SVG, moriría más abajo con un error mucho menos claro.
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, error: "La imagen tiene que ser JPG, PNG o WEBP." };
  }
  if (file.size > MAX_IMAGEN_BYTES) {
    return { ok: false, error: "La imagen no puede superar los 5 MB." };
  }

  const nombreSanitizado = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `prospectos/${prospectoId}/${Date.now()}-${nombreSanitizado}`;

  try {
    const { key: imagenKey, url: imagenUrl } = await putDocumento(
      key,
      Buffer.from(await file.arrayBuffer()),
      file.type
    );
    await updateProspecto(prospectoId, { imagenUrl, imagenKey });
    revalidatePath("/prospectos");
    revalidatePath(`/prospectos/${prospectoId}`);
    return { ok: true, data: { imagenUrl } };
  } catch (err) {
    if (err instanceof ProspectoNotFoundError) {
      return { ok: false, error: "El prospecto no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos subir la imagen. Probá de nuevo." };
  }
}

export async function darDeBajaProspectoAction(
  id: string
): Promise<ActionResult<Prospecto>> {
  await requireAdminJuk();

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, error: "Prospecto inválido." };
  }

  try {
    const prospecto = await darDeBajaOutreach(parsedId.data);
    revalidatePath("/prospectos");
    revalidatePath(`/prospectos/${parsedId.data}`);
    return { ok: true, data: prospecto };
  } catch (err) {
    if (err instanceof ProspectoNotFoundError) {
      return { ok: false, error: "El prospecto no existe." };
    }
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos dar de baja el prospecto." };
  }
}
