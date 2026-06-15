"use server";

/*
 * Server actions de los formularios públicos (newsletter + lead/consulta).
 * Persisten en Drizzle y, en el caso del lead, avisan al equipo por email.
 */

import * as Sentry from "@sentry/nextjs";

import { crearConsulta, suscribir } from "@/lib/db/queries/leads";
import { leadSchema, newsletterSchema, type FormResult } from "@/lib/domain/leads";
import type { Consulta } from "@/lib/db/schema/leads";

const ERROR_GENERICO =
  "No pudimos procesar tu consulta, probá de nuevo o escribinos por WhatsApp.";

/**
 * Dispara el aviso por email al equipo sin bloquear la respuesta. Intenta el
 * job de Trigger.dev (no bloqueante); si Trigger no está configurado, cae al
 * envío inline. Todo es best-effort: el lead ya quedó persistido, así que un
 * fallo de email no debe romper la respuesta al usuario.
 */
async function dispararAvisoConsulta(consulta: Consulta): Promise<void> {
  try {
    const { tasks } = await import("@trigger.dev/sdk/v3");
    const { notificarConsultaNueva } = await import("@/trigger/leads");
    await tasks.trigger<typeof notificarConsultaNueva>("notificar-consulta-nueva", {
      consultaId: consulta.id,
    });
    return;
  } catch (err) {
    Sentry.captureException(err);
  }

  try {
    const { sendConsultaNuevaEmail } = await import("@/lib/email/send-consulta-nueva");
    await sendConsultaNuevaEmail(consulta);
  } catch (err) {
    Sentry.captureException(err);
  }
}

function fieldErrorsFrom(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key] = issue.message;
  }
  return out;
}

export async function subscribeNewsletter(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    website: formData.get("website") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá el email ingresado.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  // Honeypot: si viene relleno, es un bot. Respondemos ok sin hacer nada.
  if (parsed.data.website) {
    return { ok: true, message: "¡Listo! Ya estás suscripto." };
  }

  try {
    await suscribir(parsed.data.email, "hero");
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: ERROR_GENERICO };
  }

  return {
    ok: true,
    message: "¡Listo! Te suscribiste. Pronto vas a recibir nuestras novedades.",
  };
}

export async function submitLead(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  const raw = {
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    paraQuien: formData.get("paraQuien"),
    institucion: (formData.get("institucion") as string) || undefined,
    modalidad: formData.get("modalidad"),
    destino: (formData.get("destino") as string) || undefined,
    cuando: formData.get("cuando"),
    mensaje: (formData.get("mensaje") as string) || undefined,
    acepta: formData.get("acepta") === "on" || formData.get("acepta") === "true",
    website: formData.get("website") ?? undefined,
  };

  const parsed = leadSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los campos marcados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  // Honeypot anti-spam.
  if (parsed.data.website) {
    return { ok: true, message: "¡Gracias! Te vamos a contactar a la brevedad." };
  }

  const { website: _website, acepta: _acepta, ...datos } = parsed.data;

  let consulta: Consulta;
  try {
    consulta = await crearConsulta({
      ...datos,
      institucion: datos.institucion ?? null,
      destino: datos.destino ?? null,
      mensaje: datos.mensaje ?? null,
    });
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: ERROR_GENERICO };
  }

  await dispararAvisoConsulta(consulta);

  return {
    ok: true,
    message: "¡Gracias! Recibimos tu consulta y te vamos a contactar muy pronto.",
  };
}
