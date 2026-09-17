"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import type { ActionResult } from "@/lib/actions/result";
import { safeAudit } from "@/lib/actions/safe-audit";
import { requireAdminJuk } from "@/lib/auth/helpers";
import {
  crearLoteInvitaciones,
  destinatariosDesdeProspectos,
  resumenLote,
  revocarInvitacion,
  type MotivoExclusion,
} from "@/lib/db/queries/invitaciones";
import {
  convertirAColegio,
  crearProspectosMasivo,
  createProspecto,
  darDeBajaOutreach,
  getProspectoById,
  moverProspecto,
  registrarComunicacion,
  updateProspecto,
} from "@/lib/db/queries/prospectos";
import {
  MAX_DESTINATARIOS_LOTE,
  excedeMaximoDestinatarios,
  fechaDeVencimiento,
} from "@/lib/domain/inscripciones/invitacion";
import { varianteEnum } from "@/lib/domain/inscripciones/schema";
import {
  ProspectoNotFoundError,
  enviarOutreachSchema,
  moverEstadoSchema,
  notaSchema,
  parseProspectosCsv,
  prospectoCreateSchema,
  prospectoEstadoEnum,
  prospectoUpdateSchema,
} from "@/lib/domain/prospectos";
import { sendOutreachEmail } from "@/lib/email/send-outreach";
import { enviarTandaDelLote } from "@/lib/jobs/enviar-lote-invitaciones";
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

// ---------------------------------------------------------------------------
// Invitaciones al Application Form
// ---------------------------------------------------------------------------

/**
 * El envío masivo, desde el lado del CRM. La mecánica (claim en dos fases,
 * tokens, sellado) vive en `db/queries/invitaciones.ts` y en el job
 * `enviar-lote-invitaciones.ts`; acá queda lo que es propio de una action:
 * autorización, validación, y que NINGÚN dato que decide a quién le llega el
 * mail venga del cliente.
 *
 * Eso último es la regla que ordena las cuatro: el navegador manda ids de
 * prospecto (y, como mucho, un filtro), y el servidor vuelve a derivar de la
 * base a quién se le manda y a qué casilla, con `destinatariosDesdeProspectos`.
 * Si el email viajara en el body, cualquiera con una sesión podría mandar un
 * link de inscripción a donde quisiera, o saltearse la baja.
 *
 * Trigger.dev no está desplegado: el lote avanza porque la pantalla llama a
 * `continuarLoteAction` tanda tras tanda. Por eso crear y enviar son acciones
 * distintas — crear siempre devuelve el `loteId`, aunque después el envío se
 * corte, y con ese id se retoma desde cualquier pestaña sin repetir un mail.
 *
 * Ninguna de las dos acepta un asunto propio: el mail arma el suyo con el
 * nombre del viaje. El lote guarda el asunto en la fila, pero `reservarTanda`
 * no lo devuelve, así que una campaña retomada mañana (desde otra pestaña, sin
 * el texto a mano) mandaría con el asunto por defecto y la mitad del lote
 * llegaría distinta de la otra mitad. Retomar tiene que ser idéntico a empezar.
 */

/** A quiénes. `ids` es la selección explícita del tablero y gana sobre el filtro. */
const destinatariosSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  q: z.string().trim().optional(),
  estado: prospectoEstadoEnum.optional(),
  responsableId: z.string().uuid().optional(),
});

const crearLoteSchema = destinatariosSchema.extend({
  viajeId: z.string().uuid().optional(),
  variante: varianteEnum.optional(),
});

const invitacionIndividualSchema = z.object({
  prospectoId: z.string().uuid(),
  viajeId: z.string().uuid().optional(),
  variante: varianteEnum.optional(),
});

const continuarLoteSchema = z.object({ loteId: z.string().uuid() });

/**
 * Por qué no se le manda. El dado de baja NO tiene forma de forzarse: no hay
 * flag, ni confirmación, ni parámetro. Es la única exclusión que no se arregla
 * editando el prospecto, y tiene que seguir siendo imposible de saltear desde
 * la pantalla.
 */
