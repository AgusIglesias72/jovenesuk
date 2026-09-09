import { cache } from "react";

import { Skeleton, TripBadge } from "@/components/ui";
import {
  alumnosElegibles,
  listAsignacionesByViaje,
} from "@/lib/db/queries/asignaciones";
import { getColegioById } from "@/lib/db/queries/colegios";
import { groupLeadersElegibles } from "@/lib/db/queries/group-leaders-viaje";
import { resumenPagosPorViaje } from "@/lib/db/queries/pagos";
import { listGroupLeadersDeViaje, listOrInitPasosViaje } from "@/lib/db/queries/pasos-viaje";
import type { Viaje } from "@/lib/db/schema/viajes";
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

/**
 * Secciones del detalle de viaje. Cada una es un Server Component async con su
 * propio <Suspense> en la página: se streamean por separado en vez de esperar
 * todas a la query más lenta.
 *
 * Las lecturas compartidas entre secciones van envueltas en `cache()`: la
 * memoización es por request, así que el roster o los GL se piden UNA vez
 * aunque los usen dos paneles.
 */
const asignadosDe = cache(listAsignacionesByViaje);
const groupLeadersDe = cache(listGroupLeadersDeViaje);

/** Placeholder de panel mientras streamea. Fase 4 lo lleva al design system. */
export function PanelSkeleton({ filas = 4 }: { filas?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando…"
      className="mb-8 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5"
    >
      <Skeleton className="h-5 w-48" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: filas }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
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

export async function DatosViaje({ viaje }: { viaje: Viaje }) {
  const [colegio, asignados] = await Promise.all([
    getColegioById(viaje.colegioDestinoId),
    asignadosDe(viaje.id),
  ]);

  return (
    <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 md:grid-cols-4">
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
          {asignados.length} / {viaje.capacidadMaxima}
        </Dato>
        <Dato label="Cupo mínimo">{viaje.capacidadMinima}</Dato>
      </dl>
    </section>
  );
}

export async function AsignacionesSection({ viaje }: { viaje: Viaje }) {
  const [asignados, elegibles] = await Promise.all([
    asignadosDe(viaje.id),
    alumnosElegibles(viaje.id),
  ]);

  return (
    <AsignacionesPanel
      viajeId={viaje.id}
      asignados={asignados}
      elegibles={elegibles}
      cupoMax={viaje.capacidadMaxima}
      cupoUsado={asignados.length}
      viajeCancelado={viaje.estado === "cancelado"}
    />
  );
}

export async function GroupLeadersSection({ viaje }: { viaje: Viaje }) {
  const [asignados, elegibles] = await Promise.all([
    groupLeadersDe(viaje.id),
    groupLeadersElegibles(viaje.id),
  ]);

  return (
    <GroupLeadersPanel
      viajeId={viaje.id}
      asignados={asignados}
      elegibles={elegibles}
      viajeCancelado={viaje.estado === "cancelado"}
    />
  );
}

export async function PagosSection({ viajeId }: { viajeId: string }) {
  return <PagosViajePanel rows={await resumenPagosPorViaje(viajeId)} />;
}

export async function PasosSection({ viajeId }: { viajeId: string }) {
  const [pasosRows, glsViaje, asignados] = await Promise.all([
    listOrInitPasosViaje(viajeId),
    groupLeadersDe(viajeId),
    asignadosDe(viajeId),
  ]);

  const policeGLs: PoliceGLView[] = glsViaje.map((g) => ({
    groupLeaderId: g.groupLeaderId,
    nombre: g.nombre,
    apellido: g.apellido,
    esPrincipal: g.esPrincipal,
    estado: g.policeCheckEstado,
    fechaVencimiento: g.policeCheckFechaVencimiento,
  }));

  const pasos: PasoView[] = PASO_VIAJE_TIPOS.map((tipo) => {
    const row = pasosRows.find((p) => p.tipo === tipo);
    return {
      tipo,
      estado: (row?.estado ?? "pendiente") as PasoViajeEstado,
      metadata: row?.metadata ?? {},
    };
  });

  return (
    <PasosViajePanel
      viajeId={viajeId}
      pasos={pasos}
      policeEstado={derivarEstadoPoliceChecks(policeGLs)}
      policeGLs={policeGLs}
      roster={asignados
        .filter((a) => a.estado === "activa")
        .map((a) => ({
          asignacionId: a.asignacionId,
          nombre: a.alumno.nombre,
          apellido: a.alumno.apellido,
        }))}
    />
  );
}
