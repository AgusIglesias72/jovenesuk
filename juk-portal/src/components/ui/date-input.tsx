"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * DateInput — fecha con el calendario del design lab (STUDIO) en vez del
 * datepicker nativo del navegador.
 *
 * El <input type="date"> nativo queda invisible debajo como fuente de verdad:
 * mantiene el formato ISO del form, el label (getByLabel) y el .fill() de
 * Playwright. La UI visible muestra DD/MM/YYYY y abre el calendario propio.
 *
 * API compatible con <Input type="date">: value ISO + onChange con e.target.value.
 */

const DOW = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function parseISO(v: string | undefined | null): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function aISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fmtDDMM(d: Date | null): string {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  invalid?: boolean;
}

export function DateInput({
  value,
  defaultValue,
  invalid,
  className,
  id,
  disabled,
  onChange,
  placeholder,
  ...props
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [interno, setInterno] = useState(defaultValue ?? "");

  const actual = value != null ? value : interno;
  const fecha = parseISO(actual);

  const hoy = new Date();
  const [vista, setVista] = useState(() => ({
    y: (fecha ?? hoy).getFullYear(),
    m: (fecha ?? hoy).getMonth(),
  }));

  // Al abrir, el calendario arranca en el mes de la fecha actual del input.
  function alternar() {
    if (!open && fecha) setVista({ y: fecha.getFullYear(), m: fecha.getMonth() });
    setOpen((v) => !v);
  }

  const offset = (new Date(vista.y, vista.m, 1).getDay() + 6) % 7; // semana arranca lunes
  const totalDias = new Date(vista.y, vista.m + 1, 0).getDate();

  const moverMes = (delta: number) =>
    setVista(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  function elegir(dia: number) {
    const iso = aISO(vista.y, vista.m, dia);
    const el = inputRef.current;
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, iso);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setOpen(false);
    botonRef.current?.focus();
  }

  const esDia = (d: Date | null, dia: number) =>
    !!d && d.getFullYear() === vista.y && d.getMonth() === vista.m && d.getDate() === dia;

  return (
    <div className={cn("relative", className)}>
      {/* Input nativo invisible: fuente de verdad (form, label, tests). */}
      <input
        ref={inputRef}
        type="date"
        id={id}
        disabled={disabled}
        value={value != null ? value : undefined}
        defaultValue={value == null ? defaultValue : undefined}
        onChange={(e) => {
          setInterno(e.target.value);
          onChange?.(e);
        }}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        {...props}
      />

      <button
        type="button"
        ref={botonRef}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={fecha ? `fecha: ${fmtDDMM(fecha)}` : "elegir fecha"}
        onClick={alternar}
        className={cn(
          "flex min-h-[var(--tap)] w-full items-center justify-between gap-3 rounded-[var(--r-md)] border bg-[var(--c-surface)] px-4 text-left",
          "font-mono text-[length:var(--t-body)] transition-[border-color,box-shadow] duration-150 focus:outline-none",
          "disabled:cursor-not-allowed disabled:bg-[var(--c-surface-2)] disabled:text-[var(--c-ink-subtle)]",
          invalid
            ? "border-[var(--c-danger)] shadow-[shadow:var(--ring-error)]"
            : open
              ? "border-[var(--c-brand-300)] shadow-[shadow:var(--ring-focus)]"
              : "border-[var(--c-border-strong)] focus-visible:border-[var(--c-brand-300)] focus-visible:shadow-[shadow:var(--ring-focus)]"
        )}
      >
        <span className={fecha ? "text-[var(--c-ink)]" : "text-[var(--c-ink-subtle)]"}>
          {fecha ? fmtDDMM(fecha) : (placeholder ?? "DD/MM/AAAA")}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="h-4 w-4 shrink-0 text-[var(--c-ink-subtle)]"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
        >
          <rect x={3} y={4.5} width={14} height={12} rx={2} />
          <path d="M3 8.5h14M7 2.5v4M13 2.5v4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="cerrar calendario"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="dialog"
            aria-label="elegir fecha"
            className="absolute z-50 mt-2 w-[296px] rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-2)]"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                botonRef.current?.focus();
              }
            }}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => moverMes(-1)}
                aria-label="mes anterior"
                className="grid h-9 w-9 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-brand)] active:scale-95"
              >
                ←
              </button>
              <p className="font-display text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
                {MESES[vista.m]} {vista.y}
              </p>
              <button
                type="button"
                onClick={() => moverMes(1)}
                aria-label="mes siguiente"
                className="grid h-9 w-9 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-brand)] active:scale-95"
              >
                →
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 text-center">
              {DOW.map((d, i) => (
                <span
                  key={`${d}${i}`}
                  className="pb-2 text-[length:var(--t-label)] font-bold uppercase text-[var(--c-ink-subtle)]"
                >
                  {d}
                </span>
              ))}
              {Array.from({ length: offset }).map((_, i) => (
                <span key={`pad${i}`} />
              ))}
              {Array.from({ length: totalDias }, (_, i) => i + 1).map((dia) => {
                const elegido = esDia(fecha, dia);
                const esHoy = esDia(hoy, dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => elegir(dia)}
                    className={cn(
                      "relative mx-auto my-0.5 grid h-9 w-9 place-items-center rounded-[var(--r-pill)] text-[length:var(--t-small)] font-semibold transition-colors",
                      elegido
                        ? "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
                        : esHoy
                          ? "border border-[var(--c-brand-300)] text-[var(--c-brand)] hover:bg-[var(--c-brand-50)]"
                          : "text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)]"
                    )}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
