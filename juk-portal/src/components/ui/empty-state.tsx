import { cn } from "@/lib/utils/cn";

/**
 * EmptyState — el vacío del design system.
 *
 * Un solo componente para los tres vacíos que tiene la app:
 *  - "todavía no hay X"      → title + action al alta
 *  - "sin resultados"        → title + action "Limpiar filtros"
 *  - vacío dentro de un panel → variante `compact` (sin ícono, menos aire)
 *
 * Sin hooks a propósito: sirve igual en server components y en los paneles
 * `"use client"`.
 *
 * @example
 *   <EmptyState
 *     title={hayFiltros ? "Sin resultados para estos filtros" : "Todavía no hay alumnos"}
 *     action={hayFiltros
 *       ? <LinkButton variant="secondary" href="/alumnos">Limpiar filtros</LinkButton>
 *       : <LinkButton href="/alumnos/nuevo">+ Nuevo alumno</LinkButton>}
 *   >
 *     Los alumnos se cargan desde el colegio o se importan del CRM.
 *   </EmptyState>
 */

interface EmptyStateProps {
  title: string;
  /** Descripción: una línea explicando qué falta o cómo se llena. */
  children?: React.ReactNode;
  /** Glifo o ícono decorativo. Se oculta de los lectores de pantalla. */
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** Menos aire y sin ícono: para vacíos dentro de un panel o una card. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  children,
  icon,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface)] text-center",
        compact ? "px-4 py-6" : "px-5 py-10",
        className
      )}
    >
      {icon && !compact && (
        <span
          aria-hidden
          className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[var(--r-pill)] bg-[var(--c-surface-2)] text-[length:var(--t-h3)] text-[var(--c-ink-subtle)]"
        >
          {icon}
        </span>
      )}
      <p
        className={cn(
          "font-semibold text-[var(--c-ink)]",
          compact ? "text-[length:var(--t-small)]" : "text-[length:var(--t-body)]"
        )}
      >
        {title}
      </p>
      {children && (
        <p className="mx-auto mt-1 max-w-prose text-[length:var(--t-small)] leading-[var(--lh-snug)] text-[var(--c-ink-muted)]">
          {children}
        </p>
      )}
      {action && (
        <div className={cn("flex flex-wrap justify-center gap-2", compact ? "mt-3" : "mt-5")}>
          {action}
        </div>
      )}
    </div>
  );
}
