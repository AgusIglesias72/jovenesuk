import { Suspense } from "react";
import { notFound } from "next/navigation";

import { LinkButton, PageHeader } from "@/components/ui";
import { getViajeByCodigo } from "@/lib/db/queries/viajes";

import {
  AsignacionesSection,
  DatosViaje,
  GroupLeadersSection,
  PagosSection,
  PanelSkeleton,
  PasosSection,
} from "./sections";

export const metadata = { title: "Viaje" };

export default async function ViajeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Única query bloqueante: define el 404 y el título de la pantalla.
  const viaje = await getViajeByCodigo(id);
  if (!viaje) notFound();

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

      <Suspense fallback={<PanelSkeleton filas={2} />}>
        <DatosViaje viaje={viaje} />
      </Suspense>

      <Suspense fallback={<PanelSkeleton />}>
        <AsignacionesSection viaje={viaje} />
      </Suspense>

      <Suspense fallback={<PanelSkeleton filas={2} />}>
        <GroupLeadersSection viaje={viaje} />
      </Suspense>

      <Suspense fallback={<PanelSkeleton />}>
        <PagosSection viajeId={viaje.id} />
      </Suspense>

      <Suspense fallback={<PanelSkeleton filas={5} />}>
        <PasosSection viajeId={viaje.id} />
      </Suspense>
    </>
  );
}
