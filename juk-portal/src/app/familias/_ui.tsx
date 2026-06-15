import { type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import { formatFecha } from "@/lib/utils/date";

/**
 * Piezas presentacionales (read-only) compartidas por los módulos del Portal de
 * Familias. Copy familiar y amable; sin jerga interna.
 */

export function completitud(pasos: PasoAlumno[]): { listos: number; total: number } {
  const aplican = pasos.filter((p) => p.estado !== "na");
  return { listos: aplican.filter((p) => p.estado === "completado").length, total: aplican.length };
}

/**
 * Encabezado de página del portal (título + bajada), análogo al PageHeader del
 * back-office. El breadcrumb lo aporta el shell; esto es el H1 de cada módulo.
 */
export function FamiliaPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="m-0 font-display text-[length:var(--t-h1)] font-bold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

/** Barra de progreso simple (trámites/pagos). `valor`/`total` en unidades. */
export function ProgresoBarra({
  valor,
  total,
  tone = "brand",
}: {
  valor: number;
  total: number;
  tone?: "brand" | "success";
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-border)]"
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div
        className={`h-full rounded-[var(--r-pill)] transition-[width] duration-500 ${
          tone === "success" ? "bg-[var(--c-success)]" : "bg-[var(--c-brand)]"
        }`}
        style={{ width: `${pct}%` }}
      />
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
