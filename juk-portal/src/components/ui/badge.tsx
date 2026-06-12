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

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-3 py-1 text-[length:var(--t-label)] font-semibold uppercase leading-none tracking-[var(--ls-label)] whitespace-nowrap";

const toneClasses: Record<Tone, string> = {
  neutral:  "bg-[var(--c-neutral-bg)] text-[var(--c-neutral)]",
  info:     "bg-[var(--c-info-bg)] text-[var(--c-info)]",
  success:  "bg-[var(--c-success-bg)] text-[var(--c-success)]",
  warning:  "bg-[var(--c-warning-bg)] text-[var(--c-warning)]",
  danger:   "bg-[var(--c-danger-bg)] text-[var(--c-danger)]",
  brand:    "bg-[var(--c-brand-100)] text-[var(--c-brand)]",
  critical: "bg-[var(--c-accent-600)] text-[var(--c-surface)]",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  showDot?: boolean;
}

export function Badge({ tone = "neutral", showDot = true, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn(badgeBase, toneClasses[tone], className)} {...rest}>
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
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
  pendiente:    { className: "bg-[var(--b-paso-pendiente-bg)] text-[var(--b-paso-pendiente)]",     label: "Pendiente",   dot: true },
  // Ojo Tailwind v3: "_" en arbitrary values se vuelve espacio → va escapado (\_).
  en_progreso:  { className: "bg-[var(--b-paso-en\\_progreso-bg)] text-[var(--b-paso-en\\_progreso)]", label: "En progreso", dot: true },
  completado:   { className: "bg-[var(--b-paso-completado-bg)] text-[var(--b-paso-completado)]",   label: "Completado",  dot: true },
  bloqueado:    { className: "bg-[var(--b-paso-bloqueado-bg)] text-[var(--b-paso-bloqueado)]",     label: "Bloqueado",   dot: true },
  na:           { className: "bg-[var(--b-paso-na-bg)] text-[var(--b-paso-na)]",                   label: "N/A",         dot: false },
};

export function StepBadge({ state, className }: { state: StepState; className?: string }) {
  const cfg = STEP_STATES[state];
  return (
    <span className={cn(badgeBase, cfg.className, className)}>
      {cfg.dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {cfg.label}
    </span>
  );
}

/* ============================================================
   TripBadge — bound to M4 trip states (5 states)
   ============================================================ */

export type TripState = "inscripcion_abierta" | "confirmado" | "en_curso" | "finalizado" | "cancelado";

const TRIP_STATES: Record<TripState, { className: string; label: string }> = {
  inscripcion_abierta: { className: "bg-[var(--b-viaje-abierta-bg)] text-[var(--b-viaje-abierta)]",       label: "Inscripción abierta" },
  confirmado:          { className: "bg-[var(--b-viaje-confirmado-bg)] text-[var(--b-viaje-confirmado)]", label: "Confirmado" },
  en_curso:            { className: "bg-[var(--b-viaje-en\\_curso-bg)] text-[var(--b-viaje-en\\_curso)]",     label: "En curso" },
  finalizado:          { className: "bg-[var(--b-viaje-finalizado-bg)] text-[var(--b-viaje-finalizado)]", label: "Finalizado" },
  cancelado:           { className: "bg-[var(--b-viaje-cancelado-bg)] text-[var(--b-viaje-cancelado)]",   label: "Cancelado" },
};

export function TripBadge({ state, className }: { state: TripState; className?: string }) {
  const cfg = TRIP_STATES[state];
  return (
    <span className={cn(badgeBase, cfg.className, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
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
        badgeBase,
        "bg-[image:var(--grad-warm)] font-bold text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)]",
        className
      )}
    >
      Mora {days} día{days === 1 ? "" : "s"}
    </span>
  );
}
