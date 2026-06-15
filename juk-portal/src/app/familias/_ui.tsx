import { Badge } from "@/components/ui/badge";
import { type Cuota } from "@/lib/db/schema/cuotas";
import { type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import {
  estadoEfectivoCuota,
  formatMonto,
  saldoPendiente,
  totalPagado,
  totalPlan,
} from "@/lib/domain/cuotas";
import { PASO_CODIGOS, PASO_LABELS, type PasoCodigo, type PasoEstado } from "@/lib/domain/pasos";
import { formatFecha } from "@/lib/utils/date";

/**
 * Piezas presentacionales (read-only) compartidas por los módulos del Portal de
 * Familias. Copy familiar y amable; sin jerga interna.
 */

type Tone = "neutral" | "info" | "success" | "danger";

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

export function ordenarPasos(pasos: PasoAlumno[]): PasoAlumno[] {
  const orden = new Map<PasoCodigo, number>(PASO_CODIGOS.map((c, i) => [c, i]));
  return [...pasos].sort(
    (a, b) => (orden.get(a.codigo as PasoCodigo) ?? 99) - (orden.get(b.codigo as PasoCodigo) ?? 99)
  );
}

export function completitud(pasos: PasoAlumno[]): { listos: number; total: number } {
  const aplican = pasos.filter((p) => p.estado !== "na");
  return { listos: aplican.filter((p) => p.estado === "completado").length, total: aplican.length };
}

const CARD =
  "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 shadow-[shadow:var(--shadow-1)]";

export function DocumentacionLista({ pasos }: { pasos: PasoAlumno[] }) {
  return (
    <ul className="space-y-2">
      {pasos.map((paso) => {
        const cfg = ESTADO_FAMILIA[paso.estado as PasoEstado];
        return (
          <li key={paso.id} className={`flex items-center justify-between gap-3 ${CARD}`}>
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
  );
}

export function PagosResumen({ cuotas }: { cuotas: Cuota[] }) {
  if (cuotas.length === 0) {
    return (
      <p className={`text-[length:var(--t-small)] text-[var(--c-ink-muted)] ${CARD}`}>
        Todavía no hay un plan de pagos cargado.
      </p>
    );
  }
  const hoy = new Date();
  const moneda = cuotas[0]!.moneda;

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-3 gap-2 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)]">
        <Resumen rotulo="Total" valor={formatMonto(totalPlan(cuotas), moneda)} />
        <Resumen rotulo="Pagado" valor={formatMonto(totalPagado(cuotas), moneda)} />
        <Resumen rotulo="Saldo" valor={formatMonto(saldoPendiente(cuotas), moneda)} />
      </dl>
      <ul className="space-y-2">
        {cuotas.map((cuota) => {
          const cfg = CUOTA_FAMILIA[estadoEfectivoCuota(cuota, hoy)];
          return (
            <li key={cuota.id} className={`flex items-center justify-between gap-3 ${CARD}`}>
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
      <dt className="text-[length:var(--t-small)] font-medium text-[var(--c-ink-muted)]">{rotulo}</dt>
      <dd className="mt-0.5 text-[length:var(--t-body)] font-bold text-[var(--c-ink)]">{valor}</dd>
    </div>
  );
}

/* Encabezado de un viaje (reutilizado en varios módulos). */
export function ViajeHeader({
  nombre,
  codigo,
  fechaInicio,
  fechaFin,
}: {
  nombre: string;
  codigo: string;
  fechaInicio: Date;
  fechaFin: Date;
}) {
  return (
    <header className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)]">
      <h2 className="font-display text-lg font-extrabold leading-tight text-[var(--c-ink)]">
        {nombre}
      </h2>
      <p className="mt-0.5 font-mono text-[length:var(--t-small)] font-medium text-[var(--c-ink-muted)]">
        {codigo}
      </p>
      <p className="mt-2 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        {formatFecha(fechaInicio)} – {formatFecha(fechaFin)}
      </p>
    </header>
  );
}

export function SeccionTitulo({
  titulo,
  extra,
}: {
  titulo: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="font-display text-base font-bold text-[var(--c-ink)]">{titulo}</h3>
      {extra && (
        <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)]">
          {extra}
        </span>
      )}
    </div>
  );
}

export function EstadoVacio({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 text-center shadow-[shadow:var(--shadow-1)]">
      <p className="text-[length:var(--t-body)] text-[var(--c-ink-muted)]">{children}</p>
    </div>
  );
}
