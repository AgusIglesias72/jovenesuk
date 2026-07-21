import { cn } from "@/lib/utils/cn";

/**
 * PageHeader — title + subtitle + actions slot.
 *
 * The H1 uses font-display (Bricolage Grotesque) — this is the JUK signature anchoring
 * every page. Don't replace with sans for "consistency" — it IS the brand.
 *
 * @example
 *   <PageHeader
 *     title="Dashboard"
 *     subtitle="Buen día, Felix. Hay 4 alertas críticas esperando."
 *     actions={<Button>+ Nuevo viaje</Button>}
 *   />
 */

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 mb-6 sm:flex-row sm:justify-between sm:items-start sm:gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display font-bold text-[length:var(--t-h1)] text-[var(--c-ink)] leading-[var(--lh-tight)] m-0 tracking-[var(--ls-tight)]">
          {title}
        </h1>
        {subtitle && (
          <div className="text-[length:var(--t-small)] text-[var(--c-ink-muted)] mt-1">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
