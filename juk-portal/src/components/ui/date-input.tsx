"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  clasesPopover,
  medirPopover,
  varsPopover,
  type PosicionPopover,
} from "@/components/ui/popover-position";
import { unirIds } from "@/lib/utils/aria";
import { cn } from "@/lib/utils/cn";

/**
 * DateInput — fecha con el calendario del design lab (STUDIO) en vez del
 * datepicker nativo del navegador.
 *
 * El <input type="date"> nativo queda invisible debajo como fuente de verdad:
 * mantiene el formato ISO del form, el label (getByLabel) y el .fill() de
 * Playwright. Encima hay un input de texto visible donde se puede TIPEAR la
 * fecha en DD/MM/AAAA, y un calendario propio que navega días → meses → años
 * (para saltar a un año lejano sin clickear de a un mes).
 *
 * API compatible con <Input type="date">: value ISO + onChange con e.target.value.
 */

const DOW = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

type Modo = "dias" | "meses" | "anios";

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

// "12052010" → "12/05/2010", parcial incluido ("1205" → "12/05").
function formatearTipeo(raw: string): string {
  const n = raw.replace(/\D/g, "").slice(0, 8);
  let out = n.slice(0, 2);
  if (n.length > 2) out += "/" + n.slice(2, 4);
  if (n.length > 4) out += "/" + n.slice(4, 8);
  return out;
}

function fechaValida(d: number, m: number, y: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  invalid?: boolean;
}

/** Ancho ideal del calendario: 7 columnas de 36px + padding. */
const ANCHO_CALENDARIO = 296;

