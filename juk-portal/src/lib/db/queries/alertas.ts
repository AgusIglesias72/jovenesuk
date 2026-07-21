import { and, eq, inArray, lt, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { colegioDocumentoConfig, colegios } from "@/lib/db/schema/colegios";
import { cuotas } from "@/lib/db/schema/cuotas";
import { groupLeaders } from "@/lib/db/schema/grupos-leaders";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { groupLeadersViaje } from "@/lib/db/schema/pasos-viaje";
import { viajes } from "@/lib/db/schema/viajes";
import { pasaporteEnAlertaConservadora } from "@/lib/domain/asignaciones";
import { CONFIG_DOCUMENTAL_DEFAULT } from "@/lib/domain/colegios";
import { diasDeMora, estaVencida } from "@/lib/domain/cuotas";
import { PASO_LABELS, type PasoCodigo } from "@/lib/domain/pasos";
import { formatFecha } from "@/lib/utils/date";

/**
 * Alertas derivadas del dashboard (PRD M2). Se calculan on-read sobre los
 * viajes no terminados; cuando haya Trigger.dev pasan a materializarse.
 * Severidad: critica > alta.
 */
export type Alerta = {
  severidad: "critica" | "alta";
  titulo: string;
  detalle: string;
  href: string;
};

export async function getAlertas(hoy = new Date()): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  // ── Parental Consent desactualizado (M3/US-06) ────────────────────
  const destinosActivos = await db
    .select({
      id: colegios.id,
      nombre: colegios.nombre,
      parentalConsentUpdatedAt: colegios.parentalConsentUpdatedAt,
    })
    .from(colegios)
    .where(and(eq(colegios.tipo, "destino"), eq(colegios.estado, "activo")));

  if (destinosActivos.length > 0) {
    const configRows = await db
      .select({
        colegioId: colegioDocumentoConfig.colegioId,
        requisito: colegioDocumentoConfig.requisito,
      })
      .from(colegioDocumentoConfig)
      .where(
        and(
          eq(colegioDocumentoConfig.documento, "parental_consent"),
          inArray(
            colegioDocumentoConfig.colegioId,
            destinosActivos.map((c) => c.id)
          )
        )
      );
    const requisitoPorColegio = new Map(configRows.map((r) => [r.colegioId, r.requisito]));

    const limite = new Date(hoy);
    limite.setMonth(limite.getMonth() - 12);
    for (const c of destinosActivos) {
      // Sin fila explícita rige el default del dominio ("na") — no alerta.
      const requisito =
        requisitoPorColegio.get(c.id) ?? CONFIG_DOCUMENTAL_DEFAULT.parental_consent;
      if (requisito === "na") continue;
      const desactualizado =
        c.parentalConsentUpdatedAt === null ||
        c.parentalConsentUpdatedAt.getTime() < limite.getTime();
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
  }

  const viajesActivos = await db
    .select()
    .from(viajes)
    .where(inArray(viajes.estado, ["inscripcion_abierta", "confirmado", "en_curso"]));
  if (viajesActivos.length === 0) return alertas;
  const viajeById = new Map(viajesActivos.map((v) => [v.id, v]));
  const idsViajes = viajesActivos.map((v) => v.id);

  const asignacionesActivas = await db
    .select({
      asignacionId: asignaciones.id,
      viajeId: asignaciones.viajeId,
      alumnoId: alumnos.id,
      dni: alumnos.dni,
      nombre: alumnos.nombre,
      apellido: alumnos.apellido,
      vencimientoPasaporte: alumnos.fechaVencimientoPasaporte,
    })
    .from(asignaciones)
    .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
    .where(and(eq(asignaciones.estado, "activa"), inArray(asignaciones.viajeId, idsViajes)));

  // ── Pasaportes (criterio conservador: 6 meses post-inicio) ────────
  for (const a of asignacionesActivas) {
    const viaje = viajeById.get(a.viajeId);
    if (!viaje) continue;
    if (pasaporteEnAlertaConservadora(a.vencimientoPasaporte, viaje.fechaInicio)) {
      const vencido = a.vencimientoPasaporte.getTime() < hoy.getTime();
      alertas.push({
        severidad: "critica",
        titulo: `Pasaporte ${vencido ? "vencido" : "por vencer"} · ${a.apellido}, ${a.nombre}`,
        detalle: `Vence el ${formatFecha(a.vencimientoPasaporte)} y ${viaje.codigo} sale el ${formatFecha(viaje.fechaInicio)}.`,
        href: `/alumnos/${a.dni}`,
      });
    }
  }

  const idsAsignaciones = asignacionesActivas.map((a) => a.asignacionId);
  const porAsignacion = new Map(asignacionesActivas.map((a) => [a.asignacionId, a]));

  if (idsAsignaciones.length > 0) {
    // ── Mora en cuotas ──────────────────────────────────────────────
    const cuotasImpagas = await db
      .select()
      .from(cuotas)
      .where(and(inArray(cuotas.asignacionId, idsAsignaciones), ne(cuotas.estado, "pagada")));
    for (const c of cuotasImpagas) {
      if (!estaVencida(c, hoy)) continue;
      const a = porAsignacion.get(c.asignacionId);
      if (!a) continue;
      const dias = diasDeMora(c, hoy);
      alertas.push({
        severidad: dias > 7 ? "critica" : "alta",
        titulo: `Cuota ${c.numero} en mora · ${a.apellido}, ${a.nombre}`,
        detalle: `${dias} día${dias === 1 ? "" : "s"} de atraso (vencía el ${formatFecha(c.fechaVencimiento)}).`,
        href: `/alumnos/${a.dni}`,
      });
    }

    // ── Pasos bloqueados (ETA rechazado y afines) ───────────────────
    const bloqueados = await db
      .select()
      .from(pasosAlumno)
      .where(
        and(inArray(pasosAlumno.asignacionId, idsAsignaciones), eq(pasosAlumno.estado, "bloqueado"))
      );
    for (const p of bloqueados) {
      if (p.codigo === "c2" && (p.metadata as Record<string, unknown>).bloqueadoPor === "b1")
        continue; // dependencia estructural, no problema operativo
      const a = porAsignacion.get(p.asignacionId);
      if (!a) continue;
      const esEtaRechazado =
        p.codigo === "c1" && (p.metadata as Record<string, unknown>).subEstado === "rechazado";
      alertas.push({
        severidad: esEtaRechazado ? "critica" : "alta",
        titulo: `${esEtaRechazado ? "ETA rechazado" : `${PASO_LABELS[p.codigo as PasoCodigo]} bloqueado`} · ${a.apellido}, ${a.nombre}`,
        detalle: p.notas ?? "Requiere intervención del equipo.",
        href: `/alumnos/${a.dni}`,
      });
    }
  }

  // ── Police checks de GLs en viajes próximos ───────────────────────
  const glsAsignados = await db
    .select({
      viajeId: groupLeadersViaje.viajeId,
      nombre: groupLeaders.nombre,
      apellido: groupLeaders.apellido,
      estado: groupLeaders.policeCheckEstado,
      vencimiento: groupLeaders.policeCheckFechaVencimiento,
    })
    .from(groupLeadersViaje)
    .innerJoin(groupLeaders, eq(groupLeadersViaje.groupLeaderId, groupLeaders.id))
    .where(inArray(groupLeadersViaje.viajeId, idsViajes));
  for (const gl of glsAsignados) {
    const viaje = viajeById.get(gl.viajeId);
    if (!viaje) continue;
    if (gl.estado === "vencido") {
      alertas.push({
        severidad: "critica",
        titulo: `Police check vencido · ${gl.apellido}, ${gl.nombre}`,
        detalle: `GL de ${viaje.codigo}; sin check vigente no puede acompañar al grupo.`,
        href: `/viajes/${viaje.codigo}`,
      });
    }
  }

  return alertas.sort((a, b) => (a.severidad === b.severidad ? 0 : a.severidad === "critica" ? -1 : 1));
}

/** Contador de alumnos con al menos una cuota vencida (indicador de mora, M2). */
export async function countAlumnosEnMora(hoy = new Date()): Promise<number> {
  // Misma semántica de día calendario que estaVencida(): la columna es `date`
  // (medianoche UTC) — comparar contra el INICIO del día evita marcar en mora
  // a las cuotas que vencen hoy.
  const inicioDeHoy = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())
  );
  const rows = await db
    .select({ asignacionId: cuotas.asignacionId, alumnoId: asignaciones.alumnoId })
    .from(cuotas)
    .innerJoin(asignaciones, eq(cuotas.asignacionId, asignaciones.id))
    .where(and(ne(cuotas.estado, "pagada"), lt(cuotas.fechaVencimiento, inicioDeHoy)));
  return new Set(rows.map((r) => r.alumnoId)).size;
}
