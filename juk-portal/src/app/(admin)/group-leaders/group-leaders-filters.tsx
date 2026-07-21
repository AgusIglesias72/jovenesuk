"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

import { Input, Select } from "@/components/ui";
import {
  POLICE_CHECK_ESTADO_LABELS,
  POLICE_CHECK_ESTADOS,
} from "@/lib/domain/group-leaders";

export function GroupLeadersFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`/group-leaders?${params.toString()}`));
  }

  function onSearch(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pushParam("q", value.trim() || null), 300);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="min-w-0 sm:min-w-[220px] sm:flex-1">
        <Input
          type="search"
          placeholder="Buscar por nombre, apellido o email…"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="w-full sm:w-52">
        <Select
          value={sp.get("policeCheckEstado") ?? ""}
          onChange={(e) => pushParam("policeCheckEstado", e.target.value || null)}
        >
          <option value="">Police check: todos</option>
          {POLICE_CHECK_ESTADOS.map((e) => (
            <option key={e} value={e}>
              {POLICE_CHECK_ESTADO_LABELS[e]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
