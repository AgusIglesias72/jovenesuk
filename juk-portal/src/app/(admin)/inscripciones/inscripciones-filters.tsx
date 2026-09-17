"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

import { Input, Select } from "@/components/ui";
import {
  INSCRIPCION_ESTADO_LABELS,
  VARIANTE_LABELS,
} from "@/lib/domain/inscripciones/labels";
import { INSCRIPCION_ESTADOS, VARIANTES } from "@/lib/domain/inscripciones/schema";

export function InscripcionesFilters({
  viajes,
}: {
  viajes: { id: string; codigo: string; nombre: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    // Un filtro nuevo estrena el universo: quedarse en la página 7 mostraría
    // una tabla vacía sobre un resultado que sí tiene filas.
    params.delete("page");
    startTransition(() => router.push(`/inscripciones?${params.toString()}`));
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
          placeholder="Buscar por nombre, DNI o código…"
          aria-label="Buscar por nombre, DNI o código"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="w-full sm:w-52">
        <Select
          aria-label="Filtrar por estado"
          value={sp.get("estado") ?? ""}
          onChange={(e) => pushParam("estado", e.target.value || null)}
        >
          <option value="">Todos los estados</option>
          {INSCRIPCION_ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {INSCRIPCION_ESTADO_LABELS[estado]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-full sm:w-72">
        <Select
          searchable
          aria-label="Filtrar por viaje"
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

      <div className="w-full sm:w-64">
        <Select
          aria-label="Filtrar por variante"
          value={sp.get("variante") ?? ""}
          onChange={(e) => pushParam("variante", e.target.value || null)}
        >
          <option value="">Todas las variantes</option>
          {VARIANTES.map((v) => (
            <option key={v} value={v}>
              {VARIANTE_LABELS[v]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
