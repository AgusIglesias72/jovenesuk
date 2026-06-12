import { cn } from "@/lib/utils/cn";

/**
 * StatCard — Dashboard metric tile.
 *
 * The big number uses the display face (font-display, Bricolage Grotesque).
 * This is the JUK signature — don't replace with sans.
 *
 * Tone: "neutral" by default, "critical" (coral) for numbers that ARE
 * the alert (e.g. alumnos en mora).
 *
 * @example
 *   <StatCard label="Alumnos activos" value="62" delta="↑ 14 vs 2025" deltaTone="up" />
 *   <StatCard label="Pagos en mora" value="5" tone="critical" deltaTone="down" />
 */

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  tone?: "neutral" | "critical";
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  tone = "neutral",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--c-surface)] border border-[var(--c-border)] rounded-[var(--r-lg)] p-5 shadow-[shadow:var(--shadow-1)]",
        className
      )}
    >
      <div className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)] mb-2">
        {label}
      </div>
      <div
        className={cn(
          "font-display font-extrabold leading-none text-4xl tabular-nums tracking-[var(--ls-tight)]",
          tone === "critical" ? "text-[var(--c-accent-600)]" : "text-[var(--c-ink)]"
        )}
      >
        {value}
      </div>
      {delta && (
        <div className="mt-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-[var(--r-pill)] px-2 py-0.5 text-[11px] font-bold",
              deltaTone === "up" && "text-[var(--c-success)] bg-[var(--c-success-bg)]",
              deltaTone === "down" && "text-[var(--c-danger)] bg-[var(--c-danger-bg)]",
              deltaTone === "neutral" && "text-[var(--c-ink-muted)] bg-[var(--c-surface-2)]"
            )}
          >
            {delta}
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Alert
   ============================================================ */

/**
 * Alert — 4 levels.
 *
 *  - critical → red. Action required today. Highest visual weight.
 *  - warning  → amber. Anticipation (passport expiring in 60d).
 *  - info     → navy-tinted. Passive notification.
 *  - success  → green. Confirms a positive system event.
 *
 * @example
 *   <Alert level="critical" title="ETA rechazado · Joaquín Pérez">
 *     Viaje en 47 días. Contactar a la familia hoy.
 *   </Alert>
 */

type AlertLevel = "critical" | "warning" | "info" | "success";

const ALERT_STYLES: Record<AlertLevel, { container: string; iconBg: string; glyph: string }> = {
  critical: {
    container: "bg-[var(--c-danger-bg)] border-[color-mix(in_srgb,var(--c-danger)_25%,transparent)]",
    iconBg: "bg-[var(--c-danger)] text-[var(--c-surface)]",
    glyph: "!",
  },
  warning: {
    container: "bg-[var(--c-warning-bg)] border-[color-mix(in_srgb,var(--c-warning)_25%,transparent)]",
    iconBg: "bg-[var(--c-warning)] text-[var(--c-surface)]",
    glyph: "⚠",
  },
  info: {
    container: "bg-[var(--c-info-bg)] border-[color-mix(in_srgb,var(--c-info)_25%,transparent)]",
    iconBg: "bg-[var(--c-info)] text-[var(--c-surface)]",
    glyph: "i",
  },
  success: {
    container: "bg-[var(--c-success-bg)] border-[color-mix(in_srgb,var(--c-success)_25%,transparent)]",
    iconBg: "bg-[var(--c-success)] text-[var(--c-surface)]",
    glyph: "✓",
  },
};

interface AlertProps {
  level: AlertLevel;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Alert({ level, title, children, action, className }: AlertProps) {
  const cfg = ALERT_STYLES[level];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--r-lg)] border p-4 text-[length:var(--t-small)] leading-[var(--lh-snug)]",
        cfg.container,
        className
      )}
      role="alert"
    >
      <span
        className={cn(
          "flex-shrink-0 grid h-7 w-7 place-items-center rounded-[var(--r-pill)] text-[13px] font-bold",
          cfg.iconBg
        )}
        aria-hidden
      >
        {cfg.glyph}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[var(--c-ink)] mb-0.5">{title}</div>
        {children && <div className="text-[var(--c-ink-muted)]">{children}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
