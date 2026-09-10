"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { Button, Input, Select } from "@/components/ui";
import { ALUMNO_ESTADO_LABELS, ALUMNO_ESTADOS, PASOS_FILTRABLES } from "@/lib/domain/alumnos";
import { PASO_LABELS } from "@/lib/domain/pasos/codigos";
import { cn } from "@/lib/utils/cn";

/** Params que filtran (la URL es la fuente de verdad; `page` no cuenta). */
const PARAMS_FILTRO = ["q", "viaje", "paso", "estado", "alerta"] as const;

export function AlumnosFilters({
  viajes,
}: {
  viajes: { id: string; codigo: string; nombre: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busqueda = useRef<HTMLInputElement>(null);
  const panelId = useId();
  // Solo UI: en el teléfono los combos se pliegan para no empujar la tabla.
  const [abiertos, setAbiertos] = useState(false);

  const combosActivos = PARAMS_FILTRO.filter((k) => k !== "q" && sp.get(k)).length;
  const hayFiltros = PARAMS_FILTRO.some((k) => sp.get(k));

  function navegar(params: URLSearchParams) {
    // Cambiar un filtro vuelve a la primera página del resultado nuevo.
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/alumnos?${qs}` : "/alumnos"));
  }

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    navegar(params);
  }

  function onSearch(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pushParam("q", value.trim() || null), 300);
  }

  function limpiar() {
    if (timer.current) clearTimeout(timer.current);
    if (busqueda.current) busqueda.current.value = "";
    navegar(new URLSearchParams());
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex gap-2 sm:min-w-[220px] sm:flex-1">
        <div className="min-w-0 flex-1">
          <Input
            ref={busqueda}
            type="search"
            placeholder="Buscar por nombre, apellido, DNI o pasaporte…"
            aria-label="Buscar por nombre, apellido, DNI o pasaporte"
            defaultValue={sp.get("q") ?? ""}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 sm:hidden"
          aria-expanded={abiertos}
          aria-controls={panelId}
          onClick={() => setAbiertos((v) => !v)}
        >
          {combosActivos > 0 ? `Filtros (${combosActivos})` : "Filtros"}
        </Button>
      </div>

      <div
        id={panelId}
        className={cn("flex flex-col gap-3 sm:contents", !abiertos && "max-sm:hidden")}
      >
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

        <div className="w-full sm:w-72">
          <Select
            searchable
            aria-label="Filtrar por paso pendiente"
            value={sp.get("paso") ?? ""}
            onChange={(e) => pushParam("paso", e.target.value || null)}
          >
            <option value="">Cualquier paso</option>
            {PASOS_FILTRABLES.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()} pendiente · {PASO_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select
            aria-label="Filtrar por estado"
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

        <div className="w-full sm:w-64">
          <Select
            aria-label="Filtrar por alertas"
            value={sp.get("alerta") ?? ""}
            onChange={(e) => pushParam("alerta", e.target.value || null)}
          >
            <option value="">Todas las alertas</option>
            <option value="pasos_bloqueados">Con pasos bloqueados o vencidos</option>
          </Select>
        </div>

        {hayFiltros && (
          <Button type="button" variant="ghost" onClick={limpiar} className="w-full sm:w-auto">
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
