"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

import { Input, Select, Checkbox } from "@/components/ui";
import {
  PAIS_LABELS,
  PAISES,
  TIPO_COLEGIO_LABELS,
  TIPOS_COLEGIO,
} from "@/lib/domain/colegios";

export function ColegiosFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`/colegios?${params.toString()}`));
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
          placeholder="Buscar por nombre o ciudad…"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="w-full sm:w-44">
        <Select
          value={sp.get("tipo") ?? ""}
          onChange={(e) => pushParam("tipo", e.target.value || null)}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_COLEGIO.map((t) => (
            <option key={t} value={t}>
              {TIPO_COLEGIO_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-full sm:w-44">
        <Select
          value={sp.get("pais") ?? ""}
          onChange={(e) => pushParam("pais", e.target.value || null)}
        >
          <option value="">Todos los países</option>
          {PAISES.map((p) => (
            <option key={p} value={p}>
              {PAIS_LABELS[p]}
            </option>
          ))}
        </Select>
      </div>

      <Checkbox
        label="Incluir inactivos"
        checked={sp.get("incluirInactivos") === "1"}
        onChange={(e) => pushParam("incluirInactivos", e.target.checked ? "1" : null)}
      />
    </div>
  );
}
