import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { cuotas } from "@/lib/db/schema/cuotas";
import { viajes } from "@/lib/db/schema/viajes";
import {
  resumenPlan,
  type Moneda,
  type ResumenPlan,
} from "@/lib/domain/cuotas";

/**
 * Vistas de pagos consolidadas: módulo global (/pagos) y sección Pagos del
 * detalle del viaje (US-24). Solo asignaciones activas.
 */

export type CuotaGlobalRow = {
  id: string;
  asignacionId: string;
  numero: number;
  esUltimaCuota: number;
  monto: string;
  moneda: string;
  estado: "pendiente" | "pagada" | "vencida";
  canal: "agencia" | "presencial";
  fechaVencimiento: Date;
  fechaPagoEfectivo: Date | null;
  observaciones: string | null;
  alumnoId: string;
  alumnoDni: string;
  alumnoNombre: string;
  alumnoApellido: string;
  viajeId: string;
  viajeCodigo: string;
  viajeNombre: string;
};

export async function listCuotasGlobal(filtros?: {
  viajeId?: string;
  moneda?: Moneda;
}): Promise<CuotaGlobalRow[]> {
  const where = [eq(asignaciones.estado, "activa")];
  if (filtros?.viajeId) where.push(eq(viajes.id, filtros.viajeId));
  if (filtros?.moneda) where.push(eq(cuotas.moneda, filtros.moneda));

  const rows = await db
    .select({
      id: cuotas.id,
      asignacionId: cuotas.asignacionId,
      numero: cuotas.numero,
      esUltimaCuota: cuotas.esUltimaCuota,
      monto: cuotas.monto,
      moneda: cuotas.moneda,
      estado: cuotas.estado,
      canal: cuotas.canal,
      fechaVencimiento: cuotas.fechaVencimiento,
      fechaPagoEfectivo: cuotas.fechaPagoEfectivo,
      observaciones: cuotas.observaciones,
      alumnoId: alumnos.id,
      alumnoDni: alumnos.dni,
      alumnoNombre: alumnos.nombre,
      alumnoApellido: alumnos.apellido,
      viajeId: viajes.id,
      viajeCodigo: viajes.codigo,
      viajeNombre: viajes.nombre,
    })
    .from(cuotas)
    .innerJoin(asignaciones, eq(cuotas.asignacionId, asignaciones.id))
    .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
    .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
    .where(and(...where))
    .orderBy(asc(cuotas.fechaVencimiento), asc(cuotas.numero));

  return rows as CuotaGlobalRow[];
}

/** Viajes que tienen al menos una cuota (para el filtro del módulo Pagos). */
export async function viajesConCuotas(): Promise<
  { id: string; codigo: string; nombre: string }[]
> {
  const rows = await db
    .selectDistinct({ id: viajes.id, codigo: viajes.codigo, nombre: viajes.nombre })
    .from(viajes)
    .innerJoin(asignaciones, eq(asignaciones.viajeId, viajes.id))
    .innerJoin(cuotas, eq(cuotas.asignacionId, asignaciones.id))
    .where(eq(asignaciones.estado, "activa"))
    .orderBy(asc(viajes.codigo));
  return rows;
}

export type ResumenPagosAlumnoViaje = ResumenPlan & {
  asignacionId: string;
  alumnoId: string;
  alumnoDni: string;
  nombre: string;
  apellido: string;
  moneda: string | null;
  tienePlan: boolean;
};

/**
 * US-24: resumen de pagos por alumno de un viaje (cuotas pagas/total, abonado,
 * saldo, mora). Los alumnos sin plan aparecen con tienePlan=false.
 */
export async function resumenPagosPorViaje(
  viajeId: string,
  hoy = new Date()
): Promise<ResumenPagosAlumnoViaje[]> {
  const rows = await db
    .select({
      asignacionId: asignaciones.id,
      alumnoId: alumnos.id,
      alumnoDni: alumnos.dni,
      nombre: alumnos.nombre,
      apellido: alumnos.apellido,
      cuotaId: cuotas.id,
      numero: cuotas.numero,
      esUltimaCuota: cuotas.esUltimaCuota,
      monto: cuotas.monto,
      moneda: cuotas.moneda,
      estado: cuotas.estado,
      canal: cuotas.canal,
      fechaVencimiento: cuotas.fechaVencimiento,
      fechaPagoEfectivo: cuotas.fechaPagoEfectivo,
    })
    .from(asignaciones)
    .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
    .leftJoin(cuotas, eq(cuotas.asignacionId, asignaciones.id))
    .where(and(eq(asignaciones.viajeId, viajeId), eq(asignaciones.estado, "activa")));

  const porAsignacion = new Map<
    string,
    { alumnoId: string; alumnoDni: string; nombre: string; apellido: string; cuotas: typeof rows }
  >();
  for (const r of rows) {
    const grupo = porAsignacion.get(r.asignacionId) ?? {
      alumnoId: r.alumnoId,
      alumnoDni: r.alumnoDni,
      nombre: r.nombre,
      apellido: r.apellido,
      cuotas: [],
    };
    if (r.cuotaId) grupo.cuotas.push(r);
    porAsignacion.set(r.asignacionId, grupo);
  }

  return Array.from(porAsignacion.entries()).map(([asignacionId, g]) => {
    const plan = g.cuotas.map((c) => ({
      numero: c.numero!,
      esUltimaCuota: c.esUltimaCuota!,
      monto: c.monto!,
      estado: c.estado!,
      canal: c.canal!,
      fechaVencimiento: c.fechaVencimiento!,
      fechaPagoEfectivo: c.fechaPagoEfectivo,
    }));
    return {
      asignacionId,
      alumnoId: g.alumnoId,
      alumnoDni: g.alumnoDni,
      nombre: g.nombre,
      apellido: g.apellido,
      moneda: g.cuotas[0]?.moneda ?? null,
      tienePlan: plan.length > 0,
      ...resumenPlan(plan, hoy),
    };
  });
}
