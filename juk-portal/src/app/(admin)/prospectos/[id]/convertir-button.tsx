"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button, useConfirm, useToast } from "@/components/ui";

import { convertirAColegioAction } from "../actions";

export function ConvertirButton({
  prospectoId,
  yaConvertido,
  colegioId,
}: {
  prospectoId: string;
  yaConvertido: boolean;
  colegioId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  if (yaConvertido && colegioId) {
    return (
      <Link
        href={`/colegios/${colegioId}/editar`}
        className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[var(--c-success)] bg-[var(--c-success-bg)] px-4 py-2 text-[length:var(--t-small)] font-semibold text-[var(--c-success)] transition-colors hover:brightness-95"
      >
        Ya es colegio cliente · abrir ficha
      </Link>
    );
  }

  async function convertir() {
    const { confirmado } = await confirm({
      titulo: "¿Convertir en colegio cliente?",
      detalle: "Vas a crear el colegio cliente con estos datos. El prospecto pasa a Ganado.",
      confirmLabel: "Convertir",
      tone: "brand",
    });
    if (!confirmado) return;

    startTransition(async () => {
      const r = await convertirAColegioAction(prospectoId);
      if (r.ok) {
        toast.success("Prospecto convertido en colegio cliente.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Button type="button" variant="primary" disabled={isPending} onClick={convertir}>
      {isPending ? "Convirtiendo…" : "Convertir a colegio cliente"}
    </Button>
  );
}
