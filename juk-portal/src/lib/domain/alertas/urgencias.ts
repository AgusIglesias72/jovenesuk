import { PASO_LABELS } from "@/lib/domain/pasos";
import { diasEntre } from "@/lib/utils/date";

import {
  alertasMora,
  alertasPasaporte,
  alertasPasosBloqueados,
  type Alerta,
  type AsignacionParaAlerta,
  type CuotaParaAlerta,
  type PasoBloqueadoParaAlerta,
  type ViajeParaAlerta,
} from "./reglas";

/**
 * "Alumnos con acción urgente" del dashboard (PRD M2, US-DX-03). No agrega
 * reglas de alerta: evalúa las MISMAS funciones puras del panel (reglas.ts)
 * sobre cada asignación y las agrupa por alumno, que es la unidad con la que
 * trabaja el equipo ("a quién llamo hoy").
 */

export const SEVERIDAD_LABELS: Record<Alerta["severidad"], string> = {
  critica: "Crítica",
  alta: "Alta",
};

/** Ventana de viaje inminente que manda en el orden de la lista (US-DX-03). */
export const DIAS_VIAJE_INMINENTE = 30;

export type PasoTrabadoParaAlerta = PasoBloqueadoParaAlerta & {
  estado: "bloqueado" | "vencido";
};

/**
 * Pasos vencidos (hoy solo A1 puede vencer). Misma severidad que un paso
 * bloqueado común: el filtro "pasos bloqueados" del listado de alumnos ya los
 * trata juntos, y el dashboard no puede mostrar menos que ese listado.
 */
export function alertasPasosVencidos(
  pasos: readonly PasoBloqueadoParaAlerta[],
  asignacionPorId: ReadonlyMap<string, AsignacionParaAlerta>
): Alerta[] {
  const alertas: Alerta[] = [];
  for (const p of pasos) {
    const a = asignacionPorId.get(p.asignacionId);
    if (!a) continue;
    alertas.push({
      severidad: "alta",
      titulo: `${PASO_LABELS[p.codigo]} vencido · ${a.apellido}, ${a.nombre}`,
      detalle: p.notas ?? "El plazo del paso se cumplió sin completarlo.",
      href: `/alumnos/${a.dni}`,
      viajeId: a.viajeId,
    });
  }
  return alertas;
}

/**
 * Motivo corto de una alerta. Los títulos de las reglas son siempre
 * "<motivo> · <Apellido, Nombre>"; en la fila del alumno el nombre ya tiene su
 * propia columna y repetirlo en cada motivo es ruido.
 */
export function motivoDeAlerta(alerta: Alerta): string {
  return alerta.titulo.split(" · ")[0] ?? alerta.titulo;
}

export function textoDiasHastaViaje(dias: number): string {
  if (dias < 0) return "Viaje en curso";
  if (dias === 0) return "Sale hoy";
  if (dias === 1) return "Sale mañana";
  return `Sale en ${dias} días`;
}

export type AlumnoConAccionUrgente = {
  asignacionId: string;
  dni: string;
  nombre: string;
  apellido: string;
  viajeId: string;
  viajeCodigo: string;
  fechaInicioViaje: Date;
  /** Negativo cuando el viaje ya arrancó. */
  diasHastaViaje: number;
  viajeInminente: boolean;
  severidad: Alerta["severidad"];
  /** Sin repetidos, en el orden de las reglas (pasaporte, mora, pasos). */
  motivos: string[];
  totalAlertas: number;
};

export type EntradaAlumnosUrgentes = {
  viajes: readonly ViajeParaAlerta[];
  asignaciones: readonly AsignacionParaAlerta[];
  cuotasImpagas: readonly CuotaParaAlerta[];
  pasosTrabados: readonly PasoTrabadoParaAlerta[];
  hoy: Date;
};

function agruparPorAsignacion<T extends { asignacionId: string }>(
  filas: readonly T[]
): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const fila of filas) {
    const grupo = grupos.get(fila.asignacionId);
    if (grupo) grupo.push(fila);
    else grupos.set(fila.asignacionId, [fila]);
  }
  return grupos;
}

/**
 * Orden de US-DX-03: (1) viaje en los próximos 30 días (o ya en curso),
 * (2) con alguna alerta crítica. Desempates: el viaje que sale antes, más
 * alertas acumuladas, y apellido para que el orden sea estable.
 */
export function compararUrgencia(a: AlumnoConAccionUrgente, b: AlumnoConAccionUrgente): number {
  if (a.viajeInminente !== b.viajeInminente) return a.viajeInminente ? -1 : 1;
  if (a.severidad !== b.severidad) return a.severidad === "critica" ? -1 : 1;
  if (a.diasHastaViaje !== b.diasHastaViaje) return a.diasHastaViaje - b.diasHastaViaje;
  if (a.totalAlertas !== b.totalAlertas) return b.totalAlertas - a.totalAlertas;
  return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es");
}

/** Una fila por asignación activa con al menos una alerta, ordenadas por urgencia. */
export function calcularAlumnosUrgentes(entrada: EntradaAlumnosUrgentes): AlumnoConAccionUrgente[] {
  const viajePorId = new Map(entrada.viajes.map((v) => [v.id, v]));
  const cuotasPorAsignacion = agruparPorAsignacion(entrada.cuotasImpagas);
  const pasosPorAsignacion = agruparPorAsignacion(entrada.pasosTrabados);

  const urgentes: AlumnoConAccionUrgente[] = [];
  for (const a of entrada.asignaciones) {
    const viaje = viajePorId.get(a.viajeId);
    if (!viaje) continue;

    const propia = new Map([[a.asignacionId, a]]);
    const pasos = pasosPorAsignacion.get(a.asignacionId) ?? [];
    const alertas = [
      ...alertasPasaporte([a], viajePorId, entrada.hoy),
      ...alertasMora(cuotasPorAsignacion.get(a.asignacionId) ?? [], propia, entrada.hoy),
      ...alertasPasosBloqueados(
        pasos.filter((p) => p.estado === "bloqueado"),
        propia
      ),
      ...alertasPasosVencidos(
        pasos.filter((p) => p.estado === "vencido"),
        propia
      ),
    ];
    if (alertas.length === 0) continue;

    const diasHastaViaje = diasEntre(entrada.hoy, viaje.fechaInicio);
    urgentes.push({
      asignacionId: a.asignacionId,
      dni: a.dni,
      nombre: a.nombre,
      apellido: a.apellido,
      viajeId: viaje.id,
      viajeCodigo: viaje.codigo,
      fechaInicioViaje: viaje.fechaInicio,
      diasHastaViaje,
      viajeInminente: diasHastaViaje <= DIAS_VIAJE_INMINENTE,
      severidad: alertas.some((x) => x.severidad === "critica") ? "critica" : "alta",
      motivos: [...new Set(alertas.map(motivoDeAlerta))],
      totalAlertas: alertas.length,
    });
  }

  return urgentes.sort(compararUrgencia);
}
