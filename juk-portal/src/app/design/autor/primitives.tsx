/*
 * Primitivos locales de la dirección AUTOR.
 * AUTOCONTENIDOS a propósito (no importan de @/components/ui): este es un
 * concept de handoff visual que se restila entero desde ./tokens.css.
 *
 * Sensibilidad: papel + tinta, reglas hairline en vez de sombras blandas,
 * esquinas casi rectas, botones SÓLIDOS (cero degradés), cifras tabulares,
 * badges con forma de sello (cuadrado, no pastilla).
 */
import type { ReactNode } from "react";

/* ── helpers ── */
function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* Cifras tabulares + ligaduras de imprenta: clase utilitaria reusable */
export const numeral = "[font-feature-settings:'tnum'_1,'lnum'_1] tabular-nums";

/* ── Badge (sello cuadrado) ──────────────────────────────────────────
 * No es una pastilla: es un marbete rectangular con borde de tinta del
 * mismo color del texto. Lee como un sello, no como un chip de SaaS.
 */
type Tone =
  | "brand"
  | "accent"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

const toneVars: Record<Tone, { fg: string; bg: string }> = {
  brand: { fg: "var(--c-brand)", bg: "var(--c-brand-50)" },
  accent: { fg: "var(--c-accent-700)", bg: "var(--c-accent-soft)" },
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
        "inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border px-2 py-[3px] text-[var(--t-label)] font-semibold uppercase leading-none tracking-[var(--ls-label)]",
        className,
      )}
      style={{
        color: resolvedFg,
        backgroundColor: resolvedBg,
        borderColor: "color-mix(in srgb, " + resolvedFg + " 35%, transparent)",
      }}
    >
      {dot && (
        <span
          className="h-[5px] w-[5px] rounded-[var(--r-xs)]"
          style={{ backgroundColor: resolvedFg }}
        />
      )}
      {children}
    </span>
  );
}

/* ── Button ──────────────────────────────────────────────────────────
 * Botones SÓLIDOS (sin degradé). El "efecto firma" es el bloque de
 * desplazamiento sólido (offset shadow) que colapsa al presionar:
 * el botón se "pega" al papel. Esquinas casi rectas.
 */
type ButtonVariant = "primary" | "accent" | "ghost" | "outline";
type ButtonSize = "md" | "sm";

const buttonBase =
  "group/btn inline-flex items-center justify-center gap-2 rounded-[var(--r-sm)] font-semibold tracking-[0.01em] transition-[transform,box-shadow,background-color,color] duration-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

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
      ? "min-h-[34px] px-3.5 text-[var(--t-small)]"
      : "min-h-[var(--tap)] px-5 text-[var(--t-body)]";

  // El offset block + el "press" (translate) viven en cada variante para
  // poder teñir la sombra con su color.
  const variants: Record<ButtonVariant, string> = {
    primary:
      "border border-[var(--c-ink)] bg-[var(--c-ink)] text-[var(--c-ink-onink)] shadow-[var(--shadow-2)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--c-ink)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_var(--c-ink)] focus-visible:shadow-[var(--ring-focus)]",
    accent:
      "border border-[var(--c-accent-700)] bg-[var(--c-accent)] text-[var(--c-ink-onaccent)] shadow-[var(--shadow-accent)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--c-accent-700)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_var(--c-accent-700)] focus-visible:shadow-[var(--ring-accent)]",
    outline:
      "border border-[var(--c-ink)] bg-transparent text-[var(--c-ink)] hover:bg-[var(--c-ink)] hover:text-[var(--c-ink-onink)] focus-visible:shadow-[var(--ring-focus)]",
    ghost:
      "border border-transparent text-[var(--c-ink-muted)] underline-offset-4 hover:text-[var(--c-accent)] hover:underline focus-visible:shadow-[var(--ring-focus)]",
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

/* ── Card (ficha) ─────────────────────────────────────────────────────
 * Borde de tinta hairline, sin sombra blanda. La "elevación" se logra
 * con el bloque de offset sólido cuando hace falta destacar.
 */
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
        "rounded-[var(--r-md)] border border-[var(--c-border-strong)] bg-[var(--c-surface)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

/* ── Label ──────────────────────────────────────────────────────────── */
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
      className="mb-1.5 block text-[var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]"
    >
      {children}
      {required && <span className="ml-1 text-[var(--c-accent)]">*</span>}
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
      className="mt-1.5 flex items-center gap-1.5 text-[var(--t-micro)] leading-snug"
      style={{ color: error ? "var(--c-danger)" : "var(--c-ink-subtle)" }}
    >
      {error && <span aria-hidden className="font-bold">!</span>}
      {children}
    </p>
  );
}

