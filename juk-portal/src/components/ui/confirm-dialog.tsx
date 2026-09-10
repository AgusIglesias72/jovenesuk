"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils/cn";

import { Button } from "./button";
import { Label, Textarea } from "./field";
import { useScrollLock } from "./use-scroll-lock";

/**
 * Confirmación del design system (STUDIO) — reemplaza window.confirm/prompt.
 *
 * Uso (desde cualquier client component bajo el AdminShell):
 *   const confirm = useConfirm();
 *   const { confirmado } = await confirm({ titulo: "¿Dar de baja?", tone: "danger" });
 *   // con campo de texto (ex window.prompt):
 *   const { confirmado, valor } = await confirm({ titulo: "…", campo: { label: "Motivo" } });
 *
 * Accesibilidad: el panel es el `role="dialog" aria-modal="true"` (el backdrop
 * queda afuera), el foco entra en el control seguro, Tab cicla adentro, Escape
 * cancela y al cerrar el foco vuelve al elemento que abrió el diálogo. El fondo
 * queda bloqueado con `useScrollLock` (iOS incluido).
 */

export type ConfirmTone = "danger" | "warning" | "brand";

export type ConfirmOptions = {
  titulo: string;
  detalle?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Campo de texto opcional (reemplazo de window.prompt). */
  campo?: { label: string; placeholder?: string };
};

export type ConfirmResultado = { confirmado: boolean; valor: string };

type ConfirmFn = (opts: ConfirmOptions) => Promise<ConfirmResultado>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Clases literales completas: el JIT de Tailwind no ve strings armados con `${tone}`. */
const TONE_ICONO: Record<ConfirmTone, { emoji: string; bgClass: string }> = {
  danger: { emoji: "🗑️", bgClass: "bg-[var(--c-danger-bg)]" },
  warning: { emoji: "⚠️", bgClass: "bg-[var(--c-warning-bg)]" },
  brand: { emoji: "✈️", bgClass: "bg-[var(--c-brand-50)]" },
};

const FOCUSABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A qué elemento salta el foco al tabular dentro de un trap.
 * `null` = el Tab sigue su curso natural (el foco ya está en el medio de la lista).
 */
export function indiceFocoTrap(
  cantidad: number,
  indiceActual: number,
  shift: boolean
): number | null {
  if (cantidad <= 0) return null;
  if (indiceActual < 0) return shift ? cantidad - 1 : 0;
  if (shift && indiceActual === 0) return cantidad - 1;
  if (!shift && indiceActual === cantidad - 1) return 0;
  return null;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pendiente, setPendiente] = useState<{
    opts: ConfirmOptions;
    resolve: (r: ConfirmResultado) => void;
  } | null>(null);
  const [valor, setValor] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // El disparador se guarda ACÁ: una vez abierto el diálogo el foco ya está
    // adentro y document.activeElement deja de apuntar a quien lo abrió.
    disparadorRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setValor("");
    return new Promise((resolve) => setPendiente({ opts, resolve }));
  }, []);

  useScrollLock(!!pendiente);

  function cerrar(confirmado: boolean) {
    pendiente?.resolve({ confirmado, valor: valor.trim() });
    setPendiente(null);
  }

  useEffect(() => {
    if (!pendiente) return;

    (campoRef.current ?? cancelRef.current)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cerrar(false);
        return;
      }
      if (e.key !== "Tab") return;

      const nodo = dialogRef.current;
      if (!nodo) return;
      const focusables = Array.from(nodo.querySelectorAll<HTMLElement>(FOCUSABLES));
      const actual = document.activeElement;
      const indice = actual instanceof HTMLElement ? focusables.indexOf(actual) : -1;
      const destino = indiceFocoTrap(focusables.length, indice, e.shiftKey);
      if (destino === null) return;
      e.preventDefault();
      focusables[destino]?.focus();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendiente]);

  // Devolver el foco recién cuando el diálogo ya se desmontó.
  useEffect(() => {
    if (pendiente) return;
    const disparador = disparadorRef.current;
    disparadorRef.current = null;
    disparador?.focus();
  }, [pendiente]);

  const opts = pendiente?.opts;
  const tone = opts?.tone ?? "warning";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto px-[max(1rem,var(--safe-left,0px),var(--safe-right,0px))] pb-[max(1rem,var(--safe-bottom,0px))] pt-[max(1rem,var(--safe-top,0px))]">
          <button
            type="button"
            aria-label="cerrar"
            tabIndex={-1}
            onClick={() => cerrar(false)}
            className="absolute inset-0 cursor-default touch-none bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px]"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-titulo"
            className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[shadow:var(--shadow-3)]"
          >
            <span
              className={cn(
                "grid h-12 w-12 place-items-center rounded-[var(--r-lg)] text-xl",
                TONE_ICONO[tone].bgClass
              )}
              aria-hidden
            >
              {TONE_ICONO[tone].emoji}
            </span>
            <h4
              id="confirm-titulo"
              className="mt-4 font-display text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]"
            >
              {opts.titulo}
            </h4>
            {opts.detalle && (
              <p className="mt-1.5 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {opts.detalle}
              </p>
            )}

            {opts.campo && (
              <div className="mt-4 flex flex-col gap-1">
                <Label htmlFor="confirm-campo">{opts.campo.label}</Label>
                <Textarea
                  ref={campoRef}
                  id="confirm-campo"
                  rows={2}
                  value={valor}
                  placeholder={opts.campo.placeholder}
                  onChange={(e) => setValor(e.target.value)}
                  className="min-h-[64px]"
                />
              </div>
            )}

            {/* flex-col-reverse: apilados en mobile, el confirmar arriba (más
                cerca del pulgar) pero primero en el orden de tabulación. */}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                ref={cancelRef}
                variant="ghost"
                onClick={() => cerrar(false)}
                className="w-full sm:w-auto"
              >
                {opts.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                variant={tone === "danger" ? "danger-solid" : "primary"}
                onClick={() => cerrar(true)}
                className="w-full sm:w-auto"
              >
                {opts.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm necesita un <ConfirmProvider> (lo monta el AdminShell).");
  }
  return ctx;
}
