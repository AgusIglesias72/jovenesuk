import { and, asc, count, eq, gt, inArray, ne, notInArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { colegios } from "@/lib/db/schema/colegios";
import { viajes, type Viaje } from "@/lib/db/schema/viajes";

import type { ViajeListItem } from "./viajes";

export type DashboardStats = {
  alumnos: number;
  viajesConfirmados: number;
  viajando: number;
  inscripcionAbierta: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [alumnosRow] = await db.select({ c: count() }).from(alumnos);
  const viajeRows = await db
    .select({ estado: viajes.estado, c: count() })
    .from(viajes)
    .groupBy(viajes.estado);

  const porEstado = (e: Viaje["estado"]) =>
    viajeRows.find((r) => r.estado === e)?.c ?? 0;

  return {
    alumnos: alumnosRow?.c ?? 0,
    viajesConfirmados: porEstado("confirmado"),
    viajando: porEstado("en_curso"),
    inscripcionAbierta: porEstado("inscripcion_abierta"),
  };
}

export async function getProximosViajes(limit = 6): Promise<ViajeListItem[]> {
  const rows = await db
    .select({ viaje: viajes, colegioDestinoNombre: colegios.nombre })
    .from(viajes)
    .leftJoin(colegios, eq(viajes.colegioDestinoId, colegios.id))
    .where(notInArray(viajes.estado, ["cancelado", "finalizado"]))
    .orderBy(asc(viajes.fechaInicio))
    .limit(limit);

  return rows.map((r) => ({ ...r.viaje, colegioDestinoNombre: r.colegioDestinoNombre }));
}

export type ViajeConOcupacion = ViajeListItem & {
  inscriptos: number;
  /** % de alumnos del viaje con todos sus pasos computables completados. */
  completitudPct: number;
};

/**
 * Viajes próximos con inscriptos reales y % de completitud (US-DX-02).
 * Completitud por alumno: pasos no-N/A y no opcionales todos completados.
 */
export async function getProximosViajesConOcupacion(limit = 6): Promise<ViajeConOcupacion[]> {
  const base = await getProximosViajes(limit);
  if (base.length === 0) return [];
  const ids = base.map((v) => v.id);

  const filas = await db
    .select({
      viajeId: asignaciones.viajeId,
      asignacionId: asignaciones.id,
      codigo: pasosAlumno.codigo,
      estado: pasosAlumno.estado,
      metadata: pasosAlumno.metadata,
    })
    .from(asignaciones)
    .leftJoin(pasosAlumno, eq(pasosAlumno.asignacionId, asignaciones.id))
    .where(and(eq(asignaciones.estado, "activa"), inArray(asignaciones.viajeId, ids)));

  const porViaje = new Map<string, Map<string, { total: number; completos: number }>>();
  for (const f of filas) {
    const porAsig = porViaje.get(f.viajeId) ?? new Map();
    porViaje.set(f.viajeId, porAsig);
    const acc = porAsig.get(f.asignacionId) ?? { total: 0, completos: 0 };
    porAsig.set(f.asignacionId, acc);
    if (!f.codigo || f.estado === "na") continue;
    if ((f.metadata as Record<string, unknown> | null)?.opcional === true) continue;
    acc.total += 1;
    if (f.estado === "completado") acc.completos += 1;
  }

  return base.map((v) => {
    const porAsig = porViaje.get(v.id) ?? new Map<string, { total: number; completos: number }>();
    const alumnosViaje = [...porAsig.values()];
    const alumnosCompletos = alumnosViaje.filter((a) => a.total > 0 && a.completos === a.total).length;
    return {
      ...v,
      inscriptos: alumnosViaje.length,
      completitudPct: alumnosViaje.length
        ? Math.round((alumnosCompletos / alumnosViaje.length) * 100)
        : 0,
    };
  });
}

export type ViajeProximoAnio = {
  id: string;
  codigo: string;
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  colegioDestinoNombre: string | null;
  inscriptos: number;
  capacidadMaxima: number;
  capacidadMinima: number;
};

/**
 * Viajes grupales del próximo año (US-DX-05): inscripción abierta o confirmados
 * con salida a más de 6 meses. Los Individuales no aparecen — no tienen
 * dinámica de inscripción que monitorear.
 */
export async function getViajesProximoAnio(hoy = new Date()): Promise<ViajeProximoAnio[]> {
  const corte = new Date(hoy);
  corte.setMonth(corte.getMonth() + 6);

  const rows = await db
    .select({ viaje: viajes, colegioDestinoNombre: colegios.nombre })
    .from(viajes)
    .leftJoin(colegios, eq(viajes.colegioDestinoId, colegios.id))
    .where(
      and(
        eq(viajes.tipo, "grupal"),
        inArray(viajes.estado, ["inscripcion_abierta", "confirmado"]),
        gt(viajes.fechaInicio, corte)
      )
    )
    .orderBy(asc(viajes.fechaInicio));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.viaje.id);
  const inscriptosRows = await db
    .select({ viajeId: asignaciones.viajeId, c: count() })
    .from(asignaciones)
    .where(and(inArray(asignaciones.viajeId, ids), ne(asignaciones.estado, "cancelada")))
    .groupBy(asignaciones.viajeId);
  const inscriptosPorViaje = new Map(inscriptosRows.map((r) => [r.viajeId, r.c]));

  return rows.map((r) => ({
    id: r.viaje.id,
    codigo: r.viaje.codigo,
    nombre: r.viaje.nombre,
    fechaInicio: r.viaje.fechaInicio,
    fechaFin: r.viaje.fechaFin,
    colegioDestinoNombre: r.colegioDestinoNombre,
    inscriptos: inscriptosPorViaje.get(r.viaje.id) ?? 0,
    capacidadMaxima: r.viaje.capacidadMaxima,
    capacidadMinima: r.viaje.capacidadMinima,
  }));
}
