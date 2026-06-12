/* ============================================================================
   Primitivos LOCALES de la dirección "CONSOLE".
   Autocontenidos: NO importan de @/components/ui. Referencian SOLO tokens.css
   vía Tailwind arbitrary values (var(--token)).
   ============================================================================ */
import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

/* ---- util: cn ----------------------------------------------------------- */
function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ---- Button ------------------------------------------------------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BTN_BASE =
  "inline-flex items-center justify-center gap-[var(--s-2)] whitespace-nowrap font-[var(--font-body)] " +
  "font-[number:var(--fw-semibold)] rounded-[var(--r-sm)] border transition-[background-color,border-color,box-shadow,color] " +
  "duration-150 outline-none focus-visible:shadow-[var(--sh-focus)] disabled:cursor-not-allowed disabled:opacity-50 " +
  "active:translate-y-px select-none";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--c-brand)] border-[var(--c-brand)] text-[var(--c-brand-ink)] shadow-[var(--sh-xs)] " +
    "hover:bg-[var(--c-brand-hover)] hover:border-[var(--c-brand-hover)] active:bg-[var(--c-brand-active)]",
  secondary:
    "bg-[var(--c-surface)] border-[var(--c-border-strong)] text-[var(--c-ink)] shadow-[var(--sh-xs)] " +
    "hover:bg-[var(--c-surface-3)] hover:border-[var(--c-border-strong)]",
  ghost:
    "bg-transparent border-transparent text-[var(--c-ink-2)] hover:bg-[var(--c-surface-3)] hover:text-[var(--c-ink)]",
  danger:
    "bg-[var(--c-surface)] border-[var(--c-border-strong)] text-[var(--c-danger-ink)] " +
    "hover:bg-[var(--c-danger-soft)] hover:border-[var(--c-danger)]",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-[28px] px-[var(--s-3)] text-[length:var(--t-sm)]",
  md: "h-[var(--control-h)] px-[var(--s-4)] text-[length:var(--t-base)]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)} {...props}>
      {children}
    </button>
  );
}

/* ---- Label + Field shell ------------------------------------------------ */
export function Label({
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
      className="flex items-center gap-[var(--s-1)] text-[length:var(--t-sm)] font-[number:var(--fw-medium)] text-[var(--c-ink-2)]"
    >
      {children}
      {required && <span className="text-[var(--c-danger)]">*</span>}
    </label>
  );
}

