"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { Button, Input, Select } from "@/components/ui";
import { PAIS_LABELS, PAISES } from "@/lib/domain/colegios";
import {
  VIAJE_ESTADO_LABELS,
  VIAJE_ESTADOS,
  VIAJE_ORIGEN_LABELS,
  VIAJE_ORIGENES,
  VIAJE_TIPO_LABELS,
  VIAJE_TIPOS,
} from "@/lib/domain/viajes";
import { cn } from "@/lib/utils/cn";

/** Params que filtran (la URL es la fuente de verdad; `page` no cuenta). */
const PARAMS_FILTRO = ["q", "anio", "estado", "colegio", "pais", "tipo", "origen"] as const;

export function ViajesFilters({
  anios,
  colegios,
}: {
  anios: number[];
  colegios: { id: string; nombre: string }[];
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
    startTransition(() => router.push(qs ? `/viajes?${qs}` : "/viajes"));
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
            placeholder="Buscar por código o nombre…"
            aria-label="Buscar por código o nombre"
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
        <div className="w-full sm:w-40">
          <Select
            aria-label="Filtrar por año"
            value={sp.get("anio") ?? ""}
            onChange={(e) => pushParam("anio", e.target.value || null)}
          >
            <option value="">Todos los años</option>
            {anios.map((a) => (
              <option key={a} value={String(a)}>
                {a}
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
            {VIAJE_ESTADOS.map((e) => (
              <option key={e} value={e}>
                {VIAJE_ESTADO_LABELS[e]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-full sm:w-64">
          <Select
            searchable
            aria-label="Filtrar por colegio destino"
            value={sp.get("colegio") ?? ""}
            onChange={(e) => pushParam("colegio", e.target.value || null)}
          >
            <option value="">Todos los colegios</option>
            {colegios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-full sm:w-44">
          <Select
            aria-label="Filtrar por país"
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

        <div className="w-full sm:w-40">
          <Select
            aria-label="Filtrar por tipo de viaje"
            value={sp.get("tipo") ?? ""}
            onChange={(e) => pushParam("tipo", e.target.value || null)}
          >
            <option value="">Todos los tipos</option>
            {VIAJE_TIPOS.map((t) => (
              <option key={t} value={t}>
                {VIAJE_TIPO_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-full sm:w-52">
          <Select
            aria-label="Filtrar por origen"
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

        {hayFiltros && (
          <Button type="button" variant="ghost" onClick={limpiar} className="w-full sm:w-auto">
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
