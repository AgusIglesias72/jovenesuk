/*
 * Primitivos locales de la dirección STUDIO.
 * AUTOCONTENIDOS a propósito (no importan de @/components/ui): este es un
 * concept de handoff visual que se restila entero desde ./tokens.css.
 */
import type { ReactNode } from "react";

/* ── helpers ── */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Layout de sección (compartido por todas las pantallas del lab) ── */
export function Screen({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function ScreenHeading({
  n,
  title,
  sub,
}: {
  n: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-6 flex items-end gap-4">
      <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-brand-300)]">
        {n}
      </span>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-bold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          {title}
        </h2>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{sub}</p>
      </div>
    </div>
  );
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
        "inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-3 py-1 text-[length:var(--t-label)] font-semibold leading-none tracking-[var(--ls-label)]",
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

/* ── Button ──────────────────────────────────────────────────────── */
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
  onClick,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const sizing =
    size === "sm"
      ? "min-h-[36px] px-4 text-[length:var(--t-small)]"
      : "min-h-[var(--tap)] px-6 text-[length:var(--t-body)]";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] hover:bg-[var(--c-brand-700)] focus-visible:shadow-[shadow:var(--ring-focus)]",
    accent:
      "bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)] hover:brightness-[1.03] focus-visible:shadow-[shadow:var(--ring-accent)]",
    outline:
      "border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink)] shadow-[shadow:var(--shadow-soft)] hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)] focus-visible:shadow-[shadow:var(--ring-focus)]",
    ghost:
      "text-[var(--c-ink-muted)] hover:bg-[var(--c-overlay)] hover:text-[var(--c-ink)] focus-visible:shadow-[shadow:var(--ring-focus)]",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
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
        "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)]",
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
      className="mb-1.5 block text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]"
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
      className="mt-1.5 flex items-center gap-1.5 text-[length:var(--t-small)]"
      style={{ color: error ? "var(--c-danger)" : "var(--c-ink-subtle)" }}
    >
      {error && <span aria-hidden>⚠</span>}
      {children}
    </p>
  );
}

const controlBase =
  "w-full rounded-[var(--r-md)] border bg-[var(--c-surface)] px-4 text-[length:var(--t-body)] text-[var(--c-ink)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--c-ink-subtle)] focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--c-surface-2)] disabled:text-[var(--c-ink-subtle)]";

const controlState = {
  normal:
    "border-[var(--c-border-strong)] focus:border-[var(--c-brand-300)] focus:shadow-[shadow:var(--ring-focus)]",
  error:
    "border-[var(--c-danger)] shadow-[shadow:var(--ring-error)] focus:border-[var(--c-danger)] focus:shadow-[shadow:var(--ring-error)]",
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
        "flex min-h-[var(--tap)] cursor-pointer items-center gap-3 text-[length:var(--t-body)] text-[var(--c-ink)]",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="peer h-6 w-6 cursor-pointer appearance-none rounded-[var(--r-xs)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] transition-colors checked:border-[var(--c-brand)] checked:bg-[var(--c-brand)] focus-visible:shadow-[shadow:var(--ring-focus)] focus-visible:outline-none disabled:cursor-not-allowed"
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
        <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-brand)]">
          {kicker}
        </p>
      )}
      <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-semibold text-[var(--c-ink)]">
        {children}
      </h3>
    </div>
  );
}