export function Field({
  label,
  required,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  required?: boolean;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-[var(--s-2)]", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-[var(--s-1)] text-[length:var(--t-xs)] font-[number:var(--fw-medium)] text-[var(--c-danger-ink)]">
          <span aria-hidden className="text-[var(--c-danger)]">
            ▲
          </span>
          {error}
        </p>
      ) : hint ? (
        <p className="text-[length:var(--t-xs)] text-[var(--c-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---- shared control surface --------------------------------------------- */
const CONTROL_BASE =
  "w-full font-[var(--font-body)] text-[length:var(--t-base)] text-[var(--c-ink)] bg-[var(--c-surface)] " +
  "border border-[var(--c-border-strong)] rounded-[var(--r-sm)] outline-none transition-[border-color,box-shadow] duration-150 " +
  "placeholder:text-[var(--c-ink-4)] " +
  "focus:border-[var(--c-brand)] focus:shadow-[var(--sh-focus)] " +
  "disabled:cursor-not-allowed disabled:bg-[var(--c-surface-3)] disabled:text-[var(--c-ink-4)]";

const CONTROL_ERROR =
  "border-[var(--c-danger)] focus:border-[var(--c-danger)] focus:shadow-[0_0_0_3px_var(--c-danger-soft)]";

/* ---- Input -------------------------------------------------------------- */
export function Input({
  error,
  mono,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean; mono?: boolean }) {
  return (
    <input
      className={cn(
        CONTROL_BASE,
        "h-[var(--control-h)] px-[var(--s-3)]",
        mono && "font-[var(--font-mono)] tracking-[0.01em]",
        error && CONTROL_ERROR,
        className,
      )}
      {...props}
    />
  );
}

/* ---- Textarea ----------------------------------------------------------- */
export function Textarea({
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={cn(CONTROL_BASE, "min-h-[84px] px-[var(--s-3)] py-[var(--s-2)] leading-[var(--lh-normal)] resize-y", error && CONTROL_ERROR, className)}
      {...props}
    />
  );
}

/* ---- Select ------------------------------------------------------------- */
export function Select({
  error,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <div className="relative">
      <select
        className={cn(
          CONTROL_BASE,
          "h-[var(--control-h)] pl-[var(--s-3)] pr-[var(--s-8)] appearance-none cursor-pointer",
          error && CONTROL_ERROR,
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-[var(--s-3)] top-1/2 size-[12px] -translate-y-1/2 text-[var(--c-ink-3)]"
      >
        <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---- Checkbox ----------------------------------------------------------- */
export function Checkbox({
  label,
  hint,
  id,
  checked,
  defaultChecked,
  disabled,
}: {
  label: string;
  hint?: string;
  id: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex items-start gap-[var(--s-3)] cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <span className="relative mt-px flex size-[18px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          readOnly={checked !== undefined}
          className="peer size-[18px] cursor-[inherit] appearance-none rounded-[var(--r-xs)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] outline-none transition-colors checked:border-[var(--c-brand)] checked:bg-[var(--c-brand)] focus-visible:shadow-[var(--sh-focus)]"
        />
        <svg
          aria-hidden
          viewBox="0 0 14 14"
          className="pointer-events-none absolute size-[12px] text-[var(--c-brand-ink)] opacity-0 peer-checked:opacity-100"
        >
          <path d="M2.5 7.5L5.5 10.5L11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="flex flex-col gap-[2px] leading-[var(--lh-snug)]">
        <span className="text-[length:var(--t-base)] font-[number:var(--fw-medium)] text-[var(--c-ink)]">{label}</span>
        {hint && <span className="text-[length:var(--t-xs)] text-[var(--c-ink-3)]">{hint}</span>}
      </span>
    </label>
  );
}

/* ---- Badge -------------------------------------------------------------- */
export function Badge({
  token,
  children,
  dot = true,
  className,
}: {
  token: string;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[var(--s-2)] rounded-[var(--r-full)] px-[var(--s-3)] py-[3px] " +
          "text-[length:var(--t-2xs)] font-[number:var(--fw-semibold)] uppercase tracking-[var(--ls-wide)] whitespace-nowrap",
        className,
      )}
      style={{
        backgroundColor: `var(--badge-${token}-bg)`,
        color: `var(--badge-${token}-ink)`,
      }}
    >
      {dot && (
        <span
          aria-hidden
          className="size-[6px] shrink-0 rounded-full"
          style={{ backgroundColor: `var(--badge-${token}-dot)` }}
        />
      )}
      {children}
    </span>
  );
}

/* ---- Card --------------------------------------------------------------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[var(--sh-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  meta,
  action,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-[var(--s-4)] border-b border-[var(--c-border)] bg-[var(--c-surface-2)] px-[var(--s-5)] py-[var(--s-3)]">
      <div className="flex items-baseline gap-[var(--s-3)]">
        <h3 className="text-[length:var(--t-sm)] font-[number:var(--fw-semibold)] uppercase tracking-[var(--ls-wide)] text-[var(--c-ink-2)]">
          {title}
        </h3>
        {meta && <span className="text-[length:var(--t-xs)] text-[var(--c-ink-3)]">{meta}</span>}
      </div>
      {action}
    </div>
  );
}

/* ---- Eyebrow / section label ------------------------------------------- */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-[length:var(--t-2xs)] font-[number:var(--fw-semibold)] uppercase tracking-[var(--ls-caps)] text-[var(--c-ink-3)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---- Mono helper -------------------------------------------------------- */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-[var(--font-mono)] tracking-[0.01em] tabular-nums", className)}>{children}</span>
  );
}

/* ---- Kbd ---------------------------------------------------------------- */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[var(--r-xs)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] px-[5px] font-[var(--font-mono)] text-[length:var(--t-2xs)] font-[number:var(--fw-medium)] text-[var(--c-ink-3)] shadow-[var(--sh-xs)]">
      {children}
    </kbd>
  );
}

export { cn };
