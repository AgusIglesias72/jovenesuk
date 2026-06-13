import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireFamilia } from "@/lib/auth/helpers";
import { getAlumnoById } from "@/lib/db/queries/alumnos";
import {
  listAsignacionesByAlumno,
  type AsignacionConViaje,
} from "@/lib/db/queries/asignaciones";
import { listCuotasByAsignacion } from "@/lib/db/queries/cuotas";
import { listPasosByAsignacion } from "@/lib/db/queries/pasos-alumno";
import { type Cuota } from "@/lib/db/schema/cuotas";
import { type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import {
  estadoEfectivoCuota,
  formatMonto,
  saldoPendiente,
  totalPagado,
  totalPlan,
} from "@/lib/domain/cuotas";
import {
  PASO_CODIGOS,
  PASO_LABELS,
  type PasoCodigo,
  type PasoEstado,
} from "@/lib/domain/pasos";
import { formatFecha } from "@/lib/utils/date";

type Tone = "neutral" | "info" | "success" | "danger";

// Copy familiar y amable para los estados del tablero (read-only): la familia
// no ve jerga interna ("bloqueado", "en_progreso"), ve qué tiene que hacer.
const ESTADO_FAMILIA: Record<PasoEstado, { label: string; tone: Tone; atenuado?: boolean }> = {
  completado: { label: "Listo", tone: "success" },
  en_progreso: { label: "En curso", tone: "info" },
  pendiente: { label: "Pendiente", tone: "neutral" },
  bloqueado: { label: "Requiere acción", tone: "danger" },
  vencido: { label: "Requiere acción", tone: "danger" },
  na: { label: "No aplica", tone: "neutral", atenuado: true },
};

const CUOTA_FAMILIA: Record<
  ReturnType<typeof estadoEfectivoCuota>,
  { label: string; tone: Tone }
> = {
  pagada: { label: "Pagada", tone: "success" },
  vencida: { label: "Vencida", tone: "danger" },
  pendiente: { label: "Pendiente", tone: "neutral" },
};

function ordenarPasos(pasos: PasoAlumno[]): PasoAlumno[] {
  const orden = new Map<PasoCodigo, number>(PASO_CODIGOS.map((c, i) => [c, i]));
  return [...pasos].sort(
    (a, b) =>
      (orden.get(a.codigo as PasoCodigo) ?? 99) -
      (orden.get(b.codigo as PasoCodigo) ?? 99)
  );
}

export default async function AlumnoFamiliaPage({
  params,
}: {
  params: Promise<{ alumnoId: string }>;
}) {
  const { alumnoId } = await params;
  const session = await requireFamilia();

  const alumno = await getAlumnoById(alumnoId);
  if (!alumno || alumno.familiaUserId !== session.user.id) {
    notFound();
  }

  const asignaciones = await listAsignacionesByAlumno(alumnoId);
  const activas = asignaciones.filter((a) => a.estado === "activa");

  const viajes = await Promise.all(
    activas.map(async (asignacion) => {
      const [pasos, cuotas] = await Promise.all([
        listPasosByAsignacion(asignacion.asignacionId),
        listCuotasByAsignacion(asignacion.asignacionId),
      ]);
      return { asignacion, pasos: ordenarPasos(pasos), cuotas };
    })
  );

  return (
    <div>
      <Link
        href="/familias"
        className="inline-flex min-h-[var(--tap)] items-center gap-1.5 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)] hover:text-[var(--c-ink)]"
      >
        <span aria-hidden>←</span> Volver al inicio
      </Link>

      <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight">
        {alumno.nombre} {alumno.apellido}
      </h1>

      {viajes.length === 0 ? (
        <div className="mt-6 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 text-center shadow-[shadow:var(--shadow-1)]">
          <p className="text-[length:var(--t-body)] text-[var(--c-ink-muted)]">
            Todavía no estás asignado a un viaje.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {viajes.map(({ asignacion, pasos, cuotas }) => (
            <section key={asignacion.asignacionId} className="space-y-5">
              <ViajeHeader asignacion={asignacion} />
              <Documentacion pasos={pasos} />
              <Pagos cuotas={cuotas} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ViajeHeader({ asignacion }: { asignacion: AsignacionConViaje }) {
  return (
    <header className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)]">
      <h2 className="font-display text-lg font-extrabold leading-tight text-[var(--c-ink)]">
        {asignacion.viajeNombre}
      </h2>
      <p className="mt-0.5 text-[length:var(--t-small)] font-medium text-[var(--c-ink-muted)]">
        {asignacion.viajeCodigo}
      </p>
      <p className="mt-2 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        {formatFecha(asignacion.fechaInicio)} – {formatFecha(asignacion.fechaFin)}
      </p>
    </header>
  );
}

function Documentacion({ pasos }: { pasos: PasoAlumno[] }) {
  const aplican = pasos.filter((p) => p.estado !== "na");
  const listos = aplican.filter((p) => p.estado === "completado").length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-bold text-[var(--c-ink)]">
          Documentación
        </h3>
        {aplican.length > 0 && (
          <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)]">
            {listos} de {aplican.length} trámites listos
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {pasos.map((paso) => {
          const cfg = ESTADO_FAMILIA[paso.estado as PasoEstado];
          return (
            <li
              key={paso.id}
              className="flex items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 shadow-[shadow:var(--shadow-1)]"
            >
              <span
                className={`text-[length:var(--t-body)] font-medium text-[var(--c-ink)] ${
                  cfg.atenuado ? "opacity-60" : ""
                }`}
              >
                {PASO_LABELS[paso.codigo as PasoCodigo] ?? paso.codigo}
              </span>
              <Badge tone={cfg.tone} className={cfg.atenuado ? "opacity-70" : ""}>
                {cfg.label}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Pagos({ cuotas }: { cuotas: Cuota[] }) {
  return (
    <div>
      <h3 className="font-display text-base font-bold text-[var(--c-ink)]">Pagos</h3>

      {cuotas.length === 0 ? (
        <p className="mt-3 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-4 text-[length:var(--t-small)] text-[var(--c-ink-muted)] shadow-[shadow:var(--shadow-1)]">
          Todavía no hay un plan de pagos cargado.
        </p>
      ) : (
        <PlanDePagos cuotas={cuotas} />
      )}
    </div>
  );
}

function PlanDePagos({ cuotas }: { cuotas: Cuota[] }) {
  const hoy = new Date();
  // Todas las cuotas de un plan comparten moneda; tomamos la de la primera.
  const moneda = cuotas[0]!.moneda;

  return (
    <div className="mt-3 space-y-3">
      <dl className="grid grid-cols-3 gap-2 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)]">
        <Resumen rotulo="Total" valor={formatMonto(totalPlan(cuotas), moneda)} />
        <Resumen rotulo="Pagado" valor={formatMonto(totalPagado(cuotas), moneda)} />
        <Resumen rotulo="Saldo" valor={formatMonto(saldoPendiente(cuotas), moneda)} />
      </dl>

      <ul className="space-y-2">
        {cuotas.map((cuota) => {
          const estado = estadoEfectivoCuota(cuota, hoy);
          const cfg = CUOTA_FAMILIA[estado];
          return (
            <li
              key={cuota.id}
              className="flex items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 shadow-[shadow:var(--shadow-1)]"
            >
              <div className="min-w-0">
                <p className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
                  Cuota {cuota.numero} · {formatMonto(cuota.monto, cuota.moneda)}
                </p>
                <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                  Vence {formatFecha(cuota.fechaVencimiento)}
                </p>
              </div>
              <Badge tone={cfg.tone}>{cfg.label}</Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Resumen({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[length:var(--t-small)] font-medium text-[var(--c-ink-muted)]">
        {rotulo}
      </dt>
      <dd className="mt-0.5 text-[length:var(--t-body)] font-bold text-[var(--c-ink)]">
        {valor}
      </dd>
    </div>
  );
}
