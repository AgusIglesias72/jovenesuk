"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button, useConfirm, useToast } from "@/components/ui";
import { formatFecha } from "@/lib/utils/date";

import { enviarAccesoFamiliaAction } from "../actions";

export function AccesoFamilia({
  alumnoId,
  tutorEmail,
  enviadoAt,
}: {
  alumnoId: string;
  tutorEmail: string;
  enviadoAt: Date | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  /*
   * El email del tutor ya puede ser la cuenta de otra familia (un typo del
   * admin, o un hermano real). La action no vincula sola: devuelve
   * requiereConfirmacion y acá se decide, con los alumnos ya vinculados a la
   * vista.
   */
  async function enviar() {
    const primero = await enviarAccesoFamiliaAction(alumnoId);

    if (primero.ok) {
      toast.success(`Acceso enviado a ${primero.data.enviadoA}.`);
      router.refresh();
      return;
    }

    if (!primero.requiereConfirmacion) {
      toast.error(primero.error);
      return;
    }

    const { confirmado } = await confirm({
      titulo: "¿Vincular a esta cuenta de familia?",
      detalle: primero.error,
      confirmLabel: "Sí, es la misma familia",
    });
    if (!confirmado) return;

    startTransition(async () => {
      const r = await enviarAccesoFamiliaAction(alumnoId, true);
      if (r.ok) {
        toast.success(`Acceso enviado a ${r.data.enviadoA}.`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-3)] px-4 py-3">
      <div className="text-[length:var(--t-small)]">
        <span className="font-bold uppercase tracking-[var(--ls-label)] text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
          Portal de Familias
        </span>
        <p className="mt-0.5 text-[var(--c-ink)]">
          {enviadoAt ? (
            <>
              Acceso enviado el {formatFecha(enviadoAt)} a{" "}
              <span className="font-mono text-[length:var(--t-mono)]">{tutorEmail}</span>
            </>
          ) : (
            <>
              Acceso <strong>no enviado</strong> todavía (usuario:{" "}
              <span className="font-mono text-[length:var(--t-mono)]">{tutorEmail}</span>)
            </>
          )}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => void enviar()}
      >
        {isPending ? "Enviando…" : enviadoAt ? "Reenviar acceso" : "Enviar acceso al Portal de Familias"}
      </Button>
    </div>
  );
}
