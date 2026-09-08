import { task, schedules } from "@trigger.dev/sdk/v3";

/**
 * Scan diario: transiciona viajes por fecha y genera los recordatorios
 * escalonados (14/7/3/1 días antes de cada deadline; vencido si pasó y el paso
 * sigue pendiente — PRD §6.3).
 *
 * Corre todos los días a las 06:00 ART (= 09:00 UTC).
 */
export const dailyReminderScan = schedules.task({
  id: "daily-reminder-scan",
  cron: {
    pattern: "0 9 * * *",
    timezone: "UTC",
  },
  maxDuration: 600,
  run: async () => {
    // Transiciones por fecha primero (un viaje que pasa a en_curso hoy no
    // necesita recordatorios de inscripción).
    const { transicionarViajesPorFecha } = await import("@/lib/jobs/transiciones-viajes");
    const transiciones = await transicionarViajesPorFecha(new Date());

    const { scanRecordatorios } = await import("@/lib/jobs/scan-recordatorios");
    // Dedup contra notificaciones_enviadas: re-correr el job no duplica envíos.
    const recordatorios = await scanRecordatorios(new Date());
    return { transiciones, recordatorios };
  },
});

/**
 * Corrida manual del scan (para probar sin esperar el cron). El parámetro
 * `enviarEmails: false` permite un dry-run que solo registra ocurrencias.
 */
export const runReminderScan = task({
  id: "run-reminder-scan",
  maxDuration: 600,
  run: async (payload: { enviarEmails?: boolean }) => {
    const { scanRecordatorios } = await import("@/lib/jobs/scan-recordatorios");
    return scanRecordatorios(new Date(), { enviarEmails: payload.enviarEmails ?? true });
  },
});