export function DateInput({
  value,
  defaultValue,
  invalid,
  className,
  id,
  disabled,
  onChange,
  placeholder,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textoRef = useRef<HTMLInputElement>(null);
  const campoRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PosicionPopover | null>(null);
  const [modo, setModo] = useState<Modo>("dias");
  const [interno, setInterno] = useState(defaultValue ?? "");
  const [enfocado, setEnfocado] = useState(false);
  const [texto, setTexto] = useState(() =>
    fmtDDMM(parseISO(value != null ? value : (defaultValue ?? ""))),
  );

  const actual = value != null ? value : interno;
  const fecha = parseISO(actual);

  const hoy = new Date();
  const [vista, setVista] = useState(() => ({
    y: (fecha ?? hoy).getFullYear(),
    m: (fecha ?? hoy).getMonth(),
  }));

  // Mientras no se esté tipeando, el texto visible refleja el valor del form.
  useEffect(() => {
    if (enfocado) return;
    // Sync controlado desde el valor ISO (no hay equivalente en render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTexto(fmtDDMM(parseISO(actual)));
  }, [actual, enfocado]);

  // Escribe el valor ISO en el input nativo (fuente de verdad) y dispara los
  // eventos para que el form / onChange se enteren, igual que un input real.
  function commitISO(iso: string) {
    const el = inputRef.current;
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(el, iso);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function alTipear(raw: string) {
    const n = raw.replace(/\D/g, "").slice(0, 8);
    setTexto(formatearTipeo(raw));
    if (n.length === 0) {
      commitISO("");
      return;
    }
    if (n.length === 8) {
      const d = Number(n.slice(0, 2));
      const m = Number(n.slice(2, 4));
      const y = Number(n.slice(4, 8));
      if (fechaValida(d, m, y)) {
        commitISO(aISO(y, m - 1, d));
        setVista({ y, m: m - 1 });
      }
    }
  }

  const medir = useCallback(() => {
    if (campoRef.current) {
      setPos(medirPopover(campoRef.current, { ancho: ANCHO_CALENDARIO, altoDeseado: 360 }));
    }
  }, []);

  const cerrar = useCallback(() => {
    setOpen(false);
    textoRef.current?.focus();
  }, []);

  // Al abrir, el calendario arranca en el mes de la fecha actual y en vista de días.
  function alternar() {
    if (open) {
      cerrar();
      return;
    }
    if (fecha) setVista({ y: fecha.getFullYear(), m: fecha.getMonth() });
    setModo("dias");
    medir();
    setOpen(true);
  }

  // El calendario se monta en un portal con posición fija: hay que volver a
  // medirlo si la página scrollea o cambia el tamaño de la ventana. Escape se
  // escucha en el documento porque el foco puede seguir en el campo de texto.
  useEffect(() => {
    if (!open) return;
    const reposicionar = () => medir();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("scroll", reposicionar, true);
    window.addEventListener("resize", reposicionar);
    document.addEventListener("keydown", alTeclear);
    return () => {
      window.removeEventListener("scroll", reposicionar, true);
      window.removeEventListener("resize", reposicionar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [open, medir, cerrar]);

  const offset = (new Date(vista.y, vista.m, 1).getDay() + 6) % 7; // semana arranca lunes
  const totalDias = new Date(vista.y, vista.m + 1, 0).getDate();
  const inicioBloque = Math.floor(vista.y / 12) * 12; // bloque de 12 años alineado

  const moverAnio = (delta: number) => setVista(({ y, m }) => ({ y: y + delta, m }));
  const moverMes = (delta: number) =>
    setVista(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  function anterior() {
    if (modo === "dias") moverMes(-1);
    else if (modo === "meses") moverAnio(-1);
    else moverAnio(-12);
  }
  function siguiente() {
    if (modo === "dias") moverMes(1);
    else if (modo === "meses") moverAnio(1);
    else moverAnio(12);
  }

  function elegirDia(dia: number) {
    commitISO(aISO(vista.y, vista.m, dia));
    cerrar();
  }

  const esDia = (d: Date | null, dia: number) =>
    !!d && d.getFullYear() === vista.y && d.getMonth() === vista.m && d.getDate() === dia;

  const tituloCabecera =
    modo === "dias"
      ? `${MESES[vista.m]} ${vista.y}`
      : modo === "meses"
        ? `${vista.y}`
        : `${inicioBloque}–${inicioBloque + 11}`;

  function subirNivel() {
    setModo((m) => (m === "dias" ? "meses" : m === "meses" ? "anios" : "anios"));
  }

  const navBtn =
    "grid h-9 w-9 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-brand)] active:scale-95";
  const celdaBtn =
    "grid place-items-center rounded-[var(--r-md)] text-[length:var(--t-small)] font-semibold transition-colors";

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
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        {...props}
      />

      <div
        ref={campoRef}
        className={cn(
          "flex min-h-[var(--tap)] w-full items-center gap-1 rounded-[var(--r-md)] border bg-[var(--c-surface)] pl-4 pr-1 transition-[border-color,box-shadow] duration-150",
          disabled && "cursor-not-allowed bg-[var(--c-surface-2)]",
          invalid
            ? "border-[var(--c-danger)] shadow-[shadow:var(--ring-error)]"
            : open
              ? "border-[var(--c-brand-300)] shadow-[shadow:var(--ring-focus)]"
              : "border-[var(--c-border-strong)] focus-within:border-[var(--c-brand-300)] focus-within:shadow-[shadow:var(--ring-focus)]",
        )}
      >
        <input
          ref={textoRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={texto}
          placeholder={placeholder ?? "DD/MM/AAAA"}
          aria-label="Fecha (DD/MM/AAAA)"
          // El nombre del campo viaja como descripción: el <input type="date">
          // oculto es el que el <label> nombra (y el que buscan los tests), y
          // repetir el nombre haría que un label resuelva a dos controles.
          aria-describedby={unirIds(ariaLabelledBy, ariaDescribedBy)}
          aria-invalid={invalid ? true : ariaInvalid}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onChange={(e) => alTipear(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              alternar();
            }
          }}
          className="min-w-0 flex-1 bg-transparent py-0 font-mono text-[length:var(--t-body)] text-[var(--c-ink)] placeholder:text-[var(--c-ink-subtle)] focus:outline-none disabled:cursor-not-allowed disabled:text-[var(--c-ink-subtle)]"
        />
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="elegir fecha en el calendario"
          onClick={alternar}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-sm)] text-[var(--c-ink-subtle)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-brand)] disabled:cursor-not-allowed"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
          >
            <rect x={3} y={4.5} width={14} height={12} rx={2} />
            <path d="M3 8.5h14M7 2.5v4M13 2.5v4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* El calendario se monta en un portal sobre document.body para que no lo
          recorte ningún contenedor con overflow ni se salga del viewport. */}
      {open &&
        pos &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="cerrar calendario"
              tabIndex={-1}
              onClick={cerrar}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="dialog"
              aria-label="elegir fecha"
              style={varsPopover(pos)}
              className={cn(
                clasesPopover(pos),
                "overflow-y-auto rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-2)]"
              )}
            >
              <div className="flex items-center justify-between">
                <button type="button" onClick={anterior} aria-label="anterior" className={navBtn}>
                  ←
                </button>
                <button
                  type="button"
                  onClick={subirNivel}
                  disabled={modo === "anios"}
                  aria-label="cambiar de vista"
                  className="rounded-[var(--r-pill)] px-3 py-1 font-display text-[length:var(--t-small)] font-bold text-[var(--c-ink)] transition-colors hover:bg-[var(--c-surface-2)] disabled:hover:bg-transparent"
                >
                  {tituloCabecera}
                </button>
                <button type="button" onClick={siguiente} aria-label="siguiente" className={navBtn}>
                  →
                </button>
              </div>

              {modo === "dias" && (
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
                        onClick={() => elegirDia(dia)}
                        className={cn(
                          celdaBtn,
                          "mx-auto my-0.5 h-9 w-9 rounded-[var(--r-pill)]",
                          elegido
                            ? "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
                            : esHoy
                              ? "border border-[var(--c-brand-300)] text-[var(--c-brand)] hover:bg-[var(--c-brand-50)]"
                              : "text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)]",
                        )}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              )}

              {modo === "meses" && (
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {MESES_CORTO.map((mes, i) => {
                    const elegido = !!fecha && fecha.getFullYear() === vista.y && fecha.getMonth() === i;
                    const esActual = hoy.getFullYear() === vista.y && hoy.getMonth() === i;
                    return (
                      <button
                        key={mes}
                        type="button"
                        onClick={() => {
                          setVista(({ y }) => ({ y, m: i }));
                          setModo("dias");
                        }}
                        className={cn(
                          celdaBtn,
                          "h-11",
                          elegido
                            ? "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
                            : esActual
                              ? "border border-[var(--c-brand-300)] text-[var(--c-brand)] hover:bg-[var(--c-brand-50)]"
                              : "text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)]",
                        )}
                      >
                        {mes}
                      </button>
                    );
                  })}
                </div>
              )}

              {modo === "anios" && (
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => inicioBloque + i).map((anio) => {
                    const elegido = !!fecha && fecha.getFullYear() === anio;
                    const esActual = hoy.getFullYear() === anio;
                    return (
                      <button
                        key={anio}
                        type="button"
                        onClick={() => {
                          setVista(({ m }) => ({ y: anio, m }));
                          setModo("meses");
                        }}
                        className={cn(
                          celdaBtn,
                          "h-11",
                          elegido
                            ? "bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
                            : esActual
                              ? "border border-[var(--c-brand-300)] text-[var(--c-brand)] hover:bg-[var(--c-brand-50)]"
                              : "text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)]",
                        )}
                      >
                        {anio}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
