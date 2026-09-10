"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import { Badge, Select, useToast } from "@/components/ui";
import type { ProspectoKanbanItem } from "@/lib/db/queries/prospectos";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import {
  PROSPECTO_ESTADOS,
  PROSPECTO_ESTADO_LABELS,
  PROSPECTO_ESTADO_TONE,
  type ProspectoEstado,
} from "@/lib/domain/prospectos";
import { cn } from "@/lib/utils/cn";
import { formatFecha } from "@/lib/utils/date";

import { moverProspectoAction } from "./actions";

/**
 * El tablero mantiene estado local optimista. Cuando el server revalida y llega
 * un `prospectos` distinto, la firma cambia y React remonta `<Tablero>` con la
 * `key`, descartando cualquier estado local desincronizado.
 */
export function ProspectosKanban({ prospectos }: { prospectos: ProspectoKanbanItem[] }) {
  const firma = prospectos
    .map((p) => `${p.id}:${p.estado}:${p.posicion}`)
    .join("|");
  return <Tablero key={firma} prospectos={prospectos} />;
}

function agrupar(items: ProspectoKanbanItem[]): Record<ProspectoEstado, ProspectoKanbanItem[]> {
  const grupos = Object.fromEntries(
    PROSPECTO_ESTADOS.map((e) => [e, [] as ProspectoKanbanItem[]])
  ) as Record<ProspectoEstado, ProspectoKanbanItem[]>;
  for (const p of items) grupos[p.estado].push(p);
  for (const e of PROSPECTO_ESTADOS) {
    grupos[e].sort((a, b) => a.posicion - b.posicion);
  }
  return grupos;
}

function Tablero({ prospectos }: { prospectos: ProspectoKanbanItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [items, setItems] = useState<ProspectoKanbanItem[]>(prospectos);
  const [sobre, setSobre] = useState<ProspectoEstado | null>(null);
  // Referencia temporal estable: evita Date.now() en render (regla de pureza).
  const [ahora] = useState(() => Date.now());

  const arrastradoId = useRef<string | null>(null);
  const recienArrastrado = useRef(false);

  const columnas = useMemo(() => agrupar(items), [items]);

  /**
   * Único camino para cambiar de etapa: lo usan el drop del drag&drop (desktop)
   * y el Select "Mover a…" de la tarjeta (el HTML5 drag no existe en touch).
   */
  function mover(id: string, estado: ProspectoEstado) {
    const actual = items.find((p) => p.id === id);
    if (!actual || actual.estado === estado) return;

    const nuevaPosicion = columnas[estado].length;
    const snapshot = items;
    setItems((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, estado, posicion: nuevaPosicion } : p
      )
    );

    startTransition(async () => {
      const res = await moverProspectoAction({ id, estado, posicion: nuevaPosicion });
      if (!res.ok) {
        setItems(snapshot);
        toast.error(res.error);
      }
    });
  }

  function alSoltar(estado: ProspectoEstado) {
    const id = arrastradoId.current;
    arrastradoId.current = null;
    setSobre(null);
    if (id) mover(id, estado);
  }

  function alClickTarjeta(id: string) {
    if (recienArrastrado.current) {
      recienArrastrado.current = false;
      return;
    }
    router.push(`/prospectos/${id}`);
  }

  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4">
      {PROSPECTO_ESTADOS.map((estado) => {
        const tarjetas = columnas[estado];
        return (
          <section
            key={estado}
            onDragOver={(e) => {
              e.preventDefault();
              if (sobre !== estado) setSobre(estado);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setSobre((s) => (s === estado ? null : s));
              }
            }}
            onDrop={() => alSoltar(estado)}
            className={cn(
              "flex w-[85vw] shrink-0 snap-start flex-col rounded-[var(--r-lg)] border bg-[var(--c-surface-2)] transition-colors sm:w-72",
              sobre === estado
                ? "border-[var(--c-brand-300)] bg-[var(--c-brand-100)]"
                : "border-[var(--c-border)]"
            )}
          >
            <header className="flex items-center justify-between gap-2 px-3 py-3">
              <Badge tone={PROSPECTO_ESTADO_TONE[estado]}>
                {PROSPECTO_ESTADO_LABELS[estado]}
              </Badge>
              <span className="text-[length:var(--t-label)] font-semibold text-[var(--c-ink-muted)]">
                {tarjetas.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
              {tarjetas.length === 0 ? (
                <p className="px-1 py-6 text-center text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                  Sin prospectos
                </p>
              ) : (
                tarjetas.map((p) => (
                  <TarjetaProspecto
                    key={p.id}
                    prospecto={p}
                    ahora={ahora}
                    onDragStart={() => {
                      arrastradoId.current = p.id;
                      recienArrastrado.current = true;
                    }}
                    onDragEnd={() => {
                      window.setTimeout(() => {
                        recienArrastrado.current = false;
                      }, 100);
                    }}
                    onClick={() => alClickTarjeta(p.id)}
                    onMover={(destino) => mover(p.id, destino)}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ubicacion(p: ProspectoKanbanItem): string | null {
  const partes = [p.ciudad, p.pais ? PAIS_LABELS[p.pais] : null].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

function TarjetaProspecto({
  prospecto,
  ahora,
  onDragStart,
  onDragEnd,
  onClick,
  onMover,
}: {
  prospecto: ProspectoKanbanItem;
  ahora: number;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  onMover: (destino: ProspectoEstado) => void;
}) {
  const lugar = ubicacion(prospecto);
  const vencida =
    prospecto.proximaAccionAt != null &&
    prospecto.proximaAccionAt.getTime() < ahora;
  const destinos = PROSPECTO_ESTADOS.filter((e) => e !== prospecto.estado);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="cursor-pointer rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-3 shadow-[shadow:var(--shadow-soft)] transition-colors hover:border-[var(--c-brand-300)] active:cursor-grabbing"
    >
      <p className="font-semibold text-[var(--c-ink)]">{prospecto.nombre}</p>
      {lugar ? (
        <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          {lugar}
        </p>
      ) : null}
      {prospecto.contactoNombre ? (
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink)]">
          {prospecto.contactoNombre}
        </p>
      ) : null}

      {(prospecto.emailsCount > 0 || prospecto.telefonosCount > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {prospecto.emailsCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-[var(--r-pill)] bg-[var(--c-surface-2)] px-2 py-0.5 text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
              ✉ {prospecto.emailsCount}
            </span>
          ) : null}
          {prospecto.telefonosCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-[var(--r-pill)] bg-[var(--c-surface-2)] px-2 py-0.5 text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
              ☎ {prospecto.telefonosCount}
            </span>
          ) : null}
        </div>
      )}

      {vencida && prospecto.proximaAccionAt ? (
        <div className="mt-2">
          <Badge tone="danger">Vencida {formatFecha(prospecto.proximaAccionAt)}</Badge>
        </div>
      ) : null}

      {/* El drag&drop HTML5 no existe en touch: desde el teléfono la etapa se
          cambia por acá. El tap del <article> navega al detalle, así que el
          control corta la propagación (y no arranca un arrastre). */}
      <div
        className="mt-3"
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Select
          value=""
          aria-label={`Mover ${prospecto.nombre} a otra etapa`}
          onChange={(e) => {
            const destino = PROSPECTO_ESTADOS.find((s) => s === e.target.value);
            if (destino) onMover(destino);
          }}
        >
          <option value="" disabled>
            Mover a…
          </option>
          {destinos.map((e) => (
            <option key={e} value={e}>
              {PROSPECTO_ESTADO_LABELS[e]}
            </option>
          ))}
        </Select>
      </div>
    </article>
  );
}
