import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { cuotas, type Cuota } from "@/lib/db/schema/cuotas";
import { pasosAlumno } from "@/lib/db/schema/pasos-alumno";
import {
  CuotaNotFoundError,
  PlanConPagosError,
  b2Completado,
  canalCuota,
  estadoPasoB1,
  generarVencimientos,
  type Moneda,
} from "@/lib/domain/cuotas";
import type { ViajeOrigen } from "@/lib/domain/viajes";

export async function listCuotasByAsignacion(asignacionId: string): Promise<Cuota[]> {
  return db
    .select()
    .from(cuotas)
    .where(eq(cuotas.asignacionId, asignacionId))
    .orderBy(cuotas.numero);
}

/**
 * Cuotas de varias asignaciones en un solo round-trip, ordenadas por número (el
 * llamador agrupa por `asignacionId` con `agruparPor` y conserva ese orden).
 * Con neon-http, pedir el plan por asignación en un loop es N saltos HTTPS.
 */
export async function listCuotasByAsignaciones(asignacionIds: string[]): Promise<Cuota[]> {
  if (asignacionIds.length === 0) return [];
  return db
    .select()
    .from(cuotas)
    .where(inArray(cuotas.asignacionId, asignacionIds))
    .orderBy(cuotas.numero);
}

export async function getCuotaById(id: string): Promise<Cuota | null> {
  const rows = await db.select().from(cuotas).where(eq(cuotas.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Advertencia confirmable: registrar un pago con cuotas anteriores impagas
 * suele ser un click equivocado (las familias pagan en orden). Devuelve el
 * texto de la advertencia, o null si no aplica.
 */
export async function advertenciaPagoFueraDeOrden(cuotaId: string): Promise<string | null> {
  const cuota = await getCuotaById(cuotaId);
  if (!cuota || cuota.estado === "pagada") return null;
  const plan = await listCuotasByAsignacion(cuota.asignacionId);
  const anteriores = plan.filter((c) => c.numero < cuota.numero && c.estado !== "pagada");
  if (anteriores.length === 0) return null;
  const nums = anteriores.map((c) => c.numero).join(", ");
  return `Atención: hay ${
    anteriores.length === 1 ? "una cuota anterior impaga" : "cuotas anteriores impagas"
  } (n° ${nums}). ¿Registrar este pago igual?`;
}

/**
 * Crea (o regenera) el plan de cuotas de una asignación. Si ya hay pagos
 * registrados, no se pisa nada (PlanConPagosError). El canal de cada cuota se
 * deriva del tipo de representante (ex CRIT-01).
 */
export async function crearPlanCuotas(opts: {
  asignacionId: string;
  cantidadCuotas: number;
  montoPorCuota: number;
  moneda: Moneda;
  primerVencimiento: Date;
  origenViaje: ViajeOrigen;
  registradoPor: string;
}): Promise<Cuota[]> {
  const existentes = await listCuotasByAsignacion(opts.asignacionId);
  if (existentes.some((c) => c.estado === "pagada")) throw new PlanConPagosError();
  if (existentes.length > 0) {
    await db.delete(cuotas).where(eq(cuotas.asignacionId, opts.asignacionId));
  }

  const vencimientos = generarVencimientos(opts.primerVencimiento, opts.cantidadCuotas);
  const rows = await db
    .insert(cuotas)
    .values(
      vencimientos.map((fechaVencimiento, i) => {
        const esUltima = i === opts.cantidadCuotas - 1;
        return {
          asignacionId: opts.asignacionId,
          numero: i + 1,
          esUltimaCuota: esUltima ? 1 : 0,
          monto: opts.montoPorCuota.toFixed(2),
          moneda: opts.moneda,
          fechaVencimiento,
          canal: canalCuota(opts.origenViaje, esUltima),
          registradoPor: opts.registradoPor,
        };
      })
    )
    .returning();
  return rows;
}

export async function registrarPagoCuota(opts: {
  cuotaId: string;
  observaciones?: string;
  registradoPor: string;
  /** B2: confirma la recepción presencial (fuerza canal presencial). */
  canalPresencial?: boolean;
}): Promise<Cuota> {
  const rows = await db
    .update(cuotas)
    .set({
      estado: "pagada",
      fechaPagoEfectivo: new Date(),
      ...(opts.canalPresencial ? { canal: "presencial" as const } : {}),
      ...(opts.observaciones ? { observaciones: opts.observaciones } : {}),
      registradoPor: opts.registradoPor,
      updatedAt: new Date(),
    })
    .where(eq(cuotas.id, opts.cuotaId))
    .returning();
  const row = rows[0];
  if (!row) throw new CuotaNotFoundError(opts.cuotaId);
  return row;
}

/**
 * Sincroniza los pasos B1/B2 del tablero con el plan de cuotas, y destraba C2
 * cuando B1 queda completado (la única dependencia del tablero).
 */
export async function sincronizarPasosPago(
  asignacionId: string,
  updatedBy: string
): Promise<void> {
  const plan = await listCuotasByAsignacion(asignacionId);
  const pagadas = plan.filter((c) => c.estado === "pagada").length;
  const b1 = estadoPasoB1(plan);

  await db
    .update(pasosAlumno)
    .set({
      estado: b1,
      metadata: { cuotasPagadas: pagadas, cuotasTotales: plan.length },
      fechaCompletado: b1 === "completado" ? new Date() : null,
      updatedAt: new Date(),
      updatedBy,
    })
    .where(and(eq(pasosAlumno.asignacionId, asignacionId), eq(pasosAlumno.codigo, "b1")));

  // C2 nace bloqueado por B1: al completarse B1 pasa a pendiente; si B1 se
  // reabre (pago revertido a futuro), C2 vuelve a bloquearse solo si no avanzó.
  if (b1 === "completado") {
    const c2Rows = await db
      .select()
      .from(pasosAlumno)
      .where(
        and(
          eq(pasosAlumno.asignacionId, asignacionId),
          eq(pasosAlumno.codigo, "c2"),
          eq(pasosAlumno.estado, "bloqueado")
        )
      );
    const c2 = c2Rows[0];
    if (c2) {
      // Se quita SOLO el marcador estructural: lo demás (archivoUrl de un
      // documento subido mientras estaba bloqueado, etc.) se preserva.
      const { bloqueadoPor: _bloqueadoPor, ...resto } = c2.metadata as Record<string, unknown>;
      await db
        .update(pasosAlumno)
        .set({ estado: "pendiente", metadata: resto, updatedAt: new Date(), updatedBy })
        .where(eq(pasosAlumno.id, c2.id));
    }
  }

  // B2 (si no es N/A): completado cuando la última cuota está pagada presencial.
  const b2 = b2Completado(plan);
  await db
    .update(pasosAlumno)
    .set({
      estado: b2 ? "completado" : "pendiente",
      fechaCompletado: b2 ? new Date() : null,
      updatedAt: new Date(),
      updatedBy,
    })
    .where(
      and(
        eq(pasosAlumno.asignacionId, asignacionId),
        eq(pasosAlumno.codigo, "b2"),
        ne(pasosAlumno.estado, "na")
      )
    );
}
