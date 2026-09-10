import { agruparPor } from "@/lib/utils/agrupar";

import { asignacionesActivas, cargarAlumnoFamilia, cuotasActivas } from "../_data";
import { EstadoVacio, FamiliaPageHeader } from "../../_ui";
import { PagosDetalle } from "./pagos-detalle";

export const metadata = { title: "Pagos · JUK" };

/*
 * El aviso de cuota vencida NO se repite acá: lo pinta el shell en todas las
 * pantallas menos esta, donde el propio listado ya marca cada cuota vencida.
 */
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

  const todasLasCuotas = await cuotasActivas(alumno.id);
  const cuotasPorAsignacion = agruparPor(todasLasCuotas, (c) => c.asignacionId);
  const viajes = activas.map((a) => ({
    asignacionId: a.asignacionId,
    viajeNombre: a.viajeNombre,
    viajeCodigo: a.viajeCodigo,
    cuotas: cuotasPorAsignacion.get(a.asignacionId) ?? [],
  }));

  return (
    <div className="space-y-6">
      <FamiliaPageHeader
        title="Pagos"
        subtitle="Estado de cada cuota de tu plan. Los pagos los registramos nosotros cuando nos llegan; desde acá no se paga, es para que siempre sepas cómo venís."
      />

      <PagosDetalle viajes={viajes} />
    </div>
  );
}
