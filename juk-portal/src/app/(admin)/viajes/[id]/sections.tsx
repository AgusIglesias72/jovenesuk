import Link from "next/link";
import { cache } from "react";

import { BarraProgreso, tonoOcupacion } from "@/app/(admin)/viajes/barra-progreso";
import { SectionTitle, TripBadge } from "@/components/ui";
import { getAlertas, viajeTieneAlertas, type Alerta } from "@/lib/db/queries/alertas";
import {
  alumnosElegibles,
  listAsignacionesByViaje,
} from "@/lib/db/queries/asignaciones";
import { getColegioById } from "@/lib/db/queries/colegios";
import { groupLeadersElegibles } from "@/lib/db/queries/group-leaders-viaje";
import { resumenPagosPorViaje } from "@/lib/db/queries/pagos";
import { listGroupLeadersDeViaje, listOrInitPasosViaje } from "@/lib/db/queries/pasos-viaje";
import { completitudPorViaje } from "@/lib/db/queries/viajes";
import type { Viaje } from "@/lib/db/schema/viajes";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import {
  PASO_VIAJE_TIPOS,
  derivarEstadoPoliceChecks,
  type PasoViajeEstado,
} from "@/lib/domain/pasos-viaje";
import {
  VIAJE_ORIGEN_LABELS,
  VIAJE_TIPO_LABELS,
  ocupacionViaje,
  porcentaje,
} from "@/lib/domain/viajes";
import { cn } from "@/lib/utils/cn";
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

const CARD =
  "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)]";

const NOTA = cn(
  CARD,
  "px-4 py-3 text-[length:var(--t-small)] text-[var(--c-ink-muted)] shadow-none"
);

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <SectionTitle as="dt">{label}</SectionTitle>
      <dd className="mt-1 font-medium text-[var(--c-ink)]">{children}</dd>
    </div>
  );
}

function Indicador({
  titulo,
  valor,
  detalle,
  children,
}: {
  titulo: string;
  valor: string;
  detalle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)]">
          {titulo}
        </span>
        <span className="font-display text-[length:var(--t-h3)] font-bold tabular-nums text-[var(--c-ink)]">
          {valor}
        </span>
      </div>
      <div className="mt-2">{children}</div>
      <p className="mt-1.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{detalle}</p>
    </div>
  );
}

/** Header del detalle: ocupación y avance de trámites arriba, datos del viaje abajo. */
export async function ResumenViaje({ viaje }: { viaje: Viaje }) {
  const [colegio, asignados, completitud] = await Promise.all([
    getColegioById(viaje.colegioDestinoId),
    asignadosDe(viaje.id),
    completitudPorViaje([viaje.id]),
  ]);

  const ocupacion = ocupacionViaje({ ...viaje, inscriptos: asignados.length });
  const tramites = completitud.get(viaje.id) ?? { inscriptos: 0, completos: 0 };
  const tramitesPct = porcentaje(tramites.completos, tramites.inscriptos);

  return (
    <section aria-label="Resumen del viaje" className={cn(CARD, "mb-6 p-5")}>
      <div className="grid gap-6 md:grid-cols-2">
        <Indicador
          titulo="Inscriptos"
          valor={`${asignados.length} / ${viaje.capacidadMaxima}`}
          detalle={
            <>
              {ocupacion.sobreCupo > 0 ? (
                <span className="font-semibold text-[var(--c-berry)]">
                  {ocupacion.sobreCupo} por encima del cupo
                </span>
              ) : (
                <span>
                  {ocupacion.vacantes === 1 ? "1 vacante" : `${ocupacion.vacantes} vacantes`}
                </span>
              )}
              {ocupacion.faltanParaMinimo > 0 && (
                <span>
                  {" · "}faltan {ocupacion.faltanParaMinimo} para el mínimo de{" "}
                  {viaje.capacidadMinima}
                </span>
              )}
            </>
          }
        >
          <BarraProgreso
            pct={ocupacion.pct}
            tono={tonoOcupacion(ocupacion)}
            label="Ocupación del cupo"
          />
        </Indicador>

        <Indicador
          titulo="Trámites completos"
          valor={`${tramitesPct}%`}
          detalle={
            tramites.inscriptos === 0
              ? "Sin alumnos con tablero de seguimiento todavía."
              : `${tramites.completos} de ${tramites.inscriptos} ${
                  tramites.inscriptos === 1 ? "alumno tiene" : "alumnos tienen"
                } todos sus pasos completos.`
          }
        >
          <BarraProgreso pct={tramitesPct} label="Trámites completos" />
        </Indicador>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-[var(--c-border)] pt-5 text-[length:var(--t-small)] sm:grid-cols-2 md:grid-cols-4">
        <Dato label="Estado">
          <TripBadge state={viaje.estado} />
        </Dato>
        <Dato label="Fechas">
          <span className="font-mono tabular-nums">
            {formatFecha(viaje.fechaInicio)} – {formatFecha(viaje.fechaFin)}
          </span>
        </Dato>
        <Dato label="Destino">
          {colegio?.nombre ?? "—"} · {PAIS_LABELS[viaje.paisDestino]}
        </Dato>
        <Dato label="Tipo">{VIAJE_TIPO_LABELS[viaje.tipo]}</Dato>
        <Dato label="Curso">{viaje.curso}</Dato>
        <Dato label="Origen">{VIAJE_ORIGEN_LABELS[viaje.origen]}</Dato>
        <Dato label="Group Leaders">{viaje.cantidadGroupLeaders}</Dato>
        <Dato label="Cupo mínimo">{viaje.capacidadMinima}</Dato>
      </dl>
    </section>
  );
}

