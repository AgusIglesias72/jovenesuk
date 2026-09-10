import Link from "next/link";

import {
  Alert,
  Badge,
  EmptyState,
  LinkButton,
  SectionTitle,
  Skeleton,
  StatCard,
  TripCard,
} from "@/components/ui";
import { countAlumnosEnMora, getAlertas } from "@/lib/db/queries/alertas";
import {
  getAlumnosConAccionUrgente,
  getDashboardStats,
  getProximosViajesConOcupacion,
  getViajesProximoAnio,
} from "@/lib/db/queries/dashboard";
import { SEVERIDAD_LABELS, textoDiasHastaViaje } from "@/lib/domain/alertas";
import { cn } from "@/lib/utils/cn";
import { formatFecha } from "@/lib/utils/date";

/**
 * Secciones del dashboard como server components independientes: cada una
 * espera solo sus propias queries (streaming con <Suspense> desde page.tsx),
 * así lo accionable pinta apenas llega y no queda detrás de la sección más lenta.
 */

const LIMITE_URGENTES = 6;
const LIMITE_ALERTAS = 8;

/** Destinos filtrados que comparten stat cards, accesos y "ver más". */
export const RUTAS_DASHBOARD = {
  alumnos: "/alumnos",
  alumnosConPasosTrabados: "/alumnos?alerta=pasos_bloqueados",
  viajes: "/viajes",
  viajesConfirmados: "/viajes?estado=confirmado",
  viajesEnCurso: "/viajes?estado=en_curso",
  cuotasVencidas: "/pagos?estado=vencida",
  pagos: "/pagos",
  consultasNuevas: "/consultas?estado=nueva",
  nuevoAlumno: "/alumnos/nuevo",
  nuevoViaje: "/viajes/nuevo",
} as const;

const LINK_VER_MAS =
  "inline-flex min-h-[var(--tap)] items-center rounded-[var(--r-sm)] px-1 text-[length:var(--t-small)] font-semibold text-[var(--c-brand)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:shadow-[shadow:var(--ring-focus)] lg:min-h-0";

const FILA_LINK =
  "rounded-[var(--r-md)] border px-4 py-3 transition-shadow hover:shadow-[shadow:var(--shadow-1)] focus-visible:outline-none focus-visible:shadow-[shadow:var(--ring-focus)]";

function EncabezadoSeccion({
  id,
  titulo,
  children,
}: {
  id?: string;
  titulo: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <SectionTitle id={id}>{titulo}</SectionTitle>
      {children}
    </div>
  );
}

function FilasSkeleton({ filas, alto }: { filas: number; alto: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} className={cn(alto, "w-full")} />
      ))}
    </div>
  );
}

/* ── Accesos rápidos ─────────────────────────────────────────────────── */

const ACCESOS = [
  { href: RUTAS_DASHBOARD.nuevoAlumno, label: "+ Nuevo alumno" },
  { href: RUTAS_DASHBOARD.nuevoViaje, label: "+ Nuevo viaje" },
  { href: RUTAS_DASHBOARD.pagos, label: "Registrar pago" },
  { href: RUTAS_DASHBOARD.consultasNuevas, label: "Consultas nuevas" },
] as const;

/**
 * Sin datos a propósito: se renderiza también en loading.tsx, así las tareas
 * frecuentes se pueden tocar antes de que termine de cargar el resto.
 * En teléfono es una grilla 2×2 de botones de ancho completo (targets de 44px).
 */
export function AccesosRapidos() {
  return (
    <nav aria-label="Accesos rápidos" className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {ACCESOS.map((a) => (
        <LinkButton key={a.href} href={a.href} variant="secondary">
          {a.label}
        </LinkButton>
      ))}
    </nav>
  );
}

/* ── Indicadores ─────────────────────────────────────────────────────── */

export function StatsFallback() {
  return (
    <section
      className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
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
    <section aria-label="Resumen" className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Alumnos" value={stats.alumnos} href={RUTAS_DASHBOARD.alumnos} />
      <StatCard
        label="Viajes confirmados"
        value={stats.viajesConfirmados}
        href={RUTAS_DASHBOARD.viajesConfirmados}
      />
      <StatCard
        label="Viajando ahora"
        value={stats.viajando}
        href={RUTAS_DASHBOARD.viajesEnCurso}
      />
      <StatCard
        label="Alumnos en mora"
        value={enMora}
        tone={enMora > 0 ? "critical" : undefined}
        href={RUTAS_DASHBOARD.cuotasVencidas}
      />
    </section>
  );
}

