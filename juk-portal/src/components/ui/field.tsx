import { cloneElement, forwardRef, isValidElement, useId } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Form primitives — JUK design system.
 *
 * Density rules:
 *  - Single column at narrow widths
 *  - Two columns at >640px (use `grid grid-cols-2 gap-4`)
 *  - 16px gap between fields (NOT 24px)
 *  - Required asterisk = coral (signals "this matters")
 *
 * @example
 *   <Field label="Nombre" required help="Como figura en el pasaporte">
 *     <Input value={name} onChange={(e) => setName(e.target.value)} />
 *   </Field>
 */

/* ============================================================
   Label
   ============================================================ */

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, required, className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-[var(--c-accent-600)] ml-0.5">*</span>}
    </label>
  );
}

/* ============================================================
   Input
   ============================================================ */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const controlBase = cn(
  "w-full rounded-[var(--r-md)] border bg-[var(--c-surface)] px-4 text-[length:var(--t-body)] text-[var(--c-ink)]",
  "placeholder:text-[var(--c-ink-subtle)]",
  "transition-[border-color,box-shadow] duration-150",
  "focus:outline-none",
  "disabled:bg-[var(--c-surface-2)] disabled:text-[var(--c-ink-subtle)] disabled:cursor-not-allowed"
);

const controlState = {
  normal:
    "border-[var(--c-border-strong)] focus:border-[var(--c-brand-300)] focus:shadow-[shadow:var(--ring-focus)]",
  error:
    "border-[var(--c-danger)] shadow-[shadow:var(--ring-error)] focus:border-[var(--c-danger)] focus:shadow-[shadow:var(--ring-error)]",
} as const;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        controlBase,
        "min-h-[var(--tap)]",
        invalid ? controlState.error : controlState.normal,
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

/* ============================================================
   Textarea
   ============================================================ */

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        controlBase,
        "min-h-[96px] resize-y py-3 leading-[var(--lh-body)]",
        invalid ? controlState.error : controlState.normal,
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/* ============================================================
   Select (with chevron)
   ============================================================ */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          controlBase,
          "min-h-[var(--tap)] cursor-pointer appearance-none pr-11",
          invalid ? controlState.error : controlState.normal,
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-ink-subtle)]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 7.5 10 12.5 15 7.5" />
      </svg>
    </div>
  )
);
Select.displayName = "Select";

/* ============================================================
   Help & Error text
   ============================================================ */

export function HelpText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[length:var(--t-small)] text-[var(--c-ink-subtle)] mt-0.5", className)}>
      {children}
    </span>
  );
}

export function ErrorText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn("text-[length:var(--t-small)] font-medium text-[var(--c-danger)] mt-0.5", className)}
      role="alert"
    >
      {children}
    </span>
  );
}

/* ============================================================
   Field — composed wrapper for the common label+input+help pattern
   ============================================================ */

interface FieldProps {
  label?: React.ReactNode;
  required?: boolean;
  help?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, required, help, error, children, className }: FieldProps) {
  const id = useId();
  // Asocia el label con el control inyectándole el id (accesibilidad + testabilidad).
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {control}
      {error ? <ErrorText>{error}</ErrorText> : help ? <HelpText>{help}</HelpText> : null}
    </div>
  );
}

/* ============================================================
   Checkbox — custom box with JUK navy accent
   ============================================================ */

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "inline-flex min-h-[var(--tap)] items-center gap-3 cursor-pointer select-none text-[length:var(--t-body)]",
        className
      )}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        <input
          type="checkbox"
          className="peer absolute h-full w-full opacity-0 cursor-pointer"
          {...props}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-[var(--r-xs)] border border-[var(--c-border-strong)] bg-[var(--c-surface)]",
            "transition-colors duration-150",
            "peer-checked:border-[var(--c-brand)] peer-checked:bg-[var(--c-brand)]",
            "peer-focus-visible:shadow-[shadow:var(--ring-focus)]"
          )}
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none relative h-3 w-3 text-[var(--c-ink-onbrand)] opacity-0 peer-checked:opacity-100 transition-opacity duration-150"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.5L5 9l4.5-5.5" />
        </svg>
      </span>
      <span className="text-[var(--c-ink)]">{label}</span>
    </label>
  );
}