/** Las primeras N quedan a la vista; el resto, plegado para no tapar el roster. */
const ALERTAS_VISIBLES = 5;

function FilaAlerta({ alerta }: { alerta: Alerta }) {
  const critica = alerta.severidad === "critica";
  return (
    <li>
      <Link
        href={alerta.href}
        className={cn(
          "flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--r-md)] border px-4 py-3 transition-shadow duration-150 hover:shadow-[shadow:var(--shadow-1)] focus-visible:outline-none focus-visible:shadow-[shadow:var(--ring-focus)]",
          critica
            ? "border-[var(--c-danger)] bg-[var(--c-danger-bg)]"
            : "border-[var(--c-warning)] bg-[var(--c-warning-bg)]"
        )}
      >
        <span
          className={cn(
            "rounded-[var(--r-pill)] px-2 py-0.5 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-surface)]",
            critica ? "bg-[var(--c-danger)]" : "bg-[var(--c-warning)]"
          )}
        >
          {critica ? "Crítica" : "Alta"}
        </span>
        <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
          {alerta.titulo}
        </span>
        <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          {alerta.detalle}
        </span>
      </Link>
    </li>
  );
}

/** Alertas propias del viaje (mismas reglas que el panel del dashboard, M2). */
export async function AlertasViajeSection({ viaje }: { viaje: Viaje }) {
  const seCalculan = viajeTieneAlertas(viaje.estado);
  const alertas = seCalculan ? await getAlertas({ viajeId: viaje.id }) : [];
  const criticas = alertas.filter((a) => a.severidad === "critica").length;
  const altas = alertas.length - criticas;
  const visibles = alertas.slice(0, ALERTAS_VISIBLES);
  const resto = alertas.slice(ALERTAS_VISIBLES);

  return (
    <section aria-labelledby="alertas-del-viaje" className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle id="alertas-del-viaje">Alertas del viaje</SectionTitle>
        {alertas.length > 0 && (
          <span className="font-mono text-[length:var(--t-small)] tabular-nums text-[var(--c-ink-muted)]">
            {criticas} {criticas === 1 ? "crítica" : "críticas"} · {altas}{" "}
            {altas === 1 ? "alta" : "altas"}
          </span>
        )}
      </div>

      {!seCalculan ? (
        <p className={NOTA}>
          Las alertas se calculan para viajes con inscripción abierta, confirmados o en curso.
        </p>
      ) : alertas.length === 0 ? (
        <p className={NOTA}>Sin alertas: pasaportes, cuotas, pasos y police checks al día.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {visibles.map((a, i) => (
              <FilaAlerta key={`${a.href}-${i}`} alerta={a} />
            ))}
          </ul>
          {resto.length > 0 && (
            <details className="group mt-2">
              <summary className="inline-flex min-h-[var(--tap)] cursor-pointer list-none items-center rounded-[var(--r-pill)] px-3 text-[length:var(--t-small)] font-semibold text-[var(--c-brand)] hover:bg-[var(--c-surface-2)] focus-visible:outline-none focus-visible:shadow-[shadow:var(--ring-focus)]">
                <span className="group-open:hidden">
                  {resto.length === 1 ? "Ver 1 alerta más" : `Ver ${resto.length} alertas más`}
                </span>
                <span className="hidden group-open:inline">Ocultar</span>
              </summary>
              <ul className="mt-2 space-y-2">
                {resto.map((a, i) => (
                  <FilaAlerta key={`${a.href}-resto-${i}`} alerta={a} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
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

export async function PasosSection({
  viajeId,
  tipoViaje,
}: {
  viajeId: string;
  tipoViaje: "grupal" | "individual";
}) {
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
      tipoViaje={tipoViaje}
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
