"use client";

import { cn } from "@/lib/utils/cn";
import { TripBadge, type TripState } from "./badge";

/**
 * TripCard — Dashboard / list card showing a trip with progress.
 *
 * Two progress modes:
 *   - "completion" → % students with all applicable steps Completado
 *                    (used for trips with departures soon)
 *   - "minimum"    → enrollment count vs the 5-student minimum
 *                    (used for trips far from departure, still filling up)
 *
 * The progress mode chooses the bar color: brand gradient (--grad-brand) for
 * completion, warm gradient (--grad-warm) for trips approaching the minimum.
 *
 * @example
 *   <TripCard
 *     code="UK-2026-JUL-LONDON"
 *     name="Londres en Julio · Campus"
 *     state="confirmado"
 *     dates="04 jul – 25 jul"
 *     school="London School of English"
 *     enrolled={18}
 *     capacity={24}
 *     progressMode="completion"
 *     progressPct={78}
 *   />
 */

interface TripCardProps {
  code: string;
  name: string;
  state: TripState;
  dates: string;
  school: string;
  enrolled: number;
  capacity: number;
  progressMode?: "completion" | "minimum";
  progressPct: number;
  onClick?: () => void;
  className?: string;
}

export function TripCard({
  code,
  name,
  state,
  dates,
  school,
  enrolled,
  capacity,
  progressMode = "completion",
  progressPct,
  onClick,
  className,
}: TripCardProps) {
  const isMin = progressMode === "minimum";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "bg-[var(--c-surface)] border border-[var(--c-border)] rounded-[var(--r-lg)] p-5 flex flex-col gap-3 shadow-[shadow:var(--shadow-1)]",
        "transition-[transform,box-shadow,border-color] duration-150",
        onClick &&
          "cursor-pointer hover:shadow-[shadow:var(--shadow-2)] hover:-translate-y-px hover:border-[var(--c-brand-300)] focus:outline-none focus-visible:shadow-[shadow:var(--ring-focus)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[length:var(--t-mono)] font-bold tracking-wide uppercase text-[var(--c-accent-600)]">
          {code}
        </span>
        <TripBadge state={state} />
      </div>

      <h3 className="font-display text-[length:var(--t-h3)] font-semibold text-[var(--c-ink)] leading-[var(--lh-snug)] m-0 tracking-[var(--ls-tight)]">
        {name}
      </h3>

      <div className="flex gap-3 flex-wrap text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        <span className="inline-flex items-center gap-1">
          <CalendarIcon /> {dates}
        </span>
        <span className="inline-flex items-center gap-1">
          <UsersIcon /> {enrolled} / {capacity}{isMin ? " mín." : ""}
        </span>
        <span className="inline-flex items-center gap-1">
          <SchoolIcon /> {school}
        </span>
      </div>

      <div className="mt-1">
        <div className="flex justify-between text-[length:var(--t-small)] mb-1.5">
          <span className="font-semibold text-[var(--c-ink)]">
            {isMin ? "Hacia cupo mínimo (5)" : "Trámites completados"}
          </span>
          <span className="font-mono text-[var(--c-ink-muted)]">{progressPct}%</span>
        </div>
        <div className="h-2.5 bg-[var(--c-surface-2)] rounded-[var(--r-pill)] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-[var(--r-pill)] transition-[width] duration-500",
              isMin ? "bg-[image:var(--grad-warm)]" : "bg-[image:var(--grad-brand)]"
            )}
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── inline icons ── */
function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x={2} y={3} width={12} height={11} rx={1.5} />
      <path d="M2 6h12M5 2v2M11 2v2" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx={6} cy={5} r={2.5} />
      <path d="M1 14c0-2.5 2-4 5-4s5 1.5 5 4" strokeLinecap="round" />
      <circle cx={11.5} cy={6} r={1.8} opacity={0.6} />
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 6l6-3 6 3-6 3-6-3z" strokeLinejoin="round" />
      <path d="M5 8v3c0 .8 1.3 1.5 3 1.5s3-.7 3-1.5V8" strokeLinecap="round" />
    </svg>
  );
}