/* ── Alert ───────────────────────────────────────────────────────── */
const alertTone = {
  info: { fg: "var(--c-info)", bg: "var(--c-info-bg)", icon: "ℹ" },
  success: { fg: "var(--c-success)", bg: "var(--c-success-bg)", icon: "✓" },
  warning: { fg: "var(--c-warning)", bg: "var(--c-warning-bg)", icon: "⚠" },
  danger: { fg: "var(--c-danger)", bg: "var(--c-danger-bg)", icon: "✕" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: keyof typeof alertTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const t = alertTone[tone];
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-[var(--r-lg)] border p-4"
      style={{
        backgroundColor: t.bg,
        borderColor: "color-mix(in srgb, " + t.fg + " 25%, transparent)",
      }}
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--r-pill)] text-[13px] font-bold text-[var(--c-surface)]"
        style={{ backgroundColor: t.fg }}
        aria-hidden
      >
        {t.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug text-[var(--c-ink)]">{title}</p>
        {children && (
          <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{children}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Avatar ──────────────────────────────────────────────────────── */
const AVATAR_HUES = [
  { bg: "var(--c-brand-100)", fg: "var(--c-brand)" },
  { bg: "var(--c-accent-soft)", fg: "var(--c-accent-600)" },
  { bg: "var(--c-honey-soft)", fg: "#8a6210" },
  { bg: "var(--c-berry-soft)", fg: "var(--c-berry)" },
] as const;

export function Avatar({
  name,
  size = "md",
  hue = 0,
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  hue?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const c = AVATAR_HUES[hue % AVATAR_HUES.length] ?? AVATAR_HUES[0];
  const sizing =
    size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-[13px]";
  return (
    <span
      title={name}
      className={cn(
        "grid shrink-0 place-items-center rounded-[var(--r-pill)] font-[family-name:var(--font-display)] font-bold uppercase",
        sizing,
        className,
      )}
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {initials}
    </span>
  );
}

export function AvatarGroup({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <Avatar
          key={n}
          name={n}
          hue={i}
          className={cn("ring-[3px] ring-[var(--c-surface)]", i > 0 && "-ml-2.5")}
        />
      ))}
      {rest > 0 && (
        <span className="-ml-2.5 grid h-10 w-10 place-items-center rounded-[var(--r-pill)] bg-[var(--c-surface-2)] text-[12px] font-bold text-[var(--c-ink-muted)] ring-[3px] ring-[var(--c-surface)]">
          +{rest}
        </span>
      )}
    </div>
  );
}

/* ── Breadcrumb ──────────────────────────────────────────────────── */
export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[length:var(--t-small)]">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="text-[var(--c-ink-subtle)]">
                  ›
                </span>
              )}
              {last ? (
                <span className="font-semibold text-[var(--c-ink)]">{item}</span>
              ) : (
                <a href="#componentes" className="text-[var(--c-ink-muted)] hover:text-[var(--c-brand)] hover:underline">
                  {item}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── Chip (tag con remove / seleccionable) ───────────────────────── */
export function Chip({
  children,
  selected,
  removable,
}: {
  children: ReactNode;
  selected?: boolean;
  removable?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[32px] cursor-default items-center gap-1.5 rounded-[var(--r-pill)] border px-3 text-[length:var(--t-small)] font-semibold transition-colors",
        selected
          ? "border-[var(--c-brand)] bg-[var(--c-brand-50)] text-[var(--c-brand)]"
          : "border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink-muted)] hover:border-[var(--c-brand-300)]",
      )}
    >
      {selected && <span aria-hidden>✓</span>}
      {children}
      {removable && (
        <span
          aria-hidden
          className="-mr-1 grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] hover:bg-[var(--c-surface-2)]"
        >
          ✕
        </span>
      )}
    </span>
  );
}

/* ── Divider ─────────────────────────────────────────────────────── */
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-[var(--c-border)]" />;
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--c-border)]" />
      <span className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--c-border)]" />
    </div>
  );
}

/* ── EmptyState ──────────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span
        className="grid h-14 w-14 place-items-center rounded-[var(--r-lg)] text-2xl"
        style={{ backgroundColor: "var(--c-surface-2)" }}
        aria-hidden
      >
        {icon}
      </span>
      <p className="font-semibold text-[var(--c-ink)]">{title}</p>
      {children && (
        <p className="max-w-xs text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{children}</p>
      )}
      {action}
    </div>
  );
}

/* ── Kbd ─────────────────────────────────────────────────────────── */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[22px] items-center justify-center rounded-[var(--r-xs)] border border-[var(--c-border-strong)] border-b-2 bg-[var(--c-surface)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] font-bold text-[var(--c-ink-muted)]">
      {children}
    </kbd>
  );
}

