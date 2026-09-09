import { pasaporteEnAlertaConservadora } from "@/lib/domain/asignaciones";
import { CONFIG_DOCUMENTAL_DEFAULT, type RequisitoDocumento } from "@/lib/domain/colegios";
import { diasDeMora, estaVencida, type CuotaVencibleLike } from "@/lib/domain/cuotas";
import { PASO_LABELS, type PasoCodigo } from "@/lib/domain/pasos";
import { diaCalendarioUTC, formatFecha } from "@/lib/utils/date";

/**
 * Reglas del panel de alertas (PRD M2). Funciones PURAS sobre filas ya
 * cargadas: la capa de queries solo trae los datos y arma los Map.
 * Severidad: critica > alta. Cuando haya Trigger.dev, este mismo módulo
 * alimenta el job que materializa la tabla `alertas`.
 */

export type Alerta = {
  severidad: "critica" | "alta";
  titulo: string;
  detalle: string;
  href: string;
  /** Viaje al que pertenece; las alertas por colegio no tienen. */
  viajeId?: string;
};

/** Meses sin actualizar el Parental Consent que disparan la alerta (US-06). */
export const MESES_VIGENCIA_PARENTAL_CONSENT = 12;

/** Días de atraso a partir de los cuales la mora pasa de alta a crítica. */
export const DIAS_MORA_CRITICA = 7;

export type ColegioParaAlerta = {
  id: string;
  nombre: string;
  parentalConsentUpdatedAt: Date | null;
};

export type ViajeParaAlerta = {
  id: string;
  codigo: string;
  fechaInicio: Date;
};

export type AsignacionParaAlerta = {
  asignacionId: string;
  viajeId: string;
  dni: string;
  nombre: string;
  apellido: string;
  vencimientoPasaporte: Date;
};

export type CuotaParaAlerta = CuotaVencibleLike & {
  asignacionId: string;
  numero: number;
};

export type PasoBloqueadoParaAlerta = {
  asignacionId: string;
  codigo: PasoCodigo;
  notas: string | null;
  metadata: Record<string, unknown>;
};

export type PoliceCheckEstado = "pendiente" | "en_tramite" | "aprobado" | "vencido";

export type GroupLeaderParaAlerta = {
  viajeId: string;
  nombre: string;
  apellido: string;
  policeCheckEstado: PoliceCheckEstado;
};

const nombreCompleto = (p: { nombre: string; apellido: string }) => `${p.apellido}, ${p.nombre}`;

/**
 * Parental Consent desactualizado (US-06): más de 12 meses sin actualizar o
 * nunca cargado. El corte se calcula en UTC (la columna es un timestamp) para
 * que el resultado no dependa de la zona del servidor.
 */
export function alertasParentalConsent(
  destinos: readonly ColegioParaAlerta[],
  requisitoPorColegio: ReadonlyMap<string, RequisitoDocumento>,
  hoy: Date
): Alerta[] {
  const limite = Date.UTC(
    hoy.getUTCFullYear(),
    hoy.getUTCMonth() - MESES_VIGENCIA_PARENTAL_CONSENT,
    hoy.getUTCDate()
  );

  const alertas: Alerta[] = [];
  for (const c of destinos) {
    // Sin fila explícita rige el default del dominio ("na") — no alerta.
    const requisito = requisitoPorColegio.get(c.id) ?? CONFIG_DOCUMENTAL_DEFAULT.parental_consent;
    if (requisito === "na") continue;
    const desactualizado =
      c.parentalConsentUpdatedAt === null || c.parentalConsentUpdatedAt.getTime() < limite;
    if (!desactualizado) continue;
    alertas.push({
      severidad: "alta",
      titulo: `Parental Consent desactualizado · ${c.nombre}`,
      detalle: c.parentalConsentUpdatedAt
        ? `Última actualización: ${formatFecha(c.parentalConsentUpdatedAt)}.`
        : "Más de 12 meses sin actualizar (o nunca se cargó).",
      href: `/colegios/${c.id}/editar`,
    });
  }
  return alertas;
}

/**
 * Pasaporte vencido o por vencer (criterio conservador: 6 meses post-inicio).
 * "Vencido" se decide por día calendario UTC igual que las cuotas: el día del
 * vencimiento el pasaporte todavía sirve.
 */
export function alertasPasaporte(
  asignaciones: readonly AsignacionParaAlerta[],
  viajePorId: ReadonlyMap<string, ViajeParaAlerta>,
  hoy: Date
): Alerta[] {
  const alertas: Alerta[] = [];
  for (const a of asignaciones) {
    const viaje = viajePorId.get(a.viajeId);
    if (!viaje) continue;
    if (!pasaporteEnAlertaConservadora(a.vencimientoPasaporte, viaje.fechaInicio)) continue;
    const vencido = diaCalendarioUTC(a.vencimientoPasaporte) < diaCalendarioUTC(hoy);
    alertas.push({
      severidad: "critica",
      titulo: `Pasaporte ${vencido ? "vencido" : "por vencer"} · ${nombreCompleto(a)}`,
      detalle: `Vence el ${formatFecha(a.vencimientoPasaporte)} y ${viaje.codigo} sale el ${formatFecha(viaje.fechaInicio)}.`,
      href: `/alumnos/${a.dni}`,
      viajeId: a.viajeId,
    });
  }
  return alertas;
}

