"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

import { Input, Select } from "@/components/ui";
import { ALUMNO_ESTADO_LABELS, ALUMNO_ESTADOS } from "@/lib/domain/alumnos";

export function AlumnosFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`/alumnos?${params.toString()}`));
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
          placeholder="Buscar por nombre, apellido, DNI o pasaporte…"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="w-52">
        <Select
          value={sp.get("estado") ?? ""}
          onChange={(e) => pushParam("estado", e.target.value || null)}
        >
          <option value="">Todos los estados</option>
          {ALUMNO_ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ALUMNO_ESTADO_LABELS[e]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
