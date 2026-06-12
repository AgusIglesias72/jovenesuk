"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui";
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
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function enviar() {
    startTransition(async () => {
      setMensaje(null);
      const r = await enviarAccesoFamiliaAction(alumnoId);
      if (r.ok) {
        setMensaje({ ok: true, texto: `Acceso enviado a ${r.data.enviadoA}.` });
        router.refresh();
      } else {
        setMensaje({ ok: false, texto: r.error });
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
        {mensaje && (
          <p
            className={`mt-1 font-medium ${mensaje.ok ? "text-[var(--c-success)]" : "text-[var(--c-danger)]"}`}
          >
            {mensaje.texto}
          </p>
        )}
      </div>
      <Button type="button" variant="secondary" disabled={isPending} onClick={enviar}>
        {isPending ? "Enviando…" : enviadoAt ? "Reenviar acceso" : "Enviar acceso al Portal de Familias"}
      </Button>
    </div>
  );
}
