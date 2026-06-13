"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui";
import { MONEDAS } from "@/lib/domain/cuotas";

export function PagosFilters({
  viajes,
}: {
  viajes: { id: string; codigo: string; nombre: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`/pagos?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-52">
        <Select
          value={sp.get("estado") ?? ""}
          onChange={(e) => pushParam("estado", e.target.value || null)}
        >
          <option value="">Todos los estados</option>
          <option value="vencida">En mora</option>
          <option value="pendiente">Pendientes</option>
          <option value="pagada">Pagadas</option>
        </Select>
      </div>
      <div className="w-72">
        <Select
          searchable
          value={sp.get("viaje") ?? ""}
          onChange={(e) => pushParam("viaje", e.target.value || null)}
        >
          <option value="">Todos los viajes</option>
          {viajes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.codigo} · {v.nombre}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-44">
        <Select
          value={sp.get("moneda") ?? ""}
          onChange={(e) => pushParam("moneda", e.target.value || null)}
        >
          <option value="">Todas las monedas</option>
          {MONEDAS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
