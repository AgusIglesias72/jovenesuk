import { notFound } from "next/navigation";

import { LinkButton, PageHeader, TripBadge } from "@/components/ui";
import {
  alumnosElegibles,
  countAsignacionesActivas,
  listAsignacionesByViaje,
} from "@/lib/db/queries/asignaciones";
import { getColegioById } from "@/lib/db/queries/colegios";
import { getViajeById } from "@/lib/db/queries/viajes";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import { VIAJE_ORIGEN_LABELS } from "@/lib/domain/viajes";
import { formatFecha } from "@/lib/utils/date";

import { AsignacionesPanel } from "./asignaciones-panel";

export const metadata = { title: "Viaje" };

export default async function ViajeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viaje = await getViajeById(id);
  if (!viaje) notFound();

  const [colegio, asignados, elegibles, cupoUsado] = await Promise.all([
    getColegioById(viaje.colegioDestinoId),
    listAsignacionesByViaje(id),
    alumnosElegibles(id),
    countAsignacionesActivas(id),
  ]);

  return (
    <>
      <PageHeader
        title={viaje.nombre}
        subtitle={viaje.codigo}
        actions={
          <LinkButton href={`/viajes/${id}/editar`} variant="secondary">
            Editar viaje
          </LinkButton>
        }
      />

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-4">
          <Dato label="Estado">
            <TripBadge state={viaje.estado} />
          </Dato>
          <Dato label="Fechas">
            {formatFecha(viaje.fechaInicio)} – {formatFecha(viaje.fechaFin)}
          </Dato>
          <Dato label="Destino">
            {colegio?.nombre ?? "—"} · {PAIS_LABELS[viaje.paisDestino]}
          </Dato>
          <Dato label="Curso">{viaje.curso}</Dato>
          <Dato label="Origen">{VIAJE_ORIGEN_LABELS[viaje.origen]}</Dato>
          <Dato label="Group Leaders">{viaje.cantidadGroupLeaders}</Dato>
          <Dato label="Cupo">
            {cupoUsado} / {viaje.capacidadMaxima}
          </Dato>
          <Dato label="Cupo mínimo">{viaje.capacidadMinima}</Dato>
        </dl>
      </section>

      <AsignacionesPanel
        viajeId={id}
        asignados={asignados}
        elegibles={elegibles.map((a) => ({ id: a.id, nombre: a.nombre, apellido: a.apellido }))}
        cupoMax={viaje.capacidadMaxima}
        cupoUsado={cupoUsado}
        viajeCancelado={viaje.estado === "cancelado"}
      />
    </>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-juk-navy-950">{children}</dd>
    </div>
  );
}
