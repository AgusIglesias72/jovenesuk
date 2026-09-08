import {
  listPasosParaRecordatorio,
  marcarPasoVencido,
  registrarNotificacionEnviada,
  setResultadoNotificacion,
} from "@/lib/db/queries/recordatorios";
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

  const filas = await listPasosParaRecordatorio();
  resultado.escaneados = filas.length;

  for (const fila of filas) {
    let recordatorio: RecordatorioPendiente | null = null;
    let fechaObjetivo: Date;

    if (fila.codigo === "a1") {
      if (!fila.fechaLimite) continue; // sin fecha límite definida, nada que recordar
      // Vencimiento: marcar 'vencido' (no bloquea, US-20)
      if (a1Vencido(fila.fechaLimite, hoy, fila.estado)) {
        await marcarPasoVencido(fila.pasoId);
        resultado.vencidosMarcados += 1;
        continue;
      }
      recordatorio = recordatorioA1DeHoy(fila.fechaLimite, hoy, fila.estado);
      fechaObjetivo = fila.fechaLimite;
    } else if (fila.codigo === "d1") {
      recordatorio = recordatorioD1DeHoy(fila.fechaInicioViaje, hoy, fila.estado);
      fechaObjetivo = fila.fechaInicioViaje;
    } else {
      continue;
    }

    if (!recordatorio) continue;

    const notificacionId = await registrarNotificacionEnviada({
      tipo: recordatorio.tipo,
      entidadTipo: "paso_alumno",
      entidadId: fila.pasoId,
      clave: recordatorio.clave,
      destinatario: fila.tutorEmail,
    });
    if (!notificacionId) continue;

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
        fechaObjetivo,
      });
      await setResultadoNotificacion(notificacionId, { resendMessageId: res?.id ?? null });
      resultado.enviados += 1;
    } catch (err) {
      console.error("[recordatorios] fallo el envío:", (err as Error).message);
      await setResultadoNotificacion(notificacionId, { estado: "failed" });
      resultado.errores += 1;
    }
  }

  return resultado;
}
