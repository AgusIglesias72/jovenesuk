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
 * Sizes: sm (28px), default (32px), lg (40px), icon (32×32 square).
 *
 * @example
 *   <Button>Guardar cambios</Button>
 *   <Button variant="critical">Confirmar último pago</Button>
 *   <Button variant="ghost" size="sm">Abrir</Button>
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-juk-navy-900 text-white border-juk-navy-900 hover:bg-juk-navy-800 hover:border-juk-navy-800 active:bg-juk-navy-950",
  secondary:
    "bg-white text-juk-navy-900 border-gray-300 hover:bg-gray-50 hover:border-gray-400",
  ghost:
    "bg-transparent text-gray-700 border-transparent hover:bg-gray-100 hover:text-gray-900",
  critical:
    "bg-juk-coral-600 text-white border-juk-coral-600 hover:bg-juk-coral-700 hover:border-juk-coral-700",
  danger:
    "bg-white text-red-700 border-red-600 hover:bg-red-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:      "h-7 px-3 text-xs",
  default: "h-8 px-4 text-sm",
  lg:      "h-10 px-5 text-base",
  icon:    "h-8 w-8 p-0 justify-center",
};

/** Clases del Button, reutilizables por LinkButton para mantener un único look. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "default",
  className?: string
) {
  return cn(
    "inline-flex items-center gap-2 whitespace-nowrap rounded-md border font-semibold tracking-tight",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:shadow-focus",
    "disabled:opacity-50 disabled:cursor-not-allowed",
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