/* ── Pagination ──────────────────────────────────────────────────── */
export function Pagination({ page, total }: { page: number; total: number }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <nav aria-label="paginación" className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={page === 1}
        className="grid h-9 w-9 place-items-center rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink-muted)] transition-colors hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="anterior"
      >
        ←
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-[var(--r-pill)] text-[length:var(--t-small)] font-bold transition-colors",
            p === page
              ? "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
              : "text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)]",
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page === total}
        className="grid h-9 w-9 place-items-center rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink-muted)] transition-colors hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="siguiente"
      >
        →
      </button>
    </nav>
  );
}

/* ── Progress ────────────────────────────────────────────────────── */
export function Progress({
  value,
  label,
  warm,
}: {
  value: number;
  label?: string;
  warm?: boolean;
}) {
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-[length:var(--t-small)]">
          <span className="font-semibold text-[var(--c-ink)]">{label}</span>
          <span className="font-[family-name:var(--font-mono)] text-[var(--c-ink-muted)]">
            {value}%
          </span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-surface-2)]">
        <div
          className="h-full rounded-[var(--r-pill)] transition-[width] duration-500"
          style={{
            width: `${value}%`,
            backgroundImage: warm ? "var(--grad-warm)" : "var(--grad-brand)",
          }}
        />
      </div>
    </div>
  );
}

/* ── Radio ───────────────────────────────────────────────────────── */
export function Radio({
  id,
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  id?: string;
  name: string;
  label: ReactNode;
  hint?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-[var(--tap)] cursor-pointer items-start gap-3 py-1.5 text-[length:var(--t-body)] text-[var(--c-ink)]",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <input
        id={id}
        name={name}
        type="radio"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 h-6 w-6 cursor-pointer appearance-none rounded-full border border-[var(--c-border-strong)] bg-[var(--c-surface)] transition-all checked:border-[7px] checked:border-[var(--c-brand)] focus-visible:shadow-[shadow:var(--ring-focus)] focus-visible:outline-none disabled:cursor-not-allowed"
      />
      <span>
        {label}
        {hint && (
          <span className="block text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">{hint}</span>
        )}
      </span>
    </label>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block animate-pulse rounded-[var(--r-sm)] bg-[var(--c-surface-2)]",
        className,
      )}
    />
  );
}

/* ── Switch (CSS-only, uncontrolled) ─────────────────────────────── */
export function Switch({
  id,
  label,
  defaultChecked,
  disabled,
}: {
  id?: string;
  label?: ReactNode;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex min-h-[var(--tap)] cursor-pointer items-center gap-3 text-[length:var(--t-body)] text-[var(--c-ink)]",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          role="switch"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="peer h-7 w-12 cursor-pointer appearance-none rounded-[var(--r-pill)] bg-[var(--c-border-strong)] transition-colors checked:bg-[var(--c-brand)] focus-visible:shadow-[shadow:var(--ring-focus)] focus-visible:outline-none disabled:cursor-not-allowed"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)] transition-transform peer-checked:translate-x-5"
        />
      </span>
      {label}
    </label>
  );
}

/* ── Tooltip (CSS hover) ─────────────────────────────────────────── */
export function Tooltip({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-[var(--r-sm)] bg-[var(--c-surface-inverse)] px-3 py-1.5 text-[length:var(--t-small)] font-medium text-[var(--c-ink-onbrand)] opacity-0 shadow-[shadow:var(--shadow-2)] transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
      >
        {tip}
        <span
          aria-hidden
          className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-[var(--c-surface-inverse)]"
        />
      </span>
    </span>
  );
}

/* ── Toast (presentacional — el stack vivo está en interactive.tsx) ── */
export function ToastCard({
  tone = "info",
  title,
  children,
  onClose,
}: {
  tone?: keyof typeof alertTone;
  title: string;
  children?: ReactNode;
  onClose?: () => void;
}) {
  const t = alertTone[tone];
  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-2)]"
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--r-pill)] text-[13px] font-bold text-[var(--c-surface)]"
        style={{ backgroundColor: t.fg }}
        aria-hidden
      >
        {t.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug text-[var(--c-ink)]">{title}</p>
        {children && (
          <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{children}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="cerrar"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-subtle)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
      >
        ✕
      </button>
    </div>
  );
}

