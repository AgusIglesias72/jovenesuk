import { and, asc, count, eq, gte, lt, ne, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { cuotas } from "@/lib/db/schema/cuotas";
import { viajes } from "@/lib/db/schema/viajes";
import {
  MONEDAS,
  resumenPlan,
  type Moneda,
  type ResumenPlan,
} from "@/lib/domain/cuotas";
import {
  paginarEnSql,
  totalDe,
  type Pagina,
  type Paginado,
} from "@/lib/utils/paginate";

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

export type EstadoEfectivo = "pagada" | "vencida" | "pendiente";

export type FiltrosPagos = {
  viajeId?: string;
  moneda?: Moneda;
  estado?: EstadoEfectivo;
};

/**
 * `estadoEfectivoCuota` (domain/cuotas) expresado en SQL para poder filtrar y
 * agregar sin traerse la tabla. `fechaVencimiento` es una columna `date` y
 * drizzle serializa `hoy` como su día UTC, así que la comparación es por día
 * calendario UTC igual que `estaVencida`.
 */
export function condicionesEstadoEfectivo(estado: EstadoEfectivo, hoy: Date): SQL[] {
  if (estado === "pagada") return [eq(cuotas.estado, "pagada")];

  const impaga = ne(cuotas.estado, "pagada");
  return estado === "vencida"
    ? [impaga, lt(cuotas.fechaVencimiento, hoy)]
    : [impaga, gte(cuotas.fechaVencimiento, hoy)];
}

function condicionesPagos(filtros: FiltrosPagos, hoy: Date): SQL[] {
  const where: SQL[] = [eq(asignaciones.estado, "activa")];
  if (filtros.viajeId) where.push(eq(viajes.id, filtros.viajeId));
  if (filtros.moneda) where.push(eq(cuotas.moneda, filtros.moneda));
  if (filtros.estado) where.push(...condicionesEstadoEfectivo(filtros.estado, hoy));
  return where;
}

export async function listCuotasGlobal(
  filtros: FiltrosPagos,
  pagina: Pagina,
  hoy = new Date()
): Promise<Paginado<CuotaGlobalRow>> {
  const where = and(...condicionesPagos(filtros, hoy));

  return paginarEnSql(
    pagina,
    async (limit, offset) => {
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
        .where(where)
        // El id desempata: todo el viaje comparte vencimiento y número de
        // cuota, y un ORDER BY no total con LIMIT/OFFSET repite y saltea
        // filas entre páginas.
        .orderBy(asc(cuotas.fechaVencimiento), asc(cuotas.numero), asc(cuotas.id))
        .limit(limit)
        .offset(offset);
      return rows as CuotaGlobalRow[];
    },
    () =>
      db
        .select({ n: count() })
        .from(cuotas)
        .innerJoin(asignaciones, eq(cuotas.asignacionId, asignaciones.id))
        .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
        .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
        .where(where)
        .then(totalDe)
  );
}

export type ResumenMoneda = {
  moneda: Moneda;
  cobrado: number;
  pendiente: number;
  enMora: number;
};

/**
 * Totales de las StatCards del módulo Pagos: se agregan en la DB sobre el
 * universo filtrado por viaje/moneda (nunca por estado, igual que antes), así
 * la tabla puede paginarse sin falsear el resumen.
 */
export async function resumenPagosGlobal(
  filtros: Omit<FiltrosPagos, "estado">,
  hoy = new Date()
): Promise<{ porMoneda: ResumenMoneda[]; cuotasEnMora: number }> {
  const pagada = eq(cuotas.estado, "pagada");
  const impaga = ne(cuotas.estado, "pagada");
  const vencida = and(...condicionesEstadoEfectivo("vencida", hoy));

  const filas = await db
    .select({
      moneda: cuotas.moneda,
      cobrado: sql<string>`coalesce(sum(${cuotas.monto}) filter (where ${pagada}), 0)`,
      pendiente: sql<string>`coalesce(sum(${cuotas.monto}) filter (where ${impaga}), 0)`,
      enMora: sql<string>`coalesce(sum(${cuotas.monto}) filter (where ${vencida}), 0)`,
      cuotasEnMora: sql<string | number>`count(*) filter (where ${vencida})`,
    })
    .from(cuotas)
    .innerJoin(asignaciones, eq(cuotas.asignacionId, asignaciones.id))
    .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
    .where(and(...condicionesPagos(filtros, hoy)))
    .groupBy(cuotas.moneda);

  const porMonedaMap = new Map(filas.map((f) => [f.moneda, f]));

  return {
    porMoneda: MONEDAS.flatMap((moneda) => {
      const fila = porMonedaMap.get(moneda);
      if (!fila) return [];
      return [
        {
          moneda,
          cobrado: Number(fila.cobrado),
          pendiente: Number(fila.pendiente),
          enMora: Number(fila.enMora),
        },
      ];
    }),
    cuotasEnMora: filas.reduce((acc, f) => acc + Number(f.cuotasEnMora), 0),
  };
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