/* Controles: estilo "renglón de planilla". Fondo papel, borde inferior
 * marcado (la regla del renglón) + bordes laterales hairline tenues.
 */
const controlBase =
  "w-full rounded-[var(--r-sm)] border border-[var(--c-border-strong)] border-b-2 bg-[var(--c-surface-3)] px-3 text-[var(--t-body)] text-[var(--c-ink)] transition-[border-color,box-shadow,background-color] duration-100 placeholder:text-[var(--c-ink-subtle)] placeholder:italic focus:outline-none focus:bg-[var(--c-surface)] disabled:cursor-not-allowed disabled:bg-[var(--c-paper-2)] disabled:text-[var(--c-ink-subtle)]";

const controlState = {
  normal:
    "focus:border-[var(--c-ink)] focus:border-b-[var(--c-accent)]",
  error:
    "border-[var(--c-danger)] border-b-[var(--c-danger)] focus:border-[var(--c-danger)]",
} as const;

/* ── Input ───────────────────────────────────────────────────────────── */
export function Input({
  id,
  type = "text",
  placeholder,
  defaultValue,
  value,
  disabled,
  invalid,
  autoFocus,
  mono = false,
}: {
  id?: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  mono?: boolean;
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
        mono && "font-[family-name:var(--font-mono)] tracking-[var(--ls-mono)]",
        invalid ? controlState.error : controlState.normal,
      )}
    />
  );
}

/* ── Select ──────────────────────────────────────────────────────────── */
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
          "min-h-[var(--tap)] cursor-pointer appearance-none pr-10",
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
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--c-ink-muted)]"
      >
        <path
          d="M5 8 10 13 15 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="square"
        />
      </svg>
    </div>
  );
}

/* ── Textarea ────────────────────────────────────────────────────────── */
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
      className={cn(controlBase, "resize-none py-2.5 leading-[var(--lh-body)]", controlState.normal)}
    />
  );
}

/* ── Checkbox (casilla cuadrada de planilla) ─────────────────────────── */
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
        "flex min-h-[34px] cursor-pointer items-center gap-3 text-[var(--t-body)] text-[var(--c-ink)]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[var(--r-xs)] border border-[var(--c-ink)] bg-[var(--c-surface)] transition-colors checked:border-[var(--c-accent)] checked:bg-[var(--c-accent)] focus-visible:shadow-[var(--ring-focus)] focus-visible:outline-none disabled:cursor-not-allowed"
        />
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-[var(--c-ink-onaccent)] opacity-0 peer-checked:opacity-100"
        >
          <path
            d="M4 10.5 8 14.5 16 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="square"
          />
        </svg>
      </span>
      {label}
    </label>
  );
}

/* ── Section title (índice impreso: número + regla + título) ─────────── */
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
        <p className="mb-1 text-[var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-accent)]">
          {kicker}
        </p>
      )}
      <h3 className="font-[family-name:var(--font-display)] text-[var(--t-h3)] font-medium leading-[var(--lh-snug)] tracking-[var(--ls-display)] text-[var(--c-ink)]">
        {children}
      </h3>
    </div>
  );
}

/* ── Hairline rule con etiqueta (sello editorial) ────────────────────── */
export function RuledLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {children}
      </span>
      <span className="h-px flex-1 bg-[var(--c-border-strong)]" />
    </div>
  );
}
