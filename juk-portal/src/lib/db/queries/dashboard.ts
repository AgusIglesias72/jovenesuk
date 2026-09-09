import { and, asc, count, eq, gt, inArray, ne, notInArray, sql } from "drizzle-orm";

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
  // Independientes entre sí: sobre neon-http cada await es un round-trip.
  const [[alumnosRow], viajeRows] = await Promise.all([
    db.select({ c: count() }).from(alumnos),
    db.select({ estado: viajes.estado, c: count() }).from(viajes).groupBy(viajes.estado),
  ]);

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

  // Se agrega en SQL (una fila por asignación, no una por paso: eran ~800 filas
  // de JSON por dashboard). WHY del predicado: replica cuentaParaCompletitud()
  // de domain/pasos/estados.ts — un paso cuenta si no es "na" y no quedó
  // marcado opcional. `-> 'opcional'` (json, no ->>) para que solo el booleano
  // true cuente como opcional, igual que el `=== true` del dominio.
  const cuentaParaCompletitud = sql`${pasosAlumno.estado} <> 'na' and coalesce((${pasosAlumno.metadata} -> 'opcional')::text, 'false') <> 'true'`;

  // LEFT JOIN: una asignación sin pasos suma como inscripto con total 0.
  const porAsignacion = await db
    .select({
      viajeId: asignaciones.viajeId,
      total: sql<number>`count(*) filter (where ${cuentaParaCompletitud})`.mapWith(Number),
      completos:
        sql<number>`count(*) filter (where ${cuentaParaCompletitud} and ${pasosAlumno.estado} = 'completado')`.mapWith(
          Number
        ),
    })
    .from(asignaciones)
    .leftJoin(pasosAlumno, eq(pasosAlumno.asignacionId, asignaciones.id))
    .where(and(eq(asignaciones.estado, "activa"), inArray(asignaciones.viajeId, ids)))
    .groupBy(asignaciones.viajeId, asignaciones.id);

  const porViaje = new Map<string, { inscriptos: number; completos: number }>();
  for (const f of porAsignacion) {
    const acc = porViaje.get(f.viajeId) ?? { inscriptos: 0, completos: 0 };
    acc.inscriptos += 1;
    if (f.total > 0 && f.completos === f.total) acc.completos += 1;
    porViaje.set(f.viajeId, acc);
  }

  return base.map((v) => {
    const acc = porViaje.get(v.id) ?? { inscriptos: 0, completos: 0 };
    return {
      ...v,
      inscriptos: acc.inscriptos,
      completitudPct: acc.inscriptos
        ? Math.round((acc.completos / acc.inscriptos) * 100)
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
