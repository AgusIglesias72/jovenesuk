import { and, asc, count, eq, inArray, notInArray } from "drizzle-orm";

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
