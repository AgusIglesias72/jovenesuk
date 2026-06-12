"use client";

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
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
   Select — desplegable con el diseño del sistema (no nativo)

   El <select> nativo queda invisible debajo y sigue siendo la
   fuente de verdad: forms, label/getByLabel y selectOption de
   Playwright operan sobre él; la UI custom lo espeja.
   ============================================================ */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

type Opcion = { value: string; label: string; disabled: boolean };

function textoPlano(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textoPlano).join("");
  return "";
}

function opcionesDe(children: React.ReactNode): Opcion[] {
  const out: Opcion[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      const p = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
      const label = textoPlano(p.children);
      out.push({
        value: p.value != null ? String(p.value) : label,
        label,
        disabled: Boolean(p.disabled),
      });
    } else {
      const p = child.props as { children?: React.ReactNode };
      if (p.children) out.push(...opcionesDe(p.children));
    }
  });
  return out;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, className, children, id, disabled, value, defaultValue, onChange, ...props }, ref) => {
    const opciones = opcionesDe(children);
    const selectRef = useRef<HTMLSelectElement | null>(null);
    const botonRef = useRef<HTMLButtonElement>(null);
    const listaRef = useRef<HTMLUListElement>(null);
    const [open, setOpen] = useState(false);
    const [interno, setInterno] = useState<string>(() => {
      if (defaultValue != null) return String(defaultValue);
      return opciones.find((o) => !o.disabled)?.value ?? opciones[0]?.value ?? "";
    });

    const actual = value != null ? String(value) : interno;
    const seleccionada = opciones.find((o) => o.value === actual);

    // Elegir desde la lista: se escribe en el select nativo y se emite `change`,
    // así el flujo (React onChange, forms, tests) es el mismo que el nativo.
    function elegir(v: string) {
      const el = selectRef.current;
      if (el) {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
        setter?.call(el, v);
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setOpen(false);
      botonRef.current?.focus();
    }

    useEffect(() => {
      if (!open) return;
      const lista = listaRef.current;
      lista
        ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" });
      lista?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    }, [open]);

    function navegarLista(e: React.KeyboardEvent) {
      const botones = Array.from(
        listaRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []
      );
      const idx = botones.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        botones[Math.min(idx + 1, botones.length - 1)]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        botones[Math.max(idx - 1, 0)]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        botones[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        botones[botones.length - 1]?.focus();
      } else if (e.key === "Escape" || e.key === "Tab") {
        setOpen(false);
        botonRef.current?.focus();
      }
    }

    return (
      <div className={cn("relative", className)}>
        {/* Select nativo invisible: fuente de verdad (forms, a11y del label, tests). */}
        <select
          ref={(el) => {
            selectRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          id={id}
          disabled={disabled}
          value={value}
          defaultValue={value == null ? defaultValue : undefined}
          onChange={(e) => {
            setInterno(e.target.value);
            onChange?.(e);
          }}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          {...props}
        >
          {children}
        </select>

        <button
          type="button"
          ref={botonRef}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={seleccionada?.label || undefined}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={cn(
            "flex min-h-[var(--tap)] w-full items-center justify-between gap-3 rounded-[var(--r-md)] border bg-[var(--c-surface)] px-4 text-left text-[length:var(--t-body)]",
            "transition-[border-color,box-shadow] duration-150 focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-[var(--c-surface-2)] disabled:text-[var(--c-ink-subtle)]",
            invalid
              ? controlState.error
              : open
                ? "border-[var(--c-brand-300)] shadow-[shadow:var(--ring-focus)]"
                : "border-[var(--c-border-strong)] focus-visible:border-[var(--c-brand-300)] focus-visible:shadow-[shadow:var(--ring-focus)]"
          )}
        >
          <span
            className={cn(
              "truncate",
              actual === "" || !seleccionada
                ? "text-[var(--c-ink-subtle)]"
                : "text-[var(--c-ink)]"
            )}
          >
            {seleccionada?.label || "Elegí una opción…"}
          </span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--c-ink-subtle)] transition-transform duration-200",
              open && "rotate-180 text-[var(--c-brand)]"
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 7.5 10 12.5 15 7.5" />
          </svg>
        </button>

        {open && (
          <>
            <button
              type="button"
              aria-label="cerrar opciones"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <ul
              ref={listaRef}
              role="listbox"
              onKeyDown={navegarLista}
              className="absolute z-50 mt-2 flex max-h-64 w-full flex-col gap-1 overflow-y-auto rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-1.5 shadow-[shadow:var(--shadow-2)]"
            >
              {opciones.map((o) => {
                const activa = o.value === actual;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={activa}
                      disabled={o.disabled}
                      onClick={() => elegir(o.value)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left text-[length:var(--t-small)] transition-colors",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        activa
                          ? "bg-[var(--c-brand-50)] font-semibold text-[var(--c-brand)]"
                          : "font-medium text-[var(--c-ink)] hover:bg-[var(--c-surface-2)]"
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      {activa && (
                        <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0">
                          <path
                            d="M4 10.5 8 14.5 16 5.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    );
  }
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
