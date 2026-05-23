import { asc, count, eq, notInArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
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
