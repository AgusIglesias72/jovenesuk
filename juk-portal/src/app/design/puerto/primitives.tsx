/*
 * Primitivos locales de la dirección PUERTO.
 * AUTOCONTENIDOS a propósito (no importan de @/components/ui): este es un
 * concept de handoff visual que se restila entero desde ./tokens.css.
 *
 * Carácter PUERTO: geometría redondeada (heredada de Studio) pero
 * SOBRIO y SÓLIDO — cero degradés. El botón primario es navy sólido,
 * el de acento es oro sólido.
 */
import type { ReactNode } from "react";

/* ── helpers ── */
function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Badge (pill) ────────────────────────────────────────────────── */
type Tone =
  | "brand"
  | "accent"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

const toneVars: Record<Tone, { fg: string; bg: string }> = {
  brand: { fg: "var(--c-brand)", bg: "var(--c-brand-100)" },
  accent: { fg: "var(--c-accent-600)", bg: "var(--c-accent-soft)" },
  neutral: { fg: "var(--c-neutral)", bg: "var(--c-neutral-bg)" },
  success: { fg: "var(--c-success)", bg: "var(--c-success-bg)" },
  warning: { fg: "var(--c-warning)", bg: "var(--c-warning-bg)" },
  danger: { fg: "var(--c-danger)", bg: "var(--c-danger-bg)" },
  info: { fg: "var(--c-info)", bg: "var(--c-info-bg)" },
};

export function Badge({
  children,
  fg,
  bg,
  tone,
  dot = false,
  className,
}: {
  children: ReactNode;
  fg?: string;
  bg?: string;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  const resolvedFg = fg ?? (tone ? toneVars[tone].fg : "var(--c-ink-muted)");
  const resolvedBg = bg ?? (tone ? toneVars[tone].bg : "var(--c-surface-2)");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-3 py-1 text-[var(--t-label)] font-semibold uppercase leading-none tracking-[var(--ls-label)]",
        className,
      )}
      style={{ color: resolvedFg, backgroundColor: resolvedBg }}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: resolvedFg }}
        />
      )}
      {children}
    </span>
  );
}

/* ── Button ──────────────────────────────────────────────────────────
 * SÓLIDO siempre. Cero degradés.
 *   primary → navy sólido
 *   accent  → oro sólido
 *   outline → superficie clara con borde
 *   ghost   → sin fill
 * ─────────────────────────────────────────────────────────────────── */
type ButtonVariant = "primary" | "accent" | "ghost" | "outline";
type ButtonSize = "md" | "sm";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--r-pill)] font-semibold transition-[transform,box-shadow,background-color] duration-150 active:scale-[0.97] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100";

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const sizing =
    size === "sm"
      ? "min-h-[36px] px-4 text-[var(--t-small)]"
      : "min-h-[var(--tap)] px-6 text-[var(--t-body)]";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[var(--shadow-brand)] hover:bg-[var(--c-brand-800)] focus-visible:shadow-[var(--ring-focus)]",
    accent:
      "bg-[var(--c-accent)] text-[var(--c-ink-onaccent)] shadow-[var(--shadow-accent)] hover:bg-[var(--c-accent-500)] focus-visible:shadow-[var(--ring-accent)]",
    outline:
      "border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink)] shadow-[var(--shadow-soft)] hover:border-[var(--c-brand-400)] hover:text-[var(--c-brand)] focus-visible:shadow-[var(--ring-focus)]",
    ghost:
      "text-[var(--c-ink-muted)] hover:bg-[var(--c-overlay)] hover:text-[var(--c-brand)] focus-visible:shadow-[var(--ring-focus)]",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(buttonBase, sizing, variants[variant], className)}
    >
      {children}
    </button>
  );
}

/* ── Card ────────────────────────────────────────────────────────── */
export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <As
      className={cn(
        "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[var(--shadow-1)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

/* ── Field shell (label + help/error) ────────────────────────────── */
export function Label({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[var(--t-small)] font-semibold text-[var(--c-ink)]"
    >
      {children}
      {required && <span className="ml-0.5 text-[var(--c-accent-600)]">*</span>}
    </label>
  );
}

export function FieldNote({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className="mt-1.5 flex items-center gap-1.5 text-[var(--t-small)]"
      style={{ color: error ? "var(--c-danger)" : "var(--c-ink-subtle)" }}
    >
      {error && <span aria-hidden>⚠</span>}
      {children}
    </p>
  );
}

const controlBase =
  "w-full rounded-[var(--r-md)] border bg-[var(--c-surface)] px-4 text-[var(--t-body)] text-[var(--c-ink)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--c-ink-subtle)] focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--c-surface-2)] disabled:text-[var(--c-ink-subtle)]";

const controlState = {
  normal:
    "border-[var(--c-border-strong)] focus:border-[var(--c-brand-400)] focus:shadow-[var(--ring-focus)]",
  error:
    "border-[var(--c-danger)] shadow-[var(--ring-error)] focus:border-[var(--c-danger)] focus:shadow-[var(--ring-error)]",
} as const;

/* ── Input ───────────────────────────────────────────────────────── */
export function Input({
  id,
  type = "text",
  placeholder,
  defaultValue,
  value,
  disabled,
  invalid,
  autoFocus,
}: {
  id?: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      value={value}
      readOnly={value !== undefined}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        "min-h-[var(--tap)]",
        invalid ? controlState.error : controlState.normal,
      )}
    />
  );
}

/* ── Select ──────────────────────────────────────────────────────── */
export function Select({
  id,
  options,
  defaultValue,
  disabled,
  invalid,
}: {
  id?: string;
  options: string[];
  defaultValue?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        defaultValue={defaultValue}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          "min-h-[var(--tap)] cursor-pointer appearance-none pr-11",
          invalid ? controlState.error : controlState.normal,
        )}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-ink-subtle)]"
      >
        <path
          d="M5 7.5 10 12.5 15 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ── Textarea ────────────────────────────────────────────────────── */
export function Textarea({
  id,
  placeholder,
  defaultValue,
  rows = 4,
}: {
  id?: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      placeholder={placeholder}
      defaultValue={defaultValue}
      className={cn(controlBase, "resize-none py-3", controlState.normal)}
    />
  );
}

/* ── Checkbox ────────────────────────────────────────────────────── */
export function Checkbox({
  id,
  label,
  defaultChecked,
  disabled,
}: {
  id?: string;
  label: ReactNode;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-[var(--tap)] cursor-pointer items-center gap-3 text-[var(--t-body)] text-[var(--c-ink)]",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="peer h-6 w-6 cursor-pointer appearance-none rounded-[var(--r-xs)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] transition-colors checked:border-[var(--c-brand)] checked:bg-[var(--c-brand)] focus-visible:shadow-[var(--ring-focus)] focus-visible:outline-none disabled:cursor-not-allowed"
        />
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-[var(--c-ink-onbrand)] opacity-0 peer-checked:opacity-100"
        >
          <path
            d="M4 10.5 8 14.5 16 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label}
    </label>
  );
}

/* ── Section title (para los bloques del form / paneles) ─────────── */
export function SectionTitle({
  kicker,
  children,
}: {
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {kicker && (
        <p className="flex items-center gap-2 text-[var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-accent-600)]">
          <span className="h-px w-5 bg-[var(--c-accent)]" aria-hidden />
          {kicker}
        </p>
      )}
      <h3 className="mt-1 font-[family-name:var(--font-display)] text-[var(--t-h3)] font-semibold text-[var(--c-ink)]">
        {children}
      </h3>
    </div>
  );
}
