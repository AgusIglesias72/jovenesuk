import type { PasoViajeEstado } from "./estados";

export const POLICE_CHECK_ESTADOS = ["pendiente", "en_tramite", "aprobado", "vencido"] as const;
export type PoliceCheckEstado = (typeof POLICE_CHECK_ESTADOS)[number];

export const POLICE_CHECK_ESTADO_LABELS: Record<PoliceCheckEstado, string> = {
  pendiente: "Pendiente",
  en_tramite: "En trámite",
  aprobado: "Aprobado",
  vencido: "Vencido",
};

export type PoliceCheckGL = {
  groupLeaderId: string;
  nombre: string;
  apellido: string;
  esPrincipal: boolean;
  estado: PoliceCheckEstado;
  fechaVencimiento: Date | null;
};

/**
 * Estado derivado del paso "police_checks" a partir de los Group Leaders del viaje.
 * - sin GLs asignados → pendiente (todavía no hay nada que controlar).
 * - algún GL vencido → bloqueado (no puede viajar sin police check vigente).
 * - todos aprobados → completado.
 * - todos pendientes → pendiente.
 * - resto (en trámite / mezcla) → en_progreso.
 */
export function derivarEstadoPoliceChecks(gls: PoliceCheckGL[]): PasoViajeEstado {
  if (gls.length === 0) return "pendiente";
  if (gls.some((g) => g.estado === "vencido")) return "bloqueado";
  if (gls.every((g) => g.estado === "aprobado")) return "completado";
  if (gls.every((g) => g.estado === "pendiente")) return "pendiente";
  return "en_progreso";
}
