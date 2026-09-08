import { registrarAuditoria } from "@/lib/db/queries/auditoria";
import { listViajesPorEstado, setViajeEstado } from "@/lib/db/queries/viajes";
import { transicionAutomaticaPorFecha } from "@/lib/domain/viajes";

/**
 * Transiciones automáticas del ciclo de vida del viaje (US-13):
 * Confirmado → En curso en la fecha de inicio · En curso → Finalizado pasada
 * la fecha de fin. Corre a diario junto con el scan de recordatorios.
 */
export async function transicionarViajesPorFecha(
  hoy = new Date()
): Promise<{ enCurso: number; finalizados: number }> {
  const candidatos = await listViajesPorEstado(["confirmado", "en_curso"]);

  let enCurso = 0;
  let finalizados = 0;
  for (const v of candidatos) {
    const nuevo = transicionAutomaticaPorFecha(v.estado, v.fechaInicio, v.fechaFin, hoy);
    if (!nuevo) continue;
    await setViajeEstado(v.id, nuevo);
    await registrarAuditoria({
      accion: "cambio_estado_viaje",
      entidadTipo: "viaje",
      entidadId: v.id,
      usuarioId: null,
      metadata: { estadoAnterior: v.estado, estado: nuevo, motivo: "auto_fecha" },
    });
    if (nuevo === "en_curso") enCurso += 1;
    else finalizados += 1;
  }
  return { enCurso, finalizados };
}
