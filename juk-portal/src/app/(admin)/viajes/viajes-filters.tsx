"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

import { Input, Select } from "@/components/ui";
import {
  VIAJE_ESTADO_LABELS,
  VIAJE_ESTADOS,
  VIAJE_ORIGEN_LABELS,
  VIAJE_ORIGENES,
} from "@/lib/domain/viajes";

export function ViajesFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`/viajes?${params.toString()}`));
  }

  function onSearch(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pushParam("q", value.trim() || null), 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-[220px] flex-1">
        <Input
          type="search"
          placeholder="Buscar por código o nombre…"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="w-48">
        <Select
          value={sp.get("estado") ?? ""}
          onChange={(e) => pushParam("estado", e.target.value || null)}
        >
          <option value="">Todos los estados</option>
          {VIAJE_ESTADOS.map((e) => (
            <option key={e} value={e}>
              {VIAJE_ESTADO_LABELS[e]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-52">
        <Select
          value={sp.get("origen") ?? ""}
          onChange={(e) => pushParam("origen", e.target.value || null)}
        >
          <option value="">Todos los orígenes</option>
          {VIAJE_ORIGENES.map((o) => (
            <option key={o} value={o}>
              {VIAJE_ORIGEN_LABELS[o]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
