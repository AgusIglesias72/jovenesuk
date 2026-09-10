import { and, eq, inArray, lt, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { colegioDocumentoConfig, colegios } from "@/lib/db/schema/colegios";
import { cuotas } from "@/lib/db/schema/cuotas";
import { groupLeaders } from "@/lib/db/schema/grupos-leaders";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { groupLeadersViaje } from "@/lib/db/schema/pasos-viaje";
import { viajes, type Viaje } from "@/lib/db/schema/viajes";
import { calcularAlertas, type Alerta } from "@/lib/domain/alertas";
import { diaCalendarioUTC } from "@/lib/utils/date";

export type { Alerta };

export type AlertasOpciones = {
  hoy?: Date;
  /**
   * Restringe el cálculo a un viaje (detalle de viaje); por default, todos.
   * Con viaje, el Parental Consent se evalúa solo para SU colegio destino.
   */
  viajeId?: string;
};

/** Viajes sobre los que se calculan alertas: los finalizados y cancelados no alertan. */
export const VIAJE_ESTADOS_CON_ALERTAS = [
  "inscripcion_abierta",
  "confirmado",
  "en_curso",
] as const satisfies readonly Viaje["estado"][];

export function viajeTieneAlertas(estado: Viaje["estado"]): boolean {
  return (VIAJE_ESTADOS_CON_ALERTAS as readonly Viaje["estado"][]).includes(estado);
}

/**
 * Alertas del dashboard (PRD M2). Las REGLAS viven en domain/alertas; acá solo
 * se cargan las filas, en tres etapas paralelas porque neon-http cobra un
 * round-trip HTTPS por query: A (colegios + viajes) → B (config, asignaciones y
 * GLs, que dependen de A) → C (cuotas y pasos, que dependen de las
 * asignaciones). Antes eran 7 queries en serie.
 */
export async function getAlertas(opciones: AlertasOpciones = {}): Promise<Alerta[]> {
  const hoy = opciones.hoy ?? new Date();
  const { viajeId } = opciones;

  const estadosConAlertas = [...VIAJE_ESTADOS_CON_ALERTAS];

  const [destinos, viajesActivos] = await Promise.all([
    db
      .select({
        id: colegios.id,
        nombre: colegios.nombre,
        parentalConsentUpdatedAt: colegios.parentalConsentUpdatedAt,
      })
      .from(colegios)
      .where(
        and(
          eq(colegios.tipo, "destino"),
          eq(colegios.estado, "activo"),
          // Sin este corte el detalle de UN viaje listaría el Parental Consent
          // de todos los colegios de la agencia.
          viajeId
            ? inArray(
                colegios.id,
                db
                  .select({ id: viajes.colegioDestinoId })
                  .from(viajes)
                  .where(and(eq(viajes.id, viajeId), inArray(viajes.estado, estadosConAlertas)))
              )
            : undefined
        )
      ),
    db
      .select({ id: viajes.id, codigo: viajes.codigo, fechaInicio: viajes.fechaInicio })
      .from(viajes)
      .where(
        and(
          inArray(viajes.estado, estadosConAlertas),
          viajeId ? eq(viajes.id, viajeId) : undefined
        )
      ),
  ]);

  const idsColegios = destinos.map((c) => c.id);
  const idsViajes = viajesActivos.map((v) => v.id);

  const [configRows, asignacionesActivas, glsAsignados] = await Promise.all([
    idsColegios.length > 0
      ? db
          .select({
            colegioId: colegioDocumentoConfig.colegioId,
            requisito: colegioDocumentoConfig.requisito,
          })
          .from(colegioDocumentoConfig)
          .where(
            and(
              eq(colegioDocumentoConfig.documento, "parental_consent"),
              inArray(colegioDocumentoConfig.colegioId, idsColegios)
            )
          )
      : [],
    idsViajes.length > 0
      ? db
          .select({
            asignacionId: asignaciones.id,
            viajeId: asignaciones.viajeId,
            dni: alumnos.dni,
            nombre: alumnos.nombre,
            apellido: alumnos.apellido,
            vencimientoPasaporte: alumnos.fechaVencimientoPasaporte,
          })
          .from(asignaciones)
          .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
          .where(
            and(eq(asignaciones.estado, "activa"), inArray(asignaciones.viajeId, idsViajes))
          )
      : [],
    idsViajes.length > 0
      ? db
          .select({
            viajeId: groupLeadersViaje.viajeId,
            nombre: groupLeaders.nombre,
            apellido: groupLeaders.apellido,
            policeCheckEstado: groupLeaders.policeCheckEstado,
          })
          .from(groupLeadersViaje)
          .innerJoin(groupLeaders, eq(groupLeadersViaje.groupLeaderId, groupLeaders.id))
          .where(inArray(groupLeadersViaje.viajeId, idsViajes))
      : [],
  ]);

  const idsAsignaciones = asignacionesActivas.map((a) => a.asignacionId);
  // Mismo criterio que estaVencida(): la columna es `date` (medianoche UTC) y
  // comparar contra el INICIO del día evita marcar en mora lo que vence hoy.
  const inicioDeHoy = new Date(diaCalendarioUTC(hoy));

  const [cuotasVencidas, pasosBloqueados] = await Promise.all([
    idsAsignaciones.length > 0
      ? db
          .select({
            asignacionId: cuotas.asignacionId,
            numero: cuotas.numero,
            estado: cuotas.estado,
            fechaVencimiento: cuotas.fechaVencimiento,
          })
          .from(cuotas)
          .where(
            and(
              inArray(cuotas.asignacionId, idsAsignaciones),
              ne(cuotas.estado, "pagada"),
              lt(cuotas.fechaVencimiento, inicioDeHoy)
            )
          )
      : [],
    idsAsignaciones.length > 0
      ? db
          .select({
            asignacionId: pasosAlumno.asignacionId,
            codigo: pasosAlumno.codigo,
            notas: pasosAlumno.notas,
            metadata: pasosAlumno.metadata,
          })
          .from(pasosAlumno)
          .where(
            and(
              inArray(pasosAlumno.asignacionId, idsAsignaciones),
              eq(pasosAlumno.estado, "bloqueado")
            )
          )
      : [],
  ]);

  return calcularAlertas({
    destinos,
    requisitoParentalConsentPorColegio: new Map(configRows.map((r) => [r.colegioId, r.requisito])),
    viajes: viajesActivos,
    asignaciones: asignacionesActivas,
    cuotasImpagas: cuotasVencidas,
    pasosBloqueados,
    groupLeaders: glsAsignados,
    hoy,
  });
}

/** Contador de alumnos con al menos una cuota vencida (indicador de mora, M2). */
export async function countAlumnosEnMora(hoy = new Date()): Promise<number> {
  const inicioDeHoy = new Date(diaCalendarioUTC(hoy));
  const rows = await db
    .select({ alumnoId: asignaciones.alumnoId })
    .from(cuotas)
    .innerJoin(asignaciones, eq(cuotas.asignacionId, asignaciones.id))
    .where(and(ne(cuotas.estado, "pagada"), lt(cuotas.fechaVencimiento, inicioDeHoy)));
  return new Set(rows.map((r) => r.alumnoId)).size;
}
