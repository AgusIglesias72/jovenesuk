"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Select, useToast } from "@/components/ui";
import { ESTADO_CONSULTA, type EstadoConsulta } from "@/lib/domain/leads";

import { cambiarEstadoConsultaAction } from "./actions";

export function EstadoSelect({
  id,
  estado,
}: {
  id: string;
  estado: EstadoConsulta;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function onChange(nuevo: string) {
    if (nuevo === estado) return;
    startTransition(async () => {
      const r = await cambiarEstadoConsultaAction({ id, estado: nuevo });
      if (r.ok) {
        toast.success("Estado actualizado.");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Select
      value={estado}
      disabled={isPending}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Estado de la consulta"
    >
      {ESTADO_CONSULTA.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