/** Cuotas en mora: crítica a partir de 8 días de atraso, alta antes. */
export function alertasMora(
  cuotas: readonly CuotaParaAlerta[],
  asignacionPorId: ReadonlyMap<string, AsignacionParaAlerta>,
  hoy: Date
): Alerta[] {
  const alertas: Alerta[] = [];
  for (const c of cuotas) {
    if (!estaVencida(c, hoy)) continue;
    const a = asignacionPorId.get(c.asignacionId);
    if (!a) continue;
    const dias = diasDeMora(c, hoy);
    alertas.push({
      severidad: dias > DIAS_MORA_CRITICA ? "critica" : "alta",
      titulo: `Cuota ${c.numero} en mora · ${nombreCompleto(a)}`,
      detalle: `${dias} día${dias === 1 ? "" : "s"} de atraso (vencía el ${formatFecha(c.fechaVencimiento)}).`,
      href: `/alumnos/${a.dni}`,
      viajeId: a.viajeId,
    });
  }
  return alertas;
}

/** Pasos bloqueados del tablero del alumno (ETA rechazado y afines). */
export function alertasPasosBloqueados(
  pasos: readonly PasoBloqueadoParaAlerta[],
  asignacionPorId: ReadonlyMap<string, AsignacionParaAlerta>
): Alerta[] {
  const alertas: Alerta[] = [];
  for (const p of pasos) {
    // C2 bloqueado por B1 es una dependencia estructural, no un problema operativo.
    if (p.codigo === "c2" && p.metadata.bloqueadoPor === "b1") continue;
    const a = asignacionPorId.get(p.asignacionId);
    if (!a) continue;
    const esEtaRechazado = p.codigo === "c1" && p.metadata.subEstado === "rechazado";
    alertas.push({
      severidad: esEtaRechazado ? "critica" : "alta",
      titulo: `${esEtaRechazado ? "ETA rechazado" : `${PASO_LABELS[p.codigo]} bloqueado`} · ${nombreCompleto(a)}`,
      detalle: p.notas ?? "Requiere intervención del equipo.",
      href: `/alumnos/${a.dni}`,
      viajeId: a.viajeId,
    });
  }
  return alertas;
}

/** Police check vencido de un GL asignado a un viaje activo (M7 paso 5). */
export function alertasPoliceChecks(
  groupLeaders: readonly GroupLeaderParaAlerta[],
  viajePorId: ReadonlyMap<string, ViajeParaAlerta>
): Alerta[] {
  const alertas: Alerta[] = [];
  for (const gl of groupLeaders) {
    if (gl.policeCheckEstado !== "vencido") continue;
    const viaje = viajePorId.get(gl.viajeId);
    if (!viaje) continue;
    alertas.push({
      severidad: "critica",
      titulo: `Police check vencido · ${nombreCompleto(gl)}`,
      detalle: `GL de ${viaje.codigo}; sin check vigente no puede acompañar al grupo.`,
      href: `/viajes/${viaje.codigo}`,
      viajeId: viaje.id,
    });
  }
  return alertas;
}

/** Críticas primero, conservando el orden de llegada dentro de cada severidad. */
export function ordenarAlertas(alertas: readonly Alerta[]): Alerta[] {
  return [
    ...alertas.filter((a) => a.severidad === "critica"),
    ...alertas.filter((a) => a.severidad === "alta"),
  ];
}

export type EntradaAlertas = {
  destinos: readonly ColegioParaAlerta[];
  requisitoParentalConsentPorColegio: ReadonlyMap<string, RequisitoDocumento>;
  viajes: readonly ViajeParaAlerta[];
  asignaciones: readonly AsignacionParaAlerta[];
  cuotasImpagas: readonly CuotaParaAlerta[];
  pasosBloqueados: readonly PasoBloqueadoParaAlerta[];
  groupLeaders: readonly GroupLeaderParaAlerta[];
  hoy: Date;
};

/** Todas las reglas sobre un set de filas ya cargado, ordenadas por severidad. */
export function calcularAlertas(entrada: EntradaAlertas): Alerta[] {
  const viajePorId = new Map(entrada.viajes.map((v) => [v.id, v]));
  const asignacionPorId = new Map(entrada.asignaciones.map((a) => [a.asignacionId, a]));

  return ordenarAlertas([
    ...alertasParentalConsent(
      entrada.destinos,
      entrada.requisitoParentalConsentPorColegio,
      entrada.hoy
    ),
    ...alertasPasaporte(entrada.asignaciones, viajePorId, entrada.hoy),
    ...alertasMora(entrada.cuotasImpagas, asignacionPorId, entrada.hoy),
    ...alertasPasosBloqueados(entrada.pasosBloqueados, asignacionPorId),
    ...alertasPoliceChecks(entrada.groupLeaders, viajePorId),
  ]);
}
