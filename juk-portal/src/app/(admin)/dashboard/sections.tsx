import Link from "next/link";

import { Alert, Skeleton, StatCard, TripCard } from "@/components/ui";
import { countAlumnosEnMora, getAlertas } from "@/lib/db/queries/alertas";
import {
  getDashboardStats,
  getProximosViajesConOcupacion,
  getViajesProximoAnio,
} from "@/lib/db/queries/dashboard";
import { formatFecha } from "@/lib/utils/date";

/**
 * Secciones del dashboard como server components independientes: cada una
 * espera solo sus propias queries (streaming con <Suspense> desde page.tsx),
 * así el header y las stats no quedan detrás de las alertas.
 */

const TITULO_SECCION = "font-semibold text-sm uppercase tracking-wide text-gray-600 mb-3";

export function StatsFallback() {
  return (
    <section
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      role="status"
      aria-label="Cargando indicadores…"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[92px] w-full" />
      ))}
    </section>
  );
}

export async function StatsSection() {
  const [stats, enMora] = await Promise.all([getDashboardStats(), countAlumnosEnMora()]);

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard label="Alumnos" value={stats.alumnos} />
      <StatCard label="Viajes confirmados" value={stats.viajesConfirmados} />
      <StatCard label="Viajando ahora" value={stats.viajando} />
      <StatCard
        label="Alumnos en mora"
        value={enMora}
        tone={enMora > 0 ? "critical" : undefined}
      />
    </section>
  );
}

export function AlertasFallback() {
  return (
    <section className="mb-8" role="status" aria-label="Cargando alertas…">
      <h2 className={TITULO_SECCION}>Alertas</h2>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] w-full" />
        ))}
      </div>
    </section>
  );
}

export async function AlertasSection() {
  const alertas = await getAlertas();
  const criticas = alertas.filter((a) => a.severidad === "critica");
  const altas = alertas.filter((a) => a.severidad === "alta");

  return (
    <section className="mb-8">
      <h2 className={TITULO_SECCION}>
        Alertas {alertas.length > 0 && `· ${criticas.length} críticas, ${altas.length} altas`}
      </h2>
      {alertas.length === 0 ? (
        <Alert level="info" title="Sin alertas activas">
          Pasaportes, mora, pasos bloqueados y police checks están al día.
        </Alert>
      ) : (
        <div className="space-y-2">
          {alertas.slice(0, 8).map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--r-md)] border px-4 py-3 transition-shadow hover:shadow-[shadow:var(--shadow-1)] ${
                a.severidad === "critica"
                  ? "border-[var(--c-danger)] bg-[var(--c-danger-bg)]"
                  : "border-[var(--c-warning)] bg-[var(--c-warning-bg)]"
              }`}
            >
              <span
                className={`rounded-[var(--r-pill)] px-2 py-0.5 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] ${
                  a.severidad === "critica"
                    ? "bg-[var(--c-danger)] text-white"
                    : "bg-[var(--c-warning)] text-white"
                }`}
              >
                {a.severidad}
              </span>
              <span className="text-sm font-semibold text-[var(--c-ink)]">{a.titulo}</span>
              <span className="text-sm text-[var(--c-ink-muted)]">{a.detalle}</span>
            </Link>
          ))}
          {alertas.length > 8 && (
            <p className="px-1 text-sm text-[var(--c-ink-muted)]">
              … y {alertas.length - 8} alertas más.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function ViajesProximosFallback() {
  return (
    <section role="status" aria-label="Cargando viajes próximos…">
      <h2 className={TITULO_SECCION}>Viajes próximos</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[168px] w-full" />
        ))}
      </div>
    </section>
  );
}

export async function ViajesProximosSection() {
  const proximos = await getProximosViajesConOcupacion();

  return (
    <section>
      <h2 className={TITULO_SECCION}>Viajes próximos</h2>
      {proximos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-700">Todavía no hay viajes cargados.</p>
          <p className="mt-1 text-sm text-gray-500">Creá el primero desde la sección Viajes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {proximos.map((v) => (
            <Link key={v.id} href={`/viajes/${v.codigo}`} className="block">
              <TripCard
                code={v.codigo}
                name={v.nombre}
                state={v.estado}
                dates={`${formatFecha(v.fechaInicio)} – ${formatFecha(v.fechaFin)}`}
                school={v.colegioDestinoNombre ?? "—"}
                enrolled={v.inscriptos}
                capacity={v.capacidadMaxima}
                progressMode={v.inscriptos >= v.capacidadMinima ? "completion" : "minimum"}
                progressPct={
                  v.inscriptos >= v.capacidadMinima
                    ? v.completitudPct
                    : Math.round((v.inscriptos / v.capacidadMinima) * 100)
                }
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export async function ProximoAnioSection() {
  const proximoAnio = await getViajesProximoAnio();
  if (proximoAnio.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className={TITULO_SECCION}>Viajes del próximo año</h2>
      <div className="space-y-2">
        {proximoAnio.map((v) => (
          <Link
            key={v.id}
            href={`/viajes/${v.codigo}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 transition-shadow hover:shadow-[shadow:var(--shadow-1)]"
          >
            <span className="font-mono text-[length:var(--t-mono)] text-[var(--c-ink-muted)]">{v.codigo}</span>
            <span className="text-sm font-semibold text-[var(--c-ink)]">{v.nombre}</span>
            <span className="text-sm text-[var(--c-ink-muted)]">
              {formatFecha(v.fechaInicio)} – {formatFecha(v.fechaFin)}
            </span>
            <span className="text-sm text-[var(--c-ink-muted)]">
              {v.inscriptos}/{v.capacidadMaxima} inscriptos
            </span>
            {v.inscriptos < v.capacidadMinima && (
              <span className="rounded-[var(--r-pill)] border border-[var(--c-warning)] bg-[var(--c-warning-bg)] px-2 py-0.5 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-warning)]">
                Mínimo no alcanzado
              </span>
            )}
            {v.capacidadMaxima > 0 && v.inscriptos >= 0.8 * v.capacidadMaxima && (
              <span className="rounded-[var(--r-pill)] border border-[var(--c-info)] bg-[var(--c-info-bg)] px-2 py-0.5 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-info)]">
                Alta demanda
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