/* ── Accordion (details-based, sin JS) ───────────────────────────── */
export function AccordionItem({
  title,
  children,
  defaultOpen,
  group,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** mismo group = exclusivo: abrir uno cierra el resto (atributo nativo `name`) */
  group?: string;
}) {
  return (
    <details
      open={defaultOpen}
      name={group}
      className="group border-b border-[var(--c-border)] last:border-b-0"
    >
      <summary className="flex min-h-[var(--tap)] cursor-pointer list-none items-center justify-between gap-3 py-3.5 font-semibold text-[var(--c-ink)] transition-colors hover:text-[var(--c-brand)] [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="h-4 w-4 shrink-0 text-[var(--c-ink-subtle)] transition-transform duration-200 group-open:rotate-180"
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
      </summary>
      <div className="pb-4 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        {children}
      </div>
    </details>
  );
}

/* ── Stat con delta ──────────────────────────────────────────────── */
export function StatDelta({
  label,
  value,
  delta,
  up,
}: {
  label: string;
  value: string;
  delta: string;
  up?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)]">{label}</p>
      <div className="mt-2 flex items-baseline gap-2.5">
        <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          {value}
        </p>
        <span
          className="inline-flex items-center gap-1 rounded-[var(--r-pill)] px-2 py-0.5 text-[11px] font-bold"
          style={{
            color: up ? "var(--c-success)" : "var(--c-danger)",
            backgroundColor: up ? "var(--c-success-bg)" : "var(--c-danger-bg)",
          }}
        >
          {up ? "↑" : "↓"} {delta}
        </span>
      </div>
    </Card>
  );
}

/* ── Timeline (audit log) ────────────────────────────────────────── */
export function Timeline({
  items,
}: {
  items: { when: string; who: string; what: ReactNode; accent?: boolean }[];
}) {
  return (
    <ol>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {/* columna del marcador: la línea va centrada exacta bajo el punto */}
            <span className="relative flex w-3 shrink-0 justify-center" aria-hidden>
              {!last && (
                <span className="absolute bottom-[-6px] left-1/2 top-2.5 w-0.5 -translate-x-1/2 rounded bg-[var(--c-border)]" />
              )}
              <span
                className="relative z-10 mt-1 h-3 w-3 rounded-full ring-4 ring-[var(--c-surface)]"
                style={{
                  backgroundColor: it.accent ? "var(--c-accent)" : "var(--c-brand-300)",
                }}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[length:var(--t-body)] text-[var(--c-ink)]">{it.what}</p>
              <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                <span className="font-semibold text-[var(--c-ink-muted)]">{it.who}</span> ·{" "}
                <span className="font-[family-name:var(--font-mono)]">{it.when}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Segmented control (radio-based, sin JS) ─────────────────────── */
export function Segmented({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <div className="inline-flex rounded-[var(--r-pill)] border border-[var(--c-border)] bg-[var(--c-surface-2)] p-1">
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            defaultChecked={o === (defaultValue ?? options[0])}
            className="peer sr-only"
          />
          <span className="inline-flex min-h-[34px] items-center rounded-[var(--r-pill)] px-4 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)] transition-all peer-checked:bg-[var(--c-surface)] peer-checked:text-[var(--c-brand)] peer-checked:shadow-[shadow:var(--shadow-1)] peer-focus-visible:shadow-[shadow:var(--ring-focus)]">
            {o}
          </span>
        </label>
      ))}
    </div>
  );
}

/* ── Banner (aviso full-width) ───────────────────────────────────── */
export function Banner({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-lg)] px-5 py-3.5 text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)]"
      style={{ backgroundImage: "var(--grad-warm)" }}
    >
      <p className="text-[length:var(--t-small)] font-semibold">{children}</p>
      {action}
    </div>
  );
}
