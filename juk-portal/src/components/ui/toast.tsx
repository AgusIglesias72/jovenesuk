"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Sistema de toasts del design system (STUDIO).
 *
 * Uso (desde cualquier client component bajo el AdminShell):
 *   const toast = useToast();
 *   toast.success("Viaje creado");
 *   toast.error("No se pudo guardar");
 *   toast.info("Cambios pendientes");
 *
 * El stack se renderiza fijo abajo a la derecha. Auto-dismiss a los 5s
 * (7s para errores). El contenedor es aria-live="polite"; cada toast es
 * role="alert" (error) o role="status" (info/success).
 */

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  tone: ToastTone;
  mensaje: string;
};

type ToastApi = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE_CONFIG: Record<ToastTone, { icon: string; fg: string }> = {
  success: { icon: "✓", fg: "var(--c-success)" },
  error: { icon: "✕", fg: "var(--c-danger)" },
  info: { icon: "ℹ", fg: "var(--c-info)" },
};

const DURACION: Record<ToastTone, number> = {
  success: 5000,
  info: 5000,
  error: 7000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, mensaje: string) => {
    const id = nextId.current++;
    setToasts((ts) => [...ts, { id, tone, mensaje }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg) => push("success", msg),
      error: (msg) => push("error", msg),
      info: (msg) => push("info", msg),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        data-toast-region
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const { icon, fg } = TONE_CONFIG[toast.tone];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = window.setTimeout(onClose, DURACION[toast.tone]);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [toast.tone, onClose]);

  return (
    <div
      data-toast
      data-tone={toast.tone}
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        // pointer-events-none: el toast nunca intercepta clicks sobre el
        // contenido que tiene debajo (sólo el botón de cerrar es clickeable).
        "pointer-events-none flex w-full items-start gap-3 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-2)] transition duration-200 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--r-pill)] text-[13px] font-bold text-[var(--c-surface)]"
        style={{ backgroundColor: fg }}
        aria-hidden
      >
        {icon}
      </span>
      <p className="min-w-0 flex-1 text-[length:var(--t-small)] font-semibold leading-snug text-[var(--c-ink)]">
        {toast.mensaje}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label="cerrar"
        className="pointer-events-auto grid h-7 w-7 shrink-0 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-subtle)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast necesita un <ToastProvider> (lo monta el AdminShell).");
  }
  return ctx;
}
