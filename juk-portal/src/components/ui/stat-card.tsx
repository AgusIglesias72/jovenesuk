import { cn } from "@/lib/utils/cn";

/**
 * StatCard — Dashboard metric tile.
 *
 * The big number uses the Fraunces display serif (font-display). This is
 * the JUK signature — don't replace with sans.
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
    <div className={cn("bg-white border border-gray-200 rounded-lg p-5", className)}>
      <div className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
        {label}
      </div>
      <div
        className={cn(
          "font-display font-semibold leading-none text-4xl tabular-nums",
          tone === "critical" ? "text-juk-coral-700" : "text-juk-navy-950"
        )}
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "text-xs mt-2 flex items-center gap-1",
            deltaTone === "up" && "text-green-700",
            deltaTone === "down" && "text-red-700",
            deltaTone === "neutral" && "text-gray-600"
          )}
        >
          {delta}
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
  critical: { container: "bg-red-50 border-red-100 text-red-700",                 iconBg: "bg-red-600 text-white",        glyph: "!" },
  warning:  { container: "bg-amber-50 border-amber-100 text-amber-700",            iconBg: "bg-amber-600 text-white",      glyph: "⚠" },
  info:     { container: "bg-juk-navy-50 border-juk-navy-200 text-juk-navy-900",   iconBg: "bg-juk-navy-700 text-white",   glyph: "i" },
  success:  { container: "bg-green-50 border-green-100 text-green-700",            iconBg: "bg-green-600 text-white",      glyph: "✓" },
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
        "flex gap-3 rounded-md border px-4 py-3 text-sm leading-snug",
        cfg.container,
        className
      )}
      role="alert"
    >
      <span
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold mt-0.5",
          cfg.iconBg
        )}
        aria-hidden
      >
        {cfg.glyph}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold mb-0.5">{title}</div>
        {children && <div>{children}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