/* ── Alumnos con acción urgente (US-DX-03) ───────────────────────────── */

const TITULO_URGENTES = "Alumnos con acción urgente";

export function AccionUrgenteFallback() {
  return (
    <section className="mb-8" role="status" aria-label="Cargando alumnos con acción urgente…">
      <EncabezadoSeccion titulo={TITULO_URGENTES} />
      <FilasSkeleton filas={3} alto="h-[68px]" />
    </section>
  );
}

export async function AccionUrgenteSection() {
  const { items, total } = await getAlumnosConAccionUrgente({ limit: LIMITE_URGENTES });
  const restantes = total - items.length;

  return (
    <section className="mb-8" aria-labelledby="dashboard-urgentes">
      <EncabezadoSeccion id="dashboard-urgentes" titulo={TITULO_URGENTES}>
        {restantes > 0 && (
          <Link href={RUTAS_DASHBOARD.alumnosConPasosTrabados} className={LINK_VER_MAS}>
            {restantes === 1 ? "Ver el restante" : `Ver los ${restantes} restantes`}
          </Link>
        )}
      </EncabezadoSeccion>

      {items.length === 0 ? (
        <EmptyState compact title="Nadie necesita intervención hoy">
          Ningún alumno con viaje activo tiene pasos trabados, cuotas vencidas ni el pasaporte en
          riesgo.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.asignacionId}>
              <Link
                href={`/alumnos/${a.dni}`}
                className={cn(FILA_LINK, "block border-[var(--c-border)] bg-[var(--c-surface)]")}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Badge tone={a.severidad === "critica" ? "danger" : "warning"}>
                    {SEVERIDAD_LABELS[a.severidad]}
                  </Badge>
                  <span className="min-w-0 font-semibold text-[var(--c-ink)]">
                    {a.apellido}, {a.nombre}
                  </span>
                  <span
                    className={cn(
                      "ml-auto text-[length:var(--t-small)] font-semibold tabular-nums",
                      a.viajeInminente ? "text-[var(--c-danger)]" : "text-[var(--c-ink-muted)]"
                    )}
                  >
                    {textoDiasHastaViaje(a.diasHastaViaje)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                  <span className="font-mono text-[length:var(--t-mono)]">{a.viajeCodigo}</span>
                  <span>{a.motivos.join(" · ")}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Panel de alertas (US-DX-01) ─────────────────────────────────────── */

export function AlertasFallback() {
  return (
    <section className="mb-8" role="status" aria-label="Cargando alertas…">
      <EncabezadoSeccion titulo="Alertas" />
      <FilasSkeleton filas={3} alto="h-[52px]" />
    </section>
  );
}

export async function AlertasSection() {
  const alertas = await getAlertas();
  const criticas = alertas.filter((a) => a.severidad === "critica");
  const altas = alertas.filter((a) => a.severidad === "alta");
  const restantes = alertas.length - LIMITE_ALERTAS;

  return (
    <section className="mb-8" aria-labelledby="dashboard-alertas">
      <EncabezadoSeccion
        id="dashboard-alertas"
        titulo={
          <>
            Alertas {alertas.length > 0 && `· ${criticas.length} críticas, ${altas.length} altas`}
          </>
        }
      />
      {alertas.length === 0 ? (
        <Alert level="info" title="Sin alertas activas">
          Pasaportes, mora, pasos bloqueados y police checks están al día.
        </Alert>
      ) : (
        <div className="space-y-2">
          {alertas.slice(0, LIMITE_ALERTAS).map((a, i) => (
            <Link
              key={`${i}-${a.href}`}
              href={a.href}
              className={cn(
                FILA_LINK,
                "flex flex-wrap items-baseline gap-x-3 gap-y-1",
                a.severidad === "critica"
                  ? "border-[var(--c-danger)] bg-[var(--c-danger-bg)]"
                  : "border-[var(--c-warning)] bg-[var(--c-warning-bg)]"
              )}
            >
              <span
                className={cn(
                  "rounded-[var(--r-pill)] px-2 py-0.5 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-surface)]",
                  a.severidad === "critica" ? "bg-[var(--c-danger)]" : "bg-[var(--c-warning)]"
                )}
              >
                {SEVERIDAD_LABELS[a.severidad]}
              </span>
              <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
                {a.titulo}
              </span>
              <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                {a.detalle}
              </span>
            </Link>
          ))}
          {restantes > 0 && (
            // Las alertas mezclan alumnos, viajes y colegios: no hay UNA pantalla
            // con todas, así que se ofrecen los dos listados donde vive el grueso.
            <div className="flex flex-wrap items-center gap-x-2 px-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              <span>
                {restantes === 1 ? "Queda 1 alerta más." : `Quedan ${restantes} alertas más.`}
              </span>
              <Link href={RUTAS_DASHBOARD.alumnosConPasosTrabados} className={LINK_VER_MAS}>
                Alumnos con pasos trabados
              </Link>
              <Link href={RUTAS_DASHBOARD.cuotasVencidas} className={LINK_VER_MAS}>
                Cuotas vencidas
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Viajes próximos (US-DX-02) ──────────────────────────────────────── */

export function ViajesProximosFallback() {
  return (
    <section className="mb-8" role="status" aria-label="Cargando viajes próximos…">
      <EncabezadoSeccion titulo="Viajes próximos" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
    <section className="mb-8" aria-labelledby="dashboard-viajes-proximos">
      <EncabezadoSeccion id="dashboard-viajes-proximos" titulo="Viajes próximos">
        {proximos.length > 0 && (
          <Link href={RUTAS_DASHBOARD.viajes} className={LINK_VER_MAS}>
            Ver todos los viajes
          </Link>
        )}
      </EncabezadoSeccion>
      {proximos.length === 0 ? (
        <EmptyState
          title="Todavía no hay viajes cargados"
          action={<LinkButton href={RUTAS_DASHBOARD.nuevoViaje}>+ Nuevo viaje</LinkButton>}
        >
          Cuando cargues el primero, acá vas a ver inscriptos y avance de trámites.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {proximos.map((v) => (
            <Link
              key={v.id}
              href={`/viajes/${v.codigo}`}
              className="block rounded-[var(--r-lg)] focus-visible:outline-none focus-visible:shadow-[shadow:var(--ring-focus)]"
            >
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

/* ── Viajes del próximo año (US-DX-05) ───────────────────────────────── */

export function ProximoAnioFallback() {
  return (
    <section role="status" aria-label="Cargando viajes del próximo año…">
      <EncabezadoSeccion titulo="Viajes del próximo año" />
      <FilasSkeleton filas={2} alto="h-[52px]" />
    </section>
  );
}

export async function ProximoAnioSection() {
  const proximoAnio = await getViajesProximoAnio();
  if (proximoAnio.length === 0) return null;

  return (
    <section aria-labelledby="dashboard-proximo-anio">
      <EncabezadoSeccion id="dashboard-proximo-anio" titulo="Viajes del próximo año" />
      <div className="space-y-2">
        {proximoAnio.map((v) => (
          <Link
            key={v.id}
            href={`/viajes/${v.codigo}`}
            className={cn(
              FILA_LINK,
              "flex flex-wrap items-center gap-x-3 gap-y-1 border-[var(--c-border)] bg-[var(--c-surface)]"
            )}
          >
            <span className="font-mono text-[length:var(--t-mono)] text-[var(--c-ink-muted)]">
              {v.codigo}
            </span>
            <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
              {v.nombre}
            </span>
            <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              {formatFecha(v.fechaInicio)} – {formatFecha(v.fechaFin)}
            </span>
            <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              {v.inscriptos}/{v.capacidadMaxima} inscriptos
            </span>
            {v.inscriptos < v.capacidadMinima && <Badge tone="warning">Mínimo no alcanzado</Badge>}
            {v.capacidadMaxima > 0 && v.inscriptos >= 0.8 * v.capacidadMaxima && (
              <Badge tone="info">Alta demanda</Badge>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
