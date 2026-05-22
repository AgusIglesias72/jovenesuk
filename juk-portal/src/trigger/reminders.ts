import { task, schedules } from "@trigger.dev/sdk/v3";

/**
 * Daily job that scans the system for upcoming deadlines and generates
 * scheduled reminder emails.
 *
 * Pattern (from PRD §6.3):
 *  - 14, 7, 3, and 1 days before a deadline → send reminder email
 *  - if deadline passes and step is still Pendiente → mark as "Vencido" alert
 *
 * Runs every day at 06:00 ART (= 09:00 UTC).
 */
export const dailyReminderScan = schedules.task({
  id: "daily-reminder-scan",
  cron: {
    pattern: "0 9 * * *",  // 09:00 UTC daily
    timezone: "UTC",
  },
  maxDuration: 600,
  run: async (payload, { ctx }) => {
    // TODO: Implement with @/lib/jobs/scan-deadlines.ts
    // Scan pasos_alumno where fechaLimite is in [today, today + 14]
    // For each step, check whether a reminder for this distance has been sent
    // If not, enqueue sendReminderEmail with the right template
    return { scanned: 0, enqueued: 0 };
  },
});

/**
 * One-off task that sends a single reminder email.
 * Called by dailyReminderScan and also can be triggered manually for tests.
 */
export const sendReminderEmail = task({
  id: "send-reminder-email",
  maxDuration: 60,
  run: async (payload: {
    asignacionId: string;
    pasoTipo: string;
    diasAntesDelLimite: number;
  }) => {
    // TODO: Implement with @/lib/email/send-reminder.ts
    return { sent: true };
  },
});

/**
 * Weekly summary email to María (PRD §2.5).
 * Sent every Monday at 08:00 ART (= 11:00 UTC).
 */
export const weeklySummaryEmail = schedules.task({
  id: "weekly-summary-email",
  cron: {
    pattern: "0 11 * * 1",  // 11:00 UTC every Monday
    timezone: "UTC",
  },
  maxDuration: 120,
  run: async (payload, { ctx }) => {
    // TODO: Compose dashboard digest and send to maria@jovenesenuk.com
    return { sent: true };
  },
});

/**
 * Hourly job that re-evaluates alert rules and creates/closes alerts.
 *
 * Runs every hour at minute 5 to avoid clustering with other tasks.
 */
export const recomputeAlerts = schedules.task({
  id: "recompute-alerts",
  cron: {
    pattern: "5 * * * *",
    timezone: "UTC",
  },
  maxDuration: 300,
  run: async (payload, { ctx }) => {
    // TODO: Implement with @/lib/jobs/recompute-alerts.ts
    return { created: 0, resolved: 0 };
  },
});
