import { listCuotasByAsignaciones } from "@/lib/db/queries/cuotas";
import { estaVencida } from "@/lib/domain/cuotas";
import { agruparPor } from "@/lib/utils/agrupar";

import { cargarAlumnoFamilia, asignacionesActivas } from "../_data";
import { EstadoVacio, FamiliaPageHeader } from "../../_ui";
import { PagosDetalle } from "./pagos-detalle";

export const metadata = { title: "Pagos · JUK" };

export default async function PagosPage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const activas = await asignacionesActivas(alumno.id);

  if (activas.length === 0) {
    return (
      <div className="space-y-6">
        <FamiliaPageHeader title="Pagos" />
        <EstadoVacio>Vas a ver el plan de pagos cuando estés asignado a un viaje.</EstadoVacio>
      </div>
    );
  }

  const todasLasCuotas = await listCuotasByAsignaciones(activas.map((a) => a.asignacionId));
  const cuotasPorAsignacion = agruparPor(todasLasCuotas, (c) => c.asignacionId);
  const viajes = activas.map((a) => ({
    asignacionId: a.asignacionId,
    viajeNombre: a.viajeNombre,
    viajeCodigo: a.viajeCodigo,
    cuotas: cuotasPorAsignacion.get(a.asignacionId) ?? [],
  }));

  const hoy = new Date();
  const cantVencidas = viajes.reduce((acc, v) => acc + v.cuotas.filter((c) => estaVencida(c, hoy)).length, 0);

  return (
    <div className="space-y-6">
      <FamiliaPageHeader
        title="Pagos"
        subtitle="Estado de cada cuota de tu plan. Los pagos los registra JUK; este panel es informativo (no se paga desde acá)."
      />

      {cantVencidas > 0 && (
        <div
          role="status"
          className="rounded-[var(--r-lg)] border border-[var(--c-danger)] bg-[var(--c-danger-bg)] px-4 py-3 text-[length:var(--t-small)] font-medium text-[var(--c-danger)]"
        >
          {cantVencidas === 1
            ? "Tenés una cuota vencida. Regularizá tu situación para asegurar el viaje."
            : `Tenés ${cantVencidas} cuotas vencidas. Regularizá tu situación para asegurar el viaje.`}
        </div>
      )}

      <PagosDetalle viajes={viajes} />
    </div>
  );
}
