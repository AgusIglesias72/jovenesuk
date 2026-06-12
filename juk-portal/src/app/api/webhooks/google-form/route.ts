import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import { asignarConTablero } from "@/lib/db/queries/asignar-alumno";
import { countAsignacionesActivas } from "@/lib/db/queries/asignaciones";
import { asegurarCuentaFamilia } from "@/lib/db/queries/familias";
import { alumnos } from "@/lib/db/schema/alumnos";
import { viajes } from "@/lib/db/schema/viajes";

/**
 * Webhook del Application Form JUK (Google Form) — US-15.
 *
 * Crea el alumno en estado Pre-inscripto con canal webhook (alimenta el Paso 0)
 * y, si el form trae `codigoViaje` (cada salida de colegio cliente tiene su
 * propio link), lo asigna automáticamente al viaje generando el tablero M6.
 *
 * Auth: header `x-webhook-secret` debe coincidir con GOOGLE_FORM_WEBHOOK_SECRET.
 * Idempotencia: si ya existe un alumno con el mismo DNI, responde 200 con
 * `duplicado: true` y no crea nada.
 */

const fecha = z.preprocess(
  (v) => (v == null || v === "" ? undefined : new Date(v as string)),
  z.date()
);

const payloadSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  apellido: z.string().trim().min(1).max(120),
  fechaNacimiento: fecha,
  dni: z.string().trim().min(1).max(20),
  numeroPasaporte: z.string().trim().min(1).max(30),
  fechaVencimientoPasaporte: fecha,
  tutor1Nombre: z.string().trim().min(1).max(120),
  tutor1Celular: z.string().trim().min(1).max(50),
  tutor1Email: z.string().trim().email(),
  telefonoAlumno: z.string().trim().max(50).optional(),
  emailAlumno: z.string().trim().email().optional(),
  alergiasSalud: z.string().trim().max(2000).optional(),
  preferenciasAlojamiento: z.string().trim().max(500).optional(),
  nivelInglesAutoevaluacion: z.string().trim().max(100).optional(),
  /** Código del viaje del link (ej: UK-2026-SEP-WIMBLEDON). Opcional. */
  codigoViaje: z.string().trim().max(60).optional(),
});

export async function POST(request: NextRequest) {
  const secret = process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", detalles: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const data = parsed.data;

  try {
    // Idempotencia por DNI (reintentos del form / doble submit).
    const existente = await db
      .select({ id: alumnos.id })
      .from(alumnos)
      .where(eq(alumnos.dni, data.dni))
      .limit(1);
    if (existente.length > 0) {
      return NextResponse.json({ ok: true, duplicado: true, alumnoId: existente[0]!.id });
    }

    const { codigoViaje, ...datosAlumno } = data;
    const [alumno] = await db
      .insert(alumnos)
      .values({ ...datosAlumno, canalAlta: "webhook", estado: "pre_inscripto" })
      .returning();

    // US-19b: credenciales del Portal de Familias se generan al CREAR el alumno.
    await asegurarCuentaFamilia(alumno!.id, data.tutor1Email, data.tutor1Nombre);

    await registrarAuditoria({
      accion: "create",
      entidadTipo: "alumno",
      entidadId: alumno!.id,
      usuarioId: null,
      metadata: { origen: "webhook_google_form" },
    });

    // Auto-asignación si el link del form trae el código del viaje.
    let asignacion: { viajeId: string; asignacionId: string } | null = null;
    if (codigoViaje) {
      const viajeRows = await db
        .select()
        .from(viajes)
        .where(eq(viajes.codigo, codigoViaje))
        .limit(1);
      const viaje = viajeRows[0];
      const inscribible =
        viaje && (viaje.estado === "inscripcion_abierta" || viaje.estado === "confirmado");
      if (inscribible) {
        const activas = await countAsignacionesActivas(viaje.id);
        if (activas < viaje.capacidadMaxima) {
          const r = await asignarConTablero({ viaje, alumno: alumno!, usuarioId: null });
          asignacion = { viajeId: viaje.id, asignacionId: r.asignacionId };
          await registrarAuditoria({
            accion: "asignar_a_viaje",
            entidadTipo: "asignacion",
            entidadId: r.asignacionId,
            usuarioId: null,
            metadata: { origen: "webhook_google_form", codigoViaje },
          });
        }
        // Sin cupo: el alumno queda pre-inscripto y el equipo decide (la
        // sobre-capacidad requiere confirmación humana, US-11).
      }
    }

    return NextResponse.json({ ok: true, alumnoId: alumno!.id, asignacion });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
