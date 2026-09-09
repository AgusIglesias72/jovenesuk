import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { safeAudit } from "@/lib/actions/safe-audit";
import { createAlumno, getAlumnoByDni } from "@/lib/db/queries/alumnos";
import { asignarConTablero } from "@/lib/db/queries/asignar-alumno";
import { countAsignacionesActivas } from "@/lib/db/queries/asignaciones";
import { esViolacionUnique } from "@/lib/db/queries/errors";
import { asegurarCuentaFamilia } from "@/lib/db/queries/familias";
import { getViajeByCodigo } from "@/lib/db/queries/viajes";
import type { Alumno } from "@/lib/db/schema/alumnos";
import { ViajeNoInscribibleError } from "@/lib/domain/asignaciones";
import { LARGO_MINIMO_SECRETO, coincideSecreto, secretoUsable } from "@/lib/domain/webhooks/secreto";

/**
 * Webhook del Application Form JUK (Google Form) — US-15.
 *
 * Crea el alumno en estado Pre-inscripto con canal webhook (alimenta el Paso 0)
 * y, si el form trae `codigoViaje` (cada salida de colegio cliente tiene su
 * propio link), lo asigna automáticamente al viaje generando el tablero M6.
 *
 * Auth: header `x-webhook-secret` debe coincidir con GOOGLE_FORM_WEBHOOK_SECRET
 * (comparación de tiempo constante; el secreto necesita 32+ caracteres).
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

// El aviso de secreto mal configurado se loguea una vez por instancia: sin
// esto, un form con reintentos llena los logs con la misma línea.
let secretoInvalidoLogueado = false;

export async function POST(request: NextRequest) {
  const secret = process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  if (!secretoUsable(secret)) {
    if (!secretoInvalidoLogueado) {
      secretoInvalidoLogueado = true;
      console.error(
        `[webhook/google-form] GOOGLE_FORM_WEBHOOK_SECRET ausente o de menos de ${LARGO_MINIMO_SECRETO} caracteres; se rechazan todos los envíos.`
      );
    }
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!coincideSecreto(request.headers.get("x-webhook-secret"), secret)) {
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
    const existente = await getAlumnoByDni(data.dni);
    if (existente) {
      return NextResponse.json({ ok: true, duplicado: true, alumnoId: existente.id });
    }

    const { codigoViaje, ...datosAlumno } = data;
    let alumno: Alumno;
    try {
      alumno = await createAlumno({ ...datosAlumno, canalAlta: "webhook", estado: "pre_inscripto" });
    } catch (err) {
      // Dos submits simultáneos con el mismo DNI: el segundo pierde la carrera
      // contra el unique y se responde como duplicado.
      if (esViolacionUnique(err)) {
        const ganador = await getAlumnoByDni(data.dni);
        if (ganador) {
          return NextResponse.json({ ok: true, duplicado: true, alumnoId: ganador.id });
        }
        // El DNI está tomado pero no lo podemos leer de vuelta (lectura sobre
        // otra rama de la réplica): 409 con el motivo real, nunca un 500 mudo.
        return NextResponse.json({ error: "Ya existe un alumno con ese DNI." }, { status: 409 });
      }
      throw err;
    }

    // US-19b: credenciales del Portal de Familias se generan al CREAR el alumno.
    await asegurarCuentaFamilia(alumno.id, data.tutor1Email, data.tutor1Nombre);

    await safeAudit({
      accion: "create",
      entidadTipo: "alumno",
      entidadId: alumno.id,
      usuarioId: null,
      metadata: { origen: "webhook_google_form" },
    });

    // Auto-asignación si el link del form trae el código del viaje.
    let asignacion: { viajeId: string; asignacionId: string } | null = null;
    if (codigoViaje) {
      const viaje = await getViajeByCodigo(codigoViaje);
      const inscribible =
        viaje && (viaje.estado === "inscripcion_abierta" || viaje.estado === "confirmado");
      if (inscribible) {
        const activas = await countAsignacionesActivas(viaje.id);
        if (activas < viaje.capacidadMaxima) {
          try {
            const r = await asignarConTablero({ viaje, alumno, usuarioId: null });
            asignacion = { viajeId: viaje.id, asignacionId: r.asignacionId };
            await safeAudit({
              accion: "asignar_a_viaje",
              entidadTipo: "asignacion",
              entidadId: r.asignacionId,
              usuarioId: null,
              metadata: { origen: "webhook_google_form", codigoViaje },
            });
          } catch (err) {
            // El viaje cambió de estado entre el chequeo y el insert: el alumno
            // ya quedó pre-inscripto y el equipo lo asigna a mano.
            if (!(err instanceof ViajeNoInscribibleError)) throw err;
          }
        }
        // Sin cupo: el alumno queda pre-inscripto y el equipo decide (la
        // sobre-capacidad requiere confirmación humana, US-11).
      }
    }

    return NextResponse.json({ ok: true, alumnoId: alumno.id, asignacion });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
