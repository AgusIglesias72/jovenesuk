import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "critical" | "danger";
export type ButtonSize = "sm" | "default" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/**
 * Button — JUK design system primitive.
 *
 * Variants in strict priority of visual weight:
 *  - primary    → ONE per screen. Main action. Navy.
 *  - critical   → Coral. RESERVED for confirm-final-payment, hard commits.
 *                 If a screen has 2+ critical buttons, redesign.
 *  - secondary  → Cancel, alternate. Outline.
 *  - danger     → Outlined red. Destructive (dar de baja, eliminar).
 *  - ghost      → Low-emphasis (table row actions, sidebar).
 *
 * Sizes: sm (32px), default (36px), lg (--tap, 44px), icon (36×36 square).
 *
 * @example
 *   <Button>Guardar cambios</Button>
 *   <Button variant="critical">Confirmar último pago</Button>
 *   <Button variant="ghost" size="sm">Abrir</Button>
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] hover:bg-[var(--c-brand-700)] focus-visible:shadow-[shadow:var(--ring-focus)]",
  secondary:
    "border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink)] shadow-[shadow:var(--shadow-soft)] hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)] focus-visible:shadow-[shadow:var(--ring-focus)]",
  ghost:
    "border-transparent bg-transparent text-[var(--c-ink-muted)] hover:bg-[var(--c-overlay)] hover:text-[var(--c-ink)] focus-visible:shadow-[shadow:var(--ring-focus)]",
  critical:
    "border-transparent bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)] hover:brightness-[1.03] focus-visible:shadow-[shadow:var(--ring-accent)]",
  danger:
    "border-[var(--c-danger)] bg-[var(--c-surface)] text-[var(--c-danger)] hover:bg-[var(--c-danger-bg)] focus-visible:shadow-[shadow:var(--ring-error)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:      "min-h-[32px] px-3.5 text-[length:var(--t-label)]",
  default: "min-h-[36px] px-4 text-[length:var(--t-small)]",
  lg:      "min-h-[var(--tap)] px-6 text-[length:var(--t-body)]",
  icon:    "min-h-[36px] w-9 p-0 justify-center",
};

/** Clases del Button, reutilizables por LinkButton para mantener un único look. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "default",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-pill)] border font-semibold",
    "transition-[transform,box-shadow,background-color,border-color,color] duration-150 active:scale-[0.97]",
    "focus-visible:outline-none",
    "disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", className, leadingIcon, trailingIcon, children, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {leadingIcon && <span className="flex-shrink-0">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="flex-shrink-0">{trailingIcon}</span>}
    </button>
  )
);
Button.displayName = "Button";
