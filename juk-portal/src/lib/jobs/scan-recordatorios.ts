import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { notificacionesEnviadas } from "@/lib/db/schema/notificaciones";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { viajes } from "@/lib/db/schema/viajes";
import {
  a1Vencido,
  recordatorioA1DeHoy,
  recordatorioD1DeHoy,
  type RecordatorioPendiente,
} from "@/lib/domain/recordatorios";

/**
 * Escaneo diario de recordatorios (PRD M6, US-20/US-33), invocado por la task
 * de Trigger.dev (src/trigger/reminders.ts) y manualmente para tests.
 *
 * Dedup: el insert en notificaciones_enviadas con onConflictDoNothing es el
 * candado — si la fila ya existe (tipo, entidad, clave), no se reenvía.
 */
export type ResultadoScan = {
  escaneados: number;
  vencidosMarcados: number;
  enviados: number;
  errores: number;
};

export async function scanRecordatorios(
  hoy = new Date(),
  opts?: { enviarEmails?: boolean }
): Promise<ResultadoScan> {
  const enviarEmails = opts?.enviarEmails ?? true;
  const resultado: ResultadoScan = { escaneados: 0, vencidosMarcados: 0, enviados: 0, errores: 0 };

  const filas = await db
    .select({
      pasoId: pasosAlumno.id,
      codigo: pasosAlumno.codigo,
      estado: pasosAlumno.estado,
      fechaLimite: pasosAlumno.fechaLimite,
      asignacionId: asignaciones.id,
      alumnoNombre: alumnos.nombre,
      alumnoApellido: alumnos.apellido,
      tutorEmail: alumnos.tutor1Email,
      tutorNombre: alumnos.tutor1Nombre,
      viajeCodigo: viajes.codigo,
      fechaInicioViaje: viajes.fechaInicio,
    })
    .from(pasosAlumno)
    .innerJoin(asignaciones, eq(pasosAlumno.asignacionId, asignaciones.id))
    .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
    .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
    .where(
      and(
        eq(asignaciones.estado, "activa"),
        inArray(viajes.estado, ["inscripcion_abierta", "confirmado"]),
        inArray(pasosAlumno.codigo, ["a1", "d1"])
      )
    );

  resultado.escaneados = filas.length;

  for (const fila of filas) {
    let recordatorio: RecordatorioPendiente | null = null;

    if (fila.codigo === "a1") {
      if (!fila.fechaLimite) continue; // sin fecha límite definida, nada que recordar
      // Vencimiento: marcar 'vencido' (no bloquea, US-20)
      if (a1Vencido(fila.fechaLimite, hoy, fila.estado)) {
        await db
          .update(pasosAlumno)
          .set({ estado: "vencido", updatedAt: new Date() })
          .where(eq(pasosAlumno.id, fila.pasoId));
        resultado.vencidosMarcados += 1;
        continue;
      }
      recordatorio = recordatorioA1DeHoy(fila.fechaLimite, hoy, fila.estado);
    } else if (fila.codigo === "d1") {
      recordatorio = recordatorioD1DeHoy(fila.fechaInicioViaje, hoy, fila.estado);
    }

    if (!recordatorio) continue;

    // Candado de dedup: si ya se envió esta ocurrencia, el insert no devuelve fila.
    const insertado = await db
      .insert(notificacionesEnviadas)
      .values({
        tipo: recordatorio.tipo,
        entidadTipo: "paso_alumno",
        entidadId: fila.pasoId,
        clave: recordatorio.clave,
        destinatario: fila.tutorEmail,
      })
      .onConflictDoNothing()
      .returning({ id: notificacionesEnviadas.id });
    if (insertado.length === 0) continue;

    if (!enviarEmails) {
      resultado.enviados += 1;
      continue;
    }

    try {
      const { sendRecordatorioEmail } = await import("@/lib/email/send-recordatorio");
      const res = await sendRecordatorioEmail({
        to: fila.tutorEmail,
        tutorNombre: fila.tutorNombre,
        alumnoNombre: `${fila.alumnoNombre} ${fila.alumnoApellido}`,
        viajeCodigo: fila.viajeCodigo,
        paso: fila.codigo === "a1" ? "Application Form del colegio" : "Autorización de viaje ante escribano",
        diasAntes: recordatorio.diasAntes,
        fechaObjetivo: fila.codigo === "a1" ? fila.fechaLimite! : fila.fechaInicioViaje,
      });
      await db
        .update(notificacionesEnviadas)
        .set({ resendMessageId: res?.id ?? null })
        .where(eq(notificacionesEnviadas.id, insertado[0]!.id));
      resultado.enviados += 1;
    } catch (err) {
      console.error("[recordatorios] fallo el envío:", (err as Error).message);
      await db
        .update(notificacionesEnviadas)
        .set({ estado: "failed" })
        .where(eq(notificacionesEnviadas.id, insertado[0]!.id));
      resultado.errores += 1;
    }
  }

  return resultado;
}
