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
 *   toast.success("Viaje creado");                       // mensaje solo → centrado
 *   toast.error("No se pudo guardar", {                  // título + descripción → alineado a la izquierda
 *     descripcion: "Revisá la conexión e intentá de nuevo.",
 *   });
 *
 * Stack fijo abajo a la derecha. Auto-dismiss a los 5s (7s para errores) con
 * animación de entrada/salida deslizando hacia la derecha. El contenedor es
 * aria-live="polite"; cada toast es role="alert" (error) o role="status".
 */

type ToastTone = "success" | "error" | "info";

type ToastOpts = { descripcion?: string };

type ToastItem = {
  id: number;
  tone: ToastTone;
  mensaje: string;
  descripcion?: string;
};

type ToastApi = {
  success: (mensaje: string, opts?: ToastOpts) => void;
  error: (mensaje: string, opts?: ToastOpts) => void;
  info: (mensaje: string, opts?: ToastOpts) => void;
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

  const push = useCallback((tone: ToastTone, mensaje: string, opts?: ToastOpts) => {
    const id = nextId.current++;
    setToasts((ts) => [...ts, { id, tone, mensaje, descripcion: opts?.descripcion }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      info: (m, o) => push("info", m, o),
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
          <ToastCard key={t.id} toast={t} onRemove={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const [estado, setEstado] = useState<"entrando" | "visible" | "saliendo">("entrando");
  const { icon, fg } = TONE_CONFIG[toast.tone];
  const tieneDetalle = !!toast.descripcion;

  // Cierra con animación: desliza hacia la derecha y recién después se quita.
  const cerrar = useCallback(() => {
    setEstado("saliendo");
    window.setTimeout(onRemove, 220);
  }, [onRemove]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEstado("visible"));
    const timer = window.setTimeout(cerrar, DURACION[toast.tone]);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [toast.tone, cerrar]);

  return (
    <div
      data-toast
      data-tone={toast.tone}
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        // pointer-events-none: el toast nunca intercepta clicks sobre el
        // contenido que tiene debajo (sólo el botón de cerrar es clickeable).
        "pointer-events-none flex w-full items-start gap-3 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-2)] transition-all duration-200 ease-out",
        estado === "visible"
          ? "translate-x-0 opacity-100"
          : estado === "saliendo"
            ? "translate-x-full opacity-0"
            : "translate-x-6 opacity-0"
      )}
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--r-pill)] text-[13px] font-bold text-[var(--c-surface)]"
        style={{ backgroundColor: fg }}
        aria-hidden
      >
        {icon}
      </span>
      <div className={cn("min-w-0 flex-1", tieneDetalle ? "text-left" : "text-center")}>
        <p className="text-[length:var(--t-small)] font-semibold leading-snug text-[var(--c-ink)]">
          {toast.mensaje}
        </p>
        {tieneDetalle && (
          <p className="mt-0.5 text-[length:var(--t-small)] leading-snug text-[var(--c-ink-muted)]">
            {toast.descripcion}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={cerrar}
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
