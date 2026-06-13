import { notFound } from "next/navigation";

import { LinkButton, PageHeader, TripBadge } from "@/components/ui";
import {
  alumnosElegibles,
  countAsignacionesActivas,
  listAsignacionesByViaje,
} from "@/lib/db/queries/asignaciones";
import { getColegioById } from "@/lib/db/queries/colegios";
import { groupLeadersElegibles } from "@/lib/db/queries/group-leaders-viaje";
import { resumenPagosPorViaje } from "@/lib/db/queries/pagos";
import { listGroupLeadersDeViaje, listOrInitPasosViaje } from "@/lib/db/queries/pasos-viaje";
import { getViajeByCodigo } from "@/lib/db/queries/viajes";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import {
  PASO_VIAJE_TIPOS,
  derivarEstadoPoliceChecks,
  type PasoViajeEstado,
} from "@/lib/domain/pasos-viaje";
import { VIAJE_ORIGEN_LABELS } from "@/lib/domain/viajes";
import { formatFecha } from "@/lib/utils/date";

import { AsignacionesPanel } from "./asignaciones-panel";
import { GroupLeadersPanel } from "./group-leaders-panel";
import { PagosViajePanel } from "./pagos-viaje-panel";
import { PasosViajePanel, type PasoView, type PoliceGLView } from "./pasos-viaje-panel";

export const metadata = { title: "Viaje" };

export default async function ViajeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viaje = await getViajeByCodigo(id);
  if (!viaje) notFound();

  const [colegio, asignados, elegibles, cupoUsado, pasosRows, glsViaje, glsElegibles, pagos] =
    await Promise.all([
      getColegioById(viaje.colegioDestinoId),
      listAsignacionesByViaje(viaje.id),
      alumnosElegibles(viaje.id),
      countAsignacionesActivas(viaje.id),
      listOrInitPasosViaje(viaje.id),
      listGroupLeadersDeViaje(viaje.id),
      groupLeadersElegibles(viaje.id),
      resumenPagosPorViaje(viaje.id),
    ]);

  const policeGLs: PoliceGLView[] = glsViaje.map((g) => ({
    groupLeaderId: g.groupLeaderId,
    nombre: g.nombre,
    apellido: g.apellido,
    esPrincipal: g.esPrincipal,
    estado: g.policeCheckEstado,
    fechaVencimiento: g.policeCheckFechaVencimiento,
  }));
  const policeEstado = derivarEstadoPoliceChecks(policeGLs);

  const pasosView: PasoView[] = PASO_VIAJE_TIPOS.map((tipo) => {
    const row = pasosRows.find((p) => p.tipo === tipo);
    return {
      tipo,
      estado: (row?.estado ?? "pendiente") as PasoViajeEstado,
      metadata: row?.metadata ?? {},
    };
  });

  return (
    <>
      <PageHeader
        title={viaje.nombre}
        subtitle={viaje.codigo}
        actions={
          <LinkButton href={`/viajes/${viaje.codigo}/editar`} variant="secondary">
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
        viajeId={viaje.id}
        asignados={asignados}
        elegibles={elegibles.map((a) => ({ id: a.id, nombre: a.nombre, apellido: a.apellido }))}
        cupoMax={viaje.capacidadMaxima}
        cupoUsado={cupoUsado}
        viajeCancelado={viaje.estado === "cancelado"}
      />

      <GroupLeadersPanel
        viajeId={viaje.id}
        asignados={glsViaje}
        elegibles={glsElegibles.map((g) => ({ id: g.id, nombre: g.nombre, apellido: g.apellido }))}
        viajeCancelado={viaje.estado === "cancelado"}
      />

      <PagosViajePanel rows={pagos} />

      <PasosViajePanel
        viajeId={viaje.id}
        pasos={pasosView}
        policeEstado={policeEstado}
        policeGLs={policeGLs}
        roster={asignados
          .filter((a) => a.estado === "activa")
          .map((a) => ({
            asignacionId: a.asignacionId,
            nombre: a.alumno.nombre,
            apellido: a.alumno.apellido,
          }))}
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
