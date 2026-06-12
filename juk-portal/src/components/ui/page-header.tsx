import { cn } from "@/lib/utils/cn";

/**
 * PageHeader — title + subtitle + actions slot.
 *
 * The H1 uses font-display (Fraunces) — this is the JUK signature anchoring
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
    <header className={cn("flex justify-between items-start gap-4 mb-6", className)}>
      <div>
        <h1 className="font-display font-semibold text-3xl text-juk-navy-950 leading-tight m-0 tracking-[-0.02em]">
          {title}
        </h1>
        {subtitle && <div className="text-sm text-gray-600 mt-1">{subtitle}</div>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}
