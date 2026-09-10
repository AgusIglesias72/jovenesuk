"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

import { Input, Select } from "@/components/ui";
import { PROSPECTO_ESTADOS, PROSPECTO_ESTADO_LABELS } from "@/lib/domain/prospectos";

export function ProspectosFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    params.set("vista", "tabla");
    startTransition(() => router.push(`/prospectos?${params.toString()}`));
  }

  function onSearch(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pushParam("q", value.trim() || null), 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-full flex-1 sm:min-w-[220px]">
        <Input
          type="search"
          placeholder="Buscar por nombre, ciudad o contacto…"
          aria-label="Buscar por nombre, ciudad o contacto"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="w-full sm:w-48">
        <Select
          value={sp.get("estado") ?? ""}
          onChange={(e) => pushParam("estado", e.target.value || null)}
        >
          <option value="">Todos los estados</option>
          {PROSPECTO_ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {PROSPECTO_ESTADO_LABELS[estado]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
