import { Suspense } from "react";
import { notFound } from "next/navigation";

import { LinkButton, PageHeader, PanelSkeleton } from "@/components/ui";
import { getViajeByCodigo } from "@/lib/db/queries/viajes";

import {
  AlertasViajeSection,
  AsignacionesSection,
  GroupLeadersSection,
  PagosSection,
  PasosSection,
  ResumenViaje,
} from "./sections";
import { SubnavViaje, type SeccionViaje } from "./subnav-viaje";

export const metadata = { title: "Viaje" };

const SECCIONES: SeccionViaje[] = [
  { id: "alertas", label: "Alertas" },
  { id: "alumnos", label: "Alumnos" },
  { id: "group-leaders", label: "Group Leaders" },
  { id: "pagos", label: "Pagos" },
  { id: "seguimiento", label: "Seguimiento M7" },
];

/**
 * Destino de un ancla: deja lugar para el header mobile + la subnav sticky.
 * Es un <div> y no un <section> a propósito: los paneles ya son <section> y los
 * E2E los localizan con `locator("section").filter(...)`; envolverlos en otra
 * <section> haría que el filtro resuelva dos elementos.
 */
const ANCLA = "scroll-mt-[calc(8.5rem+var(--safe-top))] lg:scroll-mt-20";

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

      <Suspense fallback={<PanelSkeleton filas={3} />}>
        <ResumenViaje viaje={viaje} />
      </Suspense>

      <SubnavViaje secciones={SECCIONES} />

      <div id="alertas" className={ANCLA}>
        <Suspense fallback={<PanelSkeleton filas={2} />}>
          <AlertasViajeSection viaje={viaje} />
        </Suspense>
      </div>

      <div id="alumnos" className={ANCLA}>
        <Suspense fallback={<PanelSkeleton />}>
          <AsignacionesSection viaje={viaje} />
        </Suspense>
      </div>

      <div id="group-leaders" className={ANCLA}>
        <Suspense fallback={<PanelSkeleton filas={2} />}>
          <GroupLeadersSection viaje={viaje} />
        </Suspense>
      </div>

      <div id="pagos" className={ANCLA}>
        <Suspense fallback={<PanelSkeleton />}>
          <PagosSection viajeId={viaje.id} />
        </Suspense>
      </div>

      <div id="seguimiento" className={ANCLA}>
        <Suspense fallback={<PanelSkeleton filas={5} />}>
          <PasosSection viajeId={viaje.id} tipoViaje={viaje.tipo} />
        </Suspense>
      </div>
    </>
  );
}
