/*
 * Primitivos locales de la dirección "Editorial".
 * Autocontenidos a propósito: NO importan de @/components/ui.
 * Todos consumen tokens.css vía Tailwind arbitrary values.
 */
import type { ReactNode } from "react";

/* ── helpers ─────────────────────────────────────────────────────── */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ── SmallCaps / Eyebrow label ───────────────────────────────────── */

export function Eyebrow({
  children,
  className,
  gold,
}: {
  children: ReactNode;
  className?: string;
  gold?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-block text-[length:var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)]",
        gold ? "text-[var(--c-gold)]" : "text-[var(--c-ink-subtle)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Hairline rule (con opción de filete dorado corto) ───────────── */

export function Rule({ className }: { className?: string }) {
  return <div className={cx("h-px w-full bg-[var(--c-border)]", className)} />;
}

export function GoldTick({ className }: { className?: string }) {
  return <span className={cx("inline-block h-[2px] w-8 bg-[var(--c-gold)]", className)} />;
}

/* ── Card ────────────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  flush,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={cx(
        "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[var(--shadow-2)]",
        flush ? "" : "p-[var(--sp-5)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  eyebrow,
  action,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? (
          <div className="mb-1">
            <Eyebrow gold>{eyebrow}</Eyebrow>
          </div>
        ) : null}
        <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-medium tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

/* ── Button ──────────────────────────────────────────────────────── */

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "gold";
  size?: "sm" | "md";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--r-md)] font-medium transition-colors duration-150 focus:outline-none focus-visible:shadow-[var(--ring-focus)] disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = {
    sm: "px-3 py-1.5 text-[length:var(--t-small)]",
    md: "px-[var(--sp-5)] py-2.5 text-[length:var(--t-body)]",
  };
  const variants = {
    primary:
      "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] hover:bg-[var(--c-brand-700)] shadow-[var(--shadow-1)]",
    secondary:
      "bg-[var(--c-surface)] text-[var(--c-ink)] border border-[var(--c-border-strong)] hover:bg-[var(--c-surface-2)]",
    ghost: "bg-transparent text-[var(--c-ink-muted)] hover:bg-[var(--c-overlay)] hover:text-[var(--c-ink)]",
    gold: "bg-[var(--c-gold)] text-[#211803] hover:bg-[var(--c-gold-bright)] shadow-[var(--shadow-1)]",
  };
  return (
    <button type={type} disabled={disabled} className={cx(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}

/* ── Field wrapper (label + required + help/error) ───────────────── */

export function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center gap-1 text-[length:var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]"
    >
      {children}
      {required ? <span className="text-[var(--c-coral)] normal-case">*</span> : null}
    </label>
  );
}

export function Help({ children, error }: { children: ReactNode; error?: boolean }) {
  return (
    <p
      className={cx(
        "mt-1.5 text-[length:var(--t-small)]",
        error ? "text-[var(--c-danger)]" : "text-[var(--c-ink-subtle)]",
      )}
    >
      {children}
    </p>
  );
}

/* ── Input ───────────────────────────────────────────────────────── */

const fieldBase =
  "w-full rounded-[var(--r-md)] border bg-[var(--c-surface)] px-3.5 py-2.5 text-[length:var(--t-body)] text-[var(--c-ink)] transition-shadow duration-150 placeholder:text-[var(--c-ink-subtle)] focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--c-surface-2)] disabled:text-[var(--c-ink-subtle)]";

type InputProps = {
  id?: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  error?: boolean;
  focused?: boolean;
  className?: string;
};

export function Input({ error, focused, className, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      className={cx(
        fieldBase,
        error
          ? "border-[var(--c-danger)] shadow-[var(--ring-error)]"
          : focused
            ? "border-[var(--c-gold)] shadow-[var(--ring-focus)]"
            : "border-[var(--c-border-strong)] focus:border-[var(--c-gold)] focus:shadow-[var(--ring-focus)]",
        className,
      )}
    />
  );
}

/* ── Select ──────────────────────────────────────────────────────── */

export function Select({
  id,
  defaultValue,
  disabled,
  error,
  className,
  children,
}: {
  id?: string;
  defaultValue?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        defaultValue={defaultValue}
        disabled={disabled}
        className={cx(
          fieldBase,
          "appearance-none pr-10",
          error
            ? "border-[var(--c-danger)] shadow-[var(--ring-error)]"
            : "border-[var(--c-border-strong)] focus:border-[var(--c-gold)] focus:shadow-[var(--ring-focus)]",
          className,
        )}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-ink-subtle)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
      className={cx(
        fieldBase,
        "resize-none border-[var(--c-border-strong)] leading-[var(--lh-body)] focus:border-[var(--c-gold)] focus:shadow-[var(--ring-focus)]",
      )}
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
    <label htmlFor={id} className={cx("flex cursor-pointer items-start gap-2.5", disabled && "cursor-not-allowed opacity-50")}>
      <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[var(--r-xs)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] transition-colors checked:border-[var(--c-brand)] checked:bg-[var(--c-brand)] focus:outline-none focus-visible:shadow-[var(--ring-focus)] disabled:cursor-not-allowed"
        />
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute h-3 w-3 text-[var(--c-gold-bright)] opacity-0 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[length:var(--t-small)] leading-[var(--lh-snug)] text-[var(--c-ink-muted)]">{label}</span>
    </label>
  );
}

/* ── Badge de estado ─────────────────────────────────────────────── */

export function StateBadge({
  children,
  fg,
  bg,
  dot = true,
}: {
  children: ReactNode;
  fg: string;
  bg: string;
  dot?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-2.5 py-1 text-[length:var(--t-label)] font-semibold uppercase tracking-[0.1em]"
      style={{ color: fg, background: bg, boxShadow: `inset 0 0 0 1px ${fg}22` }}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: fg }} /> : null}
      {children}
    </span>
  );
}
