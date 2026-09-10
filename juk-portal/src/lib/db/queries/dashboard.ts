import {
  and,
  asc,
  count,
  eq,
  exists,
  gt,
  inArray,
  lt,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { alumnos } from "@/lib/db/schema/alumnos";
import { asignaciones } from "@/lib/db/schema/asignaciones";
import { cuotas } from "@/lib/db/schema/cuotas";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import { colegios } from "@/lib/db/schema/colegios";
import { viajes, type Viaje } from "@/lib/db/schema/viajes";
import {
  calcularAlumnosUrgentes,
  type AlumnoConAccionUrgente,
  type PasoTrabadoParaAlerta,
} from "@/lib/domain/alertas";
import { diaCalendarioUTC } from "@/lib/utils/date";

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

export type AlumnosConAccionUrgente = {
  /** Los primeros `limit`, ya ordenados por urgencia. */
  items: AlumnoConAccionUrgente[];
  total: number;
};

const ESTADOS_VIAJE_ACTIVO: Viaje["estado"][] = ["inscripcion_abierta", "confirmado", "en_curso"];

/**
 * Alumnos con acción urgente (US-DX-03). SQL descarta a los alumnos que no
 * pueden tener ninguna alerta; las REGLAS (qué alerta, severidad, orden) las
 * decide domain/alertas, igual que en el panel de alertas. Dos round-trips:
 * candidatas (con su viaje) → pasos y cuotas en paralelo.
 */
export async function getAlumnosConAccionUrgente(
  opciones: { limit?: number; hoy?: Date } = {}
): Promise<AlumnosConAccionUrgente> {
  const limit = opciones.limit ?? 5;
  const hoy = opciones.hoy ?? new Date();
  // Mismo corte que getAlertas: la columna es `date` y lo que vence hoy no está en mora.
  const inicioDeHoy = new Date(diaCalendarioUTC(hoy));

  const pasoTrabado = db
    .select({ uno: sql`1` })
    .from(pasosAlumno)
    .where(
      and(
        eq(pasosAlumno.asignacionId, asignaciones.id),
        inArray(pasosAlumno.estado, ["bloqueado", "vencido"])
      )
    );
  const cuotaVencida = db
    .select({ uno: sql`1` })
    .from(cuotas)
    .where(
      and(
        eq(cuotas.asignacionId, asignaciones.id),
        ne(cuotas.estado, "pagada"),
        lt(cuotas.fechaVencimiento, inicioDeHoy)
      )
    );

  const candidatas = await db
    .select({
      asignacionId: asignaciones.id,
      viajeId: asignaciones.viajeId,
      viajeCodigo: viajes.codigo,
      viajeFechaInicio: viajes.fechaInicio,
      dni: alumnos.dni,
      nombre: alumnos.nombre,
      apellido: alumnos.apellido,
      vencimientoPasaporte: alumnos.fechaVencimientoPasaporte,
    })
    .from(asignaciones)
    .innerJoin(viajes, eq(asignaciones.viajeId, viajes.id))
    .innerJoin(alumnos, eq(asignaciones.alumnoId, alumnos.id))
    .where(
      and(
        eq(asignaciones.estado, "activa"),
        inArray(viajes.estado, ESTADOS_VIAJE_ACTIVO),
        or(
          exists(pasoTrabado),
          exists(cuotaVencida),
          // WHY 7 y no 6 meses: es solo un pre-filtro y tiene que ser SUPERCONJUNTO
          // de pasaporteEnAlertaConservadora. Postgres recorta fin de mes
          // (31/08 + 6 meses = 28/02) y el setUTCMonth del dominio desborda
          // (03/03): con 6 se perderían esos bordes.
          lt(alumnos.fechaVencimientoPasaporte, sql`${viajes.fechaInicio} + interval '7 months'`)
        )
      )
    );
  if (candidatas.length === 0) return { items: [], total: 0 };

  const ids = candidatas.map((c) => c.asignacionId);
  const [cuotasImpagas, pasos] = await Promise.all([
    db
      .select({
        asignacionId: cuotas.asignacionId,
        numero: cuotas.numero,
        estado: cuotas.estado,
        fechaVencimiento: cuotas.fechaVencimiento,
      })
      .from(cuotas)
      .where(
        and(
          inArray(cuotas.asignacionId, ids),
          ne(cuotas.estado, "pagada"),
          lt(cuotas.fechaVencimiento, inicioDeHoy)
        )
      ),
    db
      .select({
        asignacionId: pasosAlumno.asignacionId,
        codigo: pasosAlumno.codigo,
        estado: pasosAlumno.estado,
        notas: pasosAlumno.notas,
        metadata: pasosAlumno.metadata,
      })
      .from(pasosAlumno)
      .where(
        and(
          inArray(pasosAlumno.asignacionId, ids),
          inArray(pasosAlumno.estado, ["bloqueado", "vencido"])
        )
      ),
  ]);

  const viajesPorId = new Map(
    candidatas.map((c) => [
      c.viajeId,
      { id: c.viajeId, codigo: c.viajeCodigo, fechaInicio: c.viajeFechaInicio },
    ])
  );
  const pasosTrabados: PasoTrabadoParaAlerta[] = pasos.map((p) => ({
    ...p,
    estado: p.estado === "vencido" ? "vencido" : "bloqueado",
  }));

  const urgentes = calcularAlumnosUrgentes({
    viajes: [...viajesPorId.values()],
    asignaciones: candidatas,
    cuotasImpagas,
    pasosTrabados,
    hoy,
  });

  return { items: urgentes.slice(0, limit), total: urgentes.length };
}