const MOTIVO_EXCLUSION_ERROR: Record<MotivoExclusion, string> = {
  dado_de_baja: "El prospecto se dio de baja de los correos.",
  sin_email: "El prospecto no tiene ningún email cargado.",
  email_repetido: "Ese email ya está en la lista de esta campaña.",
};

export type LoteArmado = {
  loteId: string;
  /** Cuántos mails va a mandar la campaña: lo que la pantalla tiene que mostrar. */
  total: number;
  /** Cuántos del universo pedido quedaron afuera (y por qué lo dice la pantalla). */
  excluidos: number;
};

export type AvanceLote = { enviados: number; fallidos: number; restantes: number };

/**
 * Deja la campaña escrita en `pendiente` y devuelve su id. NO manda un solo
 * mail: eso es `continuarLoteAction`, que la pantalla llama en bucle.
 *
 * Separarlo tiene una razón concreta: una tanda de 10 tarda varios segundos
 * (la pausa del rate limit de Resend). Si crear y mandar fueran la misma
 * llamada y esa llamada se cortara, el lote existiría en la base pero el
 * navegador no tendría el `loteId` para retomarlo, y quien lo quisiera seguir
 * tendría que adivinar cuál es. Así, crear es corto y siempre devuelve el id.
 */
export async function crearLoteInvitacionesAction(
  input: unknown
): Promise<ActionResult<LoteArmado>> {
  const session = await requireAdminJuk();

  const parsed = crearLoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá el viaje y a quiénes les querés escribir.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { viajeId, variante, ...filtros } = parsed.data;

  try {
    const { incluidos, excluidos } = await destinatariosDesdeProspectos(filtros);

    if (incluidos.length === 0) {
      return {
        ok: false,
        error:
          excluidos.length > 0
            ? "Ninguno de los prospectos elegidos puede recibir el mail (baja, sin email o email repetido)."
            : "No elegiste a nadie a quien mandarle la invitación.",
      };
    }

    if (excedeMaximoDestinatarios(incluidos.length)) {
      return {
        ok: false,
        error: `Son ${incluidos.length} destinatarios y el máximo por campaña es ${MAX_DESTINATARIOS_LOTE}. Afiná el filtro o partilo en varias campañas.`,
      };
    }

    const { loteId } = await crearLoteInvitaciones({
      destinatarios: incluidos.map((d) => ({
        prospectoId: d.prospectoId,
        destinatario: d.email,
      })),
      viajeId: viajeId ?? null,
      variante: variante ?? null,
      expiraEl: fechaDeVencimiento(new Date()),
      creadoPor: session.user.id,
    });

    await safeAudit({
      accion: "create",
      entidadTipo: "invitacion_lote",
      entidadId: loteId,
      usuarioId: session.user.id,
      metadata: { destinatarios: incluidos.length, excluidos: excluidos.length, viajeId },
    });

    revalidatePath("/prospectos/invitaciones");
    return {
      ok: true,
      data: { loteId, total: incluidos.length, excluidos: excluidos.length },
    };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos armar la campaña. Probá de nuevo." };
  }
}

/**
 * Una tanda del lote. La pantalla la llama de nuevo mientras `restantes` sea
 * mayor que cero, y puede volver a llamarla mañana desde otra pestaña: lo ya
 * enviado nunca se reenvía (lo garantiza el claim en dos fases del job).
 */
export async function continuarLoteAction(
  input: unknown
): Promise<ActionResult<AvanceLote>> {
  const session = await requireAdminJuk();

  const parsed = continuarLoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Campaña inválida." };

  const { loteId } = parsed.data;

  try {
    // El lote se busca en la base antes de empujarlo: sin esto, un uuid al azar
    // sería un "0 de 0 enviados" indistinguible de una campaña terminada.
    const resumen = await resumenLote(loteId);
    if (!resumen) return { ok: false, error: "Esa campaña no existe." };

    const { enviados, fallidos, restantes } = await enviarTandaDelLote(loteId);

    // Se audita la tanda que movió algo, no cada consulta: un lote de 200 deja
    // 20 entradas con quién lo empujó, y un reintento sin trabajo no ensucia.
    if (enviados + fallidos > 0) {
      await safeAudit({
        accion: "update",
        entidadTipo: "invitacion_lote",
        entidadId: loteId,
        usuarioId: session.user.id,
        metadata: { enviados, fallidos, restantes },
      });
    }

    revalidatePath("/prospectos/invitaciones");
    return { ok: true, data: { enviados, fallidos, restantes } };
  } catch (err) {
    Sentry.captureException(err);
    return {
      ok: false,
      error:
        "Se cortó el envío. La campaña quedó como estaba: retomala cuando quieras y no se reenvía nada de lo que ya salió.",
    };
  }
}

