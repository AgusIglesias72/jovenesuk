import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import {
  actualizarEstadoComunicacion,
  type ComunicacionEstado,
} from "@/lib/db/queries/prospecto-tracking";
import { verificarFirma } from "@/lib/domain/webhooks/svix";

/**
 * Webhook de tracking de Resend para los emails de outreach del CRM de prospectos.
 *
 * Resend firma con Svix (headers svix-id / svix-timestamp / svix-signature).
 * Verificamos la firma a mano con HMAC-SHA256 sobre el body CRUDO para no
 * sumar la dependencia `svix`. El secret (RESEND_WEBHOOK_SECRET) tiene formato
 * "whsec_<base64>"; la clave HMAC es el base64 decodificado.
 */

const eventoSchema = z.object({
  type: z.string(),
  data: z.object({
    email_id: z.string(),
    to: z.union([z.string(), z.array(z.string())]).optional(),
  }),
});

const EVENTO_A_ESTADO: Record<string, ComunicacionEstado> = {
  "email.delivered": "entregado",
  "email.opened": "abierto",
  "email.clicked": "click",
  "email.bounced": "rebotado",
  "email.complained": "spam",
};

let secretFaltanteLogueado = false;

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    if (!secretFaltanteLogueado) {
      console.error(
        "[webhook/resend] RESEND_WEBHOOK_SECRET no configurado; se ignoran los eventos de tracking."
      );
      secretFaltanteLogueado = true;
    }
    return NextResponse.json({ ok: true, ignorado: true });
  }

  // La firma es sobre el cuerpo crudo: hay que leerlo como texto antes de parsear.
  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Firma ausente" }, { status: 400 });
  }
  if (!verificarFirma(secret, svixId, svixTimestamp, rawBody, svixSignature)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    const parsed = eventoSchema.safeParse(JSON.parse(rawBody));
    // Firma válida pero evento desconocido/no mapeado: 200 para que Resend no reintente.
    if (parsed.success) {
      const estado = EVENTO_A_ESTADO[parsed.data.type];
      if (estado) {
        await actualizarEstadoComunicacion(parsed.data.data.email_id, estado);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
