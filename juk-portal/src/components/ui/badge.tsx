import { cn } from "@/lib/utils/cn";

/**
 * Badge — JUK design system status indicator.
 *
 * For state-driven badges (M6 step states, M4 trip states), use the
 * binding components below. They guarantee color-state consistency.
 *
 * Color mapping is the same across the whole portal — do NOT change
 * the color of a state in one place to "make it pop".
 */

type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "brand"
  | "critical";

const toneClasses: Record<Tone, string> = {
  neutral:  "bg-gray-100 text-gray-700 border-gray-200",
  info:     "bg-blue-50 text-blue-700 border-blue-100",
  success:  "bg-green-50 text-green-700 border-green-100",
  warning:  "bg-amber-50 text-amber-700 border-amber-100",
  danger:   "bg-red-50 text-red-700 border-red-100",
  brand:    "bg-juk-navy-100 text-juk-navy-900 border-juk-navy-200",
  critical: "bg-juk-coral-600 text-white border-juk-coral-600",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  showDot?: boolean;
}

export function Badge({ tone = "neutral", showDot = true, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold tracking-tight whitespace-nowrap",
        toneClasses[tone],
        className
      )}
      {...rest}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

/* ============================================================
   StepBadge — bound to M6 step states (5 states)
   Use anywhere a step's state is shown.
   ============================================================ */

export type StepState = "pendiente" | "en_progreso" | "completado" | "bloqueado" | "na";

const STEP_STATES: Record<StepState, { className: string; label: string; dot: boolean }> = {
  pendiente:    { className: "bg-gray-100 text-gray-700 border-gray-200",         label: "Pendiente",   dot: true },
  en_progreso:  { className: "bg-blue-50 text-blue-700 border-blue-100",          label: "En progreso", dot: true },
  completado:   { className: "bg-green-50 text-green-700 border-green-100",       label: "Completado",  dot: true },
  bloqueado:    { className: "bg-red-50 text-red-700 border-red-100",             label: "Bloqueado",   dot: true },
  na:           { className: "bg-white text-gray-500 border-gray-300 border-dashed", label: "N/A",       dot: false },
};

export function StepBadge({ state, className }: { state: StepState; className?: string }) {
  const cfg = STEP_STATES[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold tracking-tight whitespace-nowrap",
        cfg.className,
        className
      )}
    >
      {cfg.dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {cfg.label}
    </span>
  );
}

/* ============================================================
   TripBadge — bound to M4 trip states (5 states)
   ============================================================ */

export type TripState = "inscripcion_abierta" | "confirmado" | "en_curso" | "finalizado" | "cancelado";

const TRIP_STATES: Record<TripState, { className: string; label: string }> = {
  inscripcion_abierta: { className: "bg-blue-50 text-blue-700 border-blue-100",       label: "Inscripción abierta" },
  confirmado:          { className: "bg-green-50 text-green-700 border-green-100",    label: "Confirmado" },
  en_curso:            { className: "bg-amber-50 text-amber-700 border-amber-100",    label: "En curso" },
  finalizado:          { className: "bg-gray-100 text-gray-700 border-gray-200",      label: "Finalizado" },
  cancelado:           { className: "bg-red-50 text-red-700 border-red-100",          label: "Cancelado" },
};

export function TripBadge({ state, className }: { state: TripState; className?: string }) {
  const cfg = TRIP_STATES[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold tracking-tight whitespace-nowrap",
        cfg.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {cfg.label}
    </span>
  );
}

/* ============================================================
   MoraBadge — solid coral, used for "mora N días"
   Has more visual weight on purpose (matches operational urgency).
   ============================================================ */

export function MoraBadge({ days, className }: { days: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-juk-coral-600 px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap",
        className
      )}
    >
      Mora {days} día{days === 1 ? "" : "s"}
    </span>
  );
}