/**
 * El botón de pánico: corta el link. Sirve tanto si el mail ya salió (el link
 * deja de abrir el formulario) como si todavía no (la fila queda fuera de toda
 * tanda futura).
 */
export async function revocarInvitacionAction(
  comunicacionId: string
): Promise<ActionResult<{ comunicacionId: string }>> {
  const session = await requireAdminJuk();

  const parsedId = z.string().uuid().safeParse(comunicacionId);
  if (!parsedId.success) return { ok: false, error: "Invitación inválida." };

  try {
    const revocada = await revocarInvitacion(parsedId.data);
    if (!revocada) return { ok: false, error: "Esa invitación no existe." };

    await safeAudit({
      accion: "update",
      entidadTipo: "invitacion",
      entidadId: parsedId.data,
      usuarioId: session.user.id,
      metadata: { revocada: true },
    });

    revalidatePath("/prospectos/invitaciones");
    revalidatePath("/prospectos/[id]", "page");
    return { ok: true, data: { comunicacionId: parsedId.data } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos revocar la invitación." };
  }
}

/**
 * La invitación de a una, desde la ficha del prospecto. Es el mismo camino que
 * la campaña —un lote de uno— y no un envío aparte: así hereda el token
 * hasheado, el vencimiento, la bitácora y el tracking del webhook de Resend sin
 * una segunda implementación que se desincronice.
 *
 * Acá sí se manda en la misma llamada: es un solo mail, no hay nada que retomar.
 */
export async function enviarInvitacionIndividualAction(
  input: unknown
): Promise<ActionResult<{ loteId: string; destinatario: string }>> {
  const session = await requireAdminJuk();

  const parsed = invitacionIndividualSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá el viaje de la invitación.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { prospectoId, viajeId, variante } = parsed.data;

  try {
    // Mismas reglas que la campaña (baja, sin email), derivadas de la base.
    const { incluidos, excluidos } = await destinatariosDesdeProspectos({
      ids: [prospectoId],
    });

    const destinatario = incluidos[0];
    if (!destinatario) {
      const motivo = excluidos[0]?.motivo;
      return {
        ok: false,
        error: motivo ? MOTIVO_EXCLUSION_ERROR[motivo] : "El prospecto no existe.",
      };
    }

    const { loteId } = await crearLoteInvitaciones({
      destinatarios: [
        { prospectoId: destinatario.prospectoId, destinatario: destinatario.email },
      ],
      viajeId: viajeId ?? null,
      variante: variante ?? null,
      expiraEl: fechaDeVencimiento(new Date()),
      creadoPor: session.user.id,
    });

    const { enviados } = await enviarTandaDelLote(loteId, { tamanio: 1 });

    await safeAudit({
      accion: "create",
      entidadTipo: "invitacion_lote",
      entidadId: loteId,
      usuarioId: session.user.id,
      metadata: { prospectoId, viajeId, individual: true },
    });

    revalidatePath("/prospectos/invitaciones");
    revalidatePath("/prospectos/[id]", "page");

    // La fila queda en `fallido` con su motivo: el intento no se pierde, pero
    // el equipo tiene que enterarse acá y no revisando la campaña.
    if (enviados === 0) {
      return {
        ok: false,
        error: "No pudimos enviar la invitación. Quedó registrada en el historial con el motivo.",
      };
    }

    return { ok: true, data: { loteId, destinatario: destinatario.email } };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: "No pudimos enviar la invitación. Probá de nuevo." };
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
