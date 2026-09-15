"use server";

/*
 * Server actions de los formularios públicos (newsletter + lead/consulta).
 * Persisten en Drizzle y, en el caso del lead, avisan al equipo por email.
 *
 * Las actions se pueden invocar por POST directo (header Next-Action), así que
 * el anti-abuso vive acá y no en el form: honeypot + rate limit por IP y por
 * email (`@/lib/domain/anti-abuso`) + dedup del aviso al equipo.
 */

import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";

import type { ActionResult } from "@/lib/actions/result";
import {
  crearConsulta,
  fechaConsultaPreviaSimilar,
  suscribir,
} from "@/lib/db/queries/leads";
import { incrementarYVerificar } from "@/lib/db/queries/rate-limit-formularios";
import {
  LIMITE_POR_EMAIL,
  LIMITE_POR_IP,
  VENTANA_DEDUP_AVISO_MS,
  claveEmail,
  claveIp,
  debeAvisarConsulta,
  normalizarIp,
  type FormularioPublico,
} from "@/lib/domain/anti-abuso";
import { leadSchema, newsletterSchema } from "@/lib/domain/leads";
import type { Consulta } from "@/lib/db/schema/leads";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

/** Lo que ve el visitante del sitio público: un mensaje de confirmación. */
type FormOk = { mensaje: string };

const ERROR_GENERICO =
  "No pudimos procesar tu consulta, probá de nuevo o escribinos por WhatsApp.";

// Mismo mensaje para el límite alcanzado que para cualquier otro problema
// transitorio: no le confirmamos a un bot que lo estamos frenando.
const ERROR_REINTENTAR =
  "No pudimos procesar tu consulta en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.";

const ERROR_REINTENTAR_NEWSLETTER =
  "No pudimos procesar tu suscripción en este momento. Probá de nuevo en unos minutos.";

async function ipDelRequest(): Promise<string> {
  const h = await headers();
  return normalizarIp(h.get("x-forwarded-for") ?? h.get("x-real-ip"));
}

/**
 * Registra el intento en las dos ventanas (IP y email) y dice si sigue.
 * Falla abierto a propósito: un problema con la tabla de rate limit no puede
 * costarnos un lead legítimo (el honeypot y la validación siguen en pie).
 */
async function dentroDelLimite(
  formulario: FormularioPublico,
  email: string
): Promise<boolean> {
  try {
    const ahora = new Date();
    const porIp = await incrementarYVerificar(
      claveIp(formulario, await ipDelRequest()),
      LIMITE_POR_IP,
      ahora
    );
    const porEmail = await incrementarYVerificar(
      claveEmail(formulario, email),
      LIMITE_POR_EMAIL,
      ahora
    );
    return porIp.permitido && porEmail.permitido;
  } catch (err) {
    Sentry.captureException(err);
    return true;
  }
}

/**
 * Dispara el aviso por email al equipo sin bloquear la respuesta. Intenta el
 * job de Trigger.dev (no bloqueante); si Trigger no está configurado, cae al
 * envío inline. Todo es best-effort: el lead ya quedó persistido, así que un
 * fallo de email no debe romper la respuesta al usuario.
 *
 * Antes de avisar, dedup por (email, modalidad) en 24 h: la consulta repetida se
 * persiste igual pero no vuelve a gastar cuota ni a saturar LEADS_NOTIFY_TO.
 */
async function dispararAvisoConsulta(consulta: Consulta): Promise<void> {
  try {
    const ahora = new Date();
    const previa = await fechaConsultaPreviaSimilar({
      email: consulta.email,
      modalidad: consulta.modalidad,
      desde: new Date(ahora.getTime() - VENTANA_DEDUP_AVISO_MS),
      excluirId: consulta.id,
    });
    if (!debeAvisarConsulta(previa, ahora)) return;
  } catch (err) {
    Sentry.captureException(err);
  }

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

export async function subscribeNewsletter(
  _prev: ActionResult<FormOk> | null,
  formData: FormData,
): Promise<ActionResult<FormOk>> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    website: formData.get("website") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá el email ingresado.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  // Honeypot: si viene relleno, es un bot. Respondemos ok sin hacer nada.
  if (parsed.data.website) {
    return { ok: true, data: { mensaje: "¡Listo! Ya estás suscripto." } };
  }

  if (!(await dentroDelLimite("newsletter", parsed.data.email))) {
    return { ok: false, error: ERROR_REINTENTAR_NEWSLETTER };
  }

  try {
    await suscribir(parsed.data.email, "hero");
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false, error: ERROR_GENERICO };
  }

  return {
    ok: true,
    data: { mensaje: "¡Listo! Te suscribiste. Pronto vas a recibir nuestras novedades." },
  };
}

export async function submitLead(
  _prev: ActionResult<FormOk> | null,
  formData: FormData,
): Promise<ActionResult<FormOk>> {
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
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  // Honeypot anti-spam.
  if (parsed.data.website) {
    return { ok: true, data: { mensaje: "¡Gracias! Te vamos a contactar a la brevedad." } };
  }

  if (!(await dentroDelLimite("lead", parsed.data.email))) {
    return { ok: false, error: ERROR_REINTENTAR };
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
    data: { mensaje: "¡Gracias! Recibimos tu consulta y te vamos a contactar muy pronto." },
  };
}
