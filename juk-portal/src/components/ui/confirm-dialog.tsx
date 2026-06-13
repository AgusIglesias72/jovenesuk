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

/**
 * Confirmación del design system (STUDIO) — reemplaza window.confirm/prompt.
 *
 * Uso (desde cualquier client component bajo el AdminShell):
 *   const confirm = useConfirm();
 *   const { confirmado } = await confirm({ titulo: "¿Dar de baja?", tone: "danger" });
 *   // con campo de texto (ex window.prompt):
 *   const { confirmado, valor } = await confirm({ titulo: "…", campo: { label: "Motivo" } });
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

const TONE_ICONO: Record<ConfirmTone, { emoji: string; bg: string }> = {
  danger: { emoji: "🗑️", bg: "var(--c-danger-bg)" },
  warning: { emoji: "⚠️", bg: "var(--c-warning-bg)" },
  brand: { emoji: "✈️", bg: "var(--c-brand-50)" },
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pendiente, setPendiente] = useState<{
    opts: ConfirmOptions;
    resolve: (r: ConfirmResultado) => void;
  } | null>(null);
  const [valor, setValor] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setValor("");
    return new Promise((resolve) => setPendiente({ opts, resolve }));
  }, []);

  function cerrar(confirmado: boolean) {
    pendiente?.resolve({ confirmado, valor: valor.trim() });
    setPendiente(null);
  }

  useEffect(() => {
    if (!pendiente) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendiente]);

  const opts = pendiente?.opts;
  const tone = opts?.tone ?? "warning";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-titulo"
        >
          <button
            type="button"
            aria-label="cerrar"
            onClick={() => cerrar(false)}
            className="absolute inset-0 cursor-default bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-md rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[shadow:var(--shadow-3)]">
            <span
              className="grid h-12 w-12 place-items-center rounded-[var(--r-lg)] text-xl"
              style={{ backgroundColor: TONE_ICONO[tone].bg }}
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
                  id="confirm-campo"
                  rows={2}
                  value={valor}
                  placeholder={opts.campo.placeholder}
                  onChange={(e) => setValor(e.target.value)}
                  className="min-h-[64px]"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => cerrar(false)}>
                {opts.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                ref={confirmRef}
                variant={tone === "danger" ? "danger" : "primary"}
                className={cn(
                  tone === "danger" &&
                    "!bg-[var(--c-danger)] !text-white !shadow-[0_12px_28px_rgba(214,81,81,0.3)] hover:!bg-[#c24444]"
                )}
                onClick={() => cerrar(true)}
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
