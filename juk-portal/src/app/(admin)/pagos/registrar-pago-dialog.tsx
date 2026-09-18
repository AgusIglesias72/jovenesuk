"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { Button, DateInput, Field, Textarea, useConfirm, useToast } from "@/components/ui";
import { indiceFocoTrap } from "@/components/ui/confirm-dialog";
import { useScrollLock } from "@/components/ui/use-scroll-lock";
import type { ActionResult, FieldErrors } from "@/lib/actions/result";
import { OBSERVACIONES_PAGO_MAX, datosPagoSchema } from "@/lib/domain/cuotas";
import { fieldErrorsFromZod } from "@/lib/utils/zod";

/**
 * Registrar pago (US-22) — el ÚNICO diálogo para asentar un pago, lo usen el
 * módulo Pagos, la fila de una cuota en la ficha o la confirmación presencial
 * de B2. Captura la fecha efectiva (default hoy, nunca futura) y observaciones
 * (n° de comprobante, quién pagó) y conserva la advertencia confirmable de
 * "Pago fuera de orden" que devuelven las actions.
 *
 * Va en un portal con z-index por debajo de los popovers del DS (z-40/z-50):
 * el calendario del DateInput también se monta en un portal y tiene que quedar
 * encima del diálogo.
 */

export type DatosPago = { fechaPago: string; observaciones: string };

export type RegistrarPagoFn = (
  datos: DatosPago,
  opts?: { confirmar?: boolean }
) => Promise<ActionResult<unknown>>;

const FOCUSABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Hoy en la zona del navegador: a las 22 h en Argentina ya es mañana en UTC. */
function hoyLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function focusablesDe(nodo: HTMLElement): HTMLElement[] {
  return Array.from(nodo.querySelectorAll<HTMLElement>(FOCUSABLES)).filter(
    (el) => el.tabIndex >= 0 && el.getAttribute("aria-hidden") !== "true"
  );
}

export function RegistrarPagoDialog({
  titulo,
  detalle,
  confirmLabel = "Registrar pago",
  mensajeExito = "Pago registrado",
  registrar,
  onCerrar,
}: {
  titulo: string;
  detalle?: React.ReactNode;
  confirmLabel?: string;
  mensajeExito?: string;
  registrar: RegistrarPagoFn;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [fechaPago, setFechaPago] = useState(hoyLocalISO);
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState<FieldErrors>({});
  // Mientras se muestra la advertencia de "fuera de orden" (otro modal), este
  // queda oculto pero montado: si la action falla, vuelve con los datos cargados.
  const [oculto, setOculto] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useScrollLock(!oculto);

  useEffect(() => {
    const disparador = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const nodo = dialogRef.current;
    if (nodo) focusablesDe(nodo)[0]?.focus();
    return () => {
      if (disparador?.isConnected) disparador.focus();
    };
  }, []);

  useEffect(() => {
    if (oculto) return;

    function onKey(e: KeyboardEvent) {
      const nodo = dialogRef.current;
      if (!nodo) return;
      // Con el calendario abierto, Escape y Tab son del calendario (vive en otro portal).
      const calendarioAbierto = !!nodo.querySelector('[aria-haspopup="dialog"][aria-expanded="true"]');

      if (e.key === "Escape") {
        if (!calendarioAbierto && !isPending) onCerrar();
        return;
      }
      if (e.key !== "Tab" || calendarioAbierto) return;

      const actual = document.activeElement;
      if (actual instanceof HTMLElement && actual !== document.body && !nodo.contains(actual)) return;
      const focusables = focusablesDe(nodo);
      const indice = actual instanceof HTMLElement ? focusables.indexOf(actual) : -1;
      const destino = indiceFocoTrap(focusables.length, indice, e.shiftKey);
      if (destino === null) return;
      e.preventDefault();
      focusables[destino]?.focus();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [oculto, isPending, onCerrar]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const datos: DatosPago = { fechaPago, observaciones };
    const local = datosPagoSchema.safeParse(datos);
    if (!local.success) {
      setErrores(fieldErrorsFromZod(local.error));
      return;
    }
    setErrores({});

    startTransition(async () => {
      try {
        let r = await registrar(datos);
        if (!r.ok && r.requiereConfirmacion) {
          setOculto(true);
          const { confirmado } = await confirm({
            titulo: "Pago fuera de orden",
            detalle: r.error,
            tone: "warning",
            confirmLabel: "Registrar igual",
          });
          if (!confirmado) {
            onCerrar();
            return;
          }
          r = await registrar(datos, { confirmar: true });
        }
        if (r.ok) {
          toast.success(mensajeExito);
          onCerrar();
          router.refresh();
          return;
        }
        setOculto(false);
        if (r.fieldErrors) setErrores(r.fieldErrors);
        toast.error(r.error);
      } catch {
        setOculto(false);
        toast.error("No pudimos registrar el pago. Probá de nuevo.");
      }
    });
  }

  const fe = (k: string) => errores[k]?.[0];

  return createPortal(
    <div
      aria-hidden={oculto || undefined}
      className={`fixed inset-0 z-[35] place-items-center overflow-y-auto px-[max(1rem,var(--safe-left,0px),var(--safe-right,0px))] pb-[max(1rem,var(--safe-bottom,0px))] pt-[max(1rem,var(--safe-top,0px))] ${oculto ? "hidden" : "grid"}`}
    >
      <button
        type="button"
        aria-label="cerrar"
        tabIndex={-1}
        disabled={isPending}
        onClick={onCerrar}
        className="absolute inset-0 cursor-default touch-none bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrar-pago-titulo"
        aria-describedby={detalle ? "registrar-pago-detalle" : undefined}
        className="scroll-fino relative max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[shadow:var(--shadow-3)]"
      >
        <span
          aria-hidden
          className="grid h-12 w-12 place-items-center rounded-[var(--r-lg)] bg-[var(--c-honey-soft)] font-mono text-xl font-bold text-[var(--c-warning)]"
        >
          $
        </span>
        <h4
          id="registrar-pago-titulo"
          className="mt-4 font-display text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]"
        >
          {titulo}
        </h4>
        {detalle && (
          <p
            id="registrar-pago-detalle"
            className="mt-1.5 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]"
          >
            {detalle}
          </p>
        )}

        <form onSubmit={enviar} noValidate className="mt-4 flex flex-col gap-4">
          <Field
            label="Fecha de pago"
            required
            help="El día en que la familia pagó. Puede ser anterior a hoy."
            error={fe("fechaPago")}
          >
            <DateInput
              value={fechaPago}
              invalid={!!fe("fechaPago")}
              disabled={isPending}
              onChange={(e) => setFechaPago(e.target.value)}
            />
          </Field>
          <Field
            label="Observaciones"
            help="N° de comprobante, medio de pago o quién pagó."
            error={fe("observaciones")}
          >
            <Textarea
              rows={2}
              maxLength={OBSERVACIONES_PAGO_MAX}
              value={observaciones}
              invalid={!!fe("observaciones")}
              disabled={isPending}
              onChange={(e) => setObservaciones(e.target.value)}
              className="min-h-[64px]"
            />
          </Field>

          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={onCerrar}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
