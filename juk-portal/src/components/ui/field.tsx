import { forwardRef, useId } from "react";
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
        "text-xs font-semibold uppercase tracking-wide text-gray-700",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-juk-coral-600 ml-0.5">*</span>}
    </label>
  );
}

/* ============================================================
   Input
   ============================================================ */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900",
        "placeholder:text-gray-400",
        "transition-colors duration-150",
        "focus:outline-none focus:shadow-focus",
        invalid
          ? "border-red-600 focus:border-red-600"
          : "border-gray-300 hover:border-gray-400 focus:border-juk-navy-700",
        "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed",
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
        "w-full min-h-[80px] rounded-md border bg-white px-3 py-2 text-sm text-gray-900 leading-normal resize-y",
        "placeholder:text-gray-400",
        "transition-colors duration-150",
        "focus:outline-none focus:shadow-focus",
        invalid
          ? "border-red-600 focus:border-red-600"
          : "border-gray-300 hover:border-gray-400 focus:border-juk-navy-700",
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
          "w-full appearance-none rounded-md border bg-white px-3 py-2 pr-8 text-sm text-gray-900",
          "transition-colors duration-150",
          "focus:outline-none focus:shadow-focus",
          invalid
            ? "border-red-600"
            : "border-gray-300 hover:border-gray-400 focus:border-juk-navy-700",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 12 8"
        className="pointer-events-none absolute right-3 top-1/2 h-2 w-3 -translate-y-1/2 text-gray-600"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 1.5L6 6.5L11 1.5" />
      </svg>
    </div>
  )
);
Select.displayName = "Select";

/* ============================================================
   Help & Error text
   ============================================================ */

export function HelpText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-xs text-gray-500 mt-0.5", className)}>{children}</span>;
}

export function ErrorText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs font-medium text-red-700 mt-0.5", className)} role="alert">
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
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children}
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
    <label className={cn("inline-flex items-center gap-2 cursor-pointer select-none text-sm", className)}>
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <input
          type="checkbox"
          className="peer absolute h-full w-full opacity-0 cursor-pointer"
          {...props}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-sm border-[1.5px] border-gray-400 bg-white",
            "transition-colors duration-150",
            "peer-checked:border-juk-navy-900 peer-checked:bg-juk-navy-900",
            "peer-focus-visible:shadow-focus"
          )}
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none relative h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.5L5 9l4.5-5.5" />
        </svg>
      </span>
      <span className="text-gray-900">{label}</span>
    </label>
  );
}
