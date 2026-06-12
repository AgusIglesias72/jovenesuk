"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Select } from "@/components/ui";
import {
  GRUPO_LABELS,
  PASO_ESTADO_LABELS,
  PASO_LABELS,
  esPasoEditable,
  grupoDePaso,
  transicionesPasoAlumno,
  type GrupoPaso,
  type PasoCodigo,
  type PasoEstado,
} from "@/lib/domain/pasos";
import { formatFecha } from "@/lib/utils/date";

import { transicionarPasoAlumnoAction } from "./pasos-actions";

export type PasoView = {
  id: string;
  codigo: PasoCodigo;
  estado: PasoEstado;
  metadata: Record<string, unknown>;
  notas: string | null;
  fechaCompletado: Date | null;
};

// "_" escapado: en arbitrary values de Tailwind v3 el underscore es espacio.
const ESTADO_CLASSES: Record<PasoEstado, { badge: string; nota: string }> = {
  pendiente: {
    badge: "bg-[var(--b-paso-pendiente-bg)] text-[var(--b-paso-pendiente)]",
    nota: "bg-[var(--c-surface-2)] text-[var(--c-ink-subtle)]",
  },
  en_progreso: {
    badge: "bg-[var(--b-paso-en\\_progreso-bg)] text-[var(--b-paso-en\\_progreso)]",
    nota: "bg-[var(--c-surface-2)] text-[var(--c-ink-subtle)]",
  },
  completado: {
    badge: "bg-[var(--b-paso-completado-bg)] text-[var(--b-paso-completado)]",
    nota: "bg-[var(--c-surface-2)] text-[var(--c-ink-subtle)]",
  },
  bloqueado: {
    badge: "bg-[var(--b-paso-bloqueado-bg)] text-[var(--b-paso-bloqueado)]",
    nota: "bg-[var(--b-paso-bloqueado-bg)] text-[var(--b-paso-bloqueado)]",
  },
  na: {
    badge: "bg-[var(--b-paso-na-bg)] text-[var(--b-paso-na)]",
    nota: "bg-[var(--c-surface-2)] text-[var(--c-ink-subtle)]",
  },
  vencido: {
    badge: "bg-[var(--b-paso-vencido-bg)] text-[var(--b-paso-vencido)]",
    nota: "bg-[var(--b-paso-vencido-bg)] text-[var(--b-paso-vencido)]",
  },
};

const ORDEN_GRUPOS: GrupoPaso[] = ["referencia", "a", "b", "c", "d"];

function notaDelPaso(p: PasoView): string | null {
  if (p.notas) return p.notas;
  if (p.estado === "bloqueado" && p.metadata.bloqueadoPor === "b1")
    return "Requiere B1 (Plan de cuotas) completado";
  if (p.estado === "na" && typeof p.metadata.motivo === "string") {
    const motivos: Record<string, string> = {
      config_colegio: "El colegio no lo requiere",
      mayor_de_edad: "Alumno mayor de edad al inicio",
      flujo_via_agencia_o_directo: "Todo el pago va vía agencia / directo",
      viaje_individual: "Viaje individual, sin GL",
      entrada_visa: "El destino requiere VISA (no ETA)",
      entrada_ninguna: "El destino no exige documentación de entrada",
    };
    return motivos[p.metadata.motivo] ?? null;
  }
  if (p.codigo === "a3" && typeof p.metadata.version === "string")
    return p.metadata.version === "menor_16" ? "Versión: menor de 16" : "Versión: 16–17 años";
  if (p.codigo === "b1" && typeof p.metadata.cuotasPagadas === "number")
    return `${p.metadata.cuotasPagadas} de ${p.metadata.cuotasTotales} cuotas acreditadas`;
  if (p.estado === "completado" && p.fechaCompletado)
    return `Completado el ${formatFecha(p.fechaCompletado)}`;
  return null;
}

function PasoCard({
  paso,
  alumnoId,
  onError,
}: {
  paso: PasoView;
  alumnoId: string;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const c = ESTADO_CLASSES[paso.estado];
  const apagado = paso.estado === "na";
  const editable = esPasoEditable(paso.codigo);
  const opciones = transicionesPasoAlumno(paso.codigo, paso.estado);
  const nota = notaDelPaso(paso);

  function transicionar(nuevo: PasoEstado) {
    if (nuevo === paso.estado) return;
    startTransition(async () => {
      onError(null);
      const r = await transicionarPasoAlumnoAction({
        pasoId: paso.id,
        alumnoId,
        nuevoEstado: nuevo,
      });
      if (r.ok) router.refresh();
      else onError(r.error);
    });
  }

  return (
    <div
      data-paso={paso.codigo}
      className={`rounded-[var(--r-md)] border p-3 transition-shadow hover:shadow-[shadow:var(--shadow-1)] ${
        apagado
          ? "border-dashed border-[var(--c-border)] bg-transparent opacity-70"
          : "border-[var(--c-border)] bg-[var(--c-surface)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold uppercase text-[var(--c-ink-subtle)]">
          {paso.codigo === "paso_0" ? "P0" : paso.codigo}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-2.5 py-0.5 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] ${c.badge}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {PASO_ESTADO_LABELS[paso.estado]}
        </span>
      </div>

      <p
        className={`mt-1.5 text-[length:var(--t-small)] font-semibold ${
          apagado ? "text-[var(--c-ink-subtle)]" : "text-[var(--c-ink)]"
        }`}
      >
        {PASO_LABELS[paso.codigo]}
      </p>

      {nota && (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 rounded-[var(--r-xs)] px-1.5 py-0.5 text-[11px] font-medium ${c.nota}`}
        >
          {paso.estado === "bloqueado" && <span aria-hidden>🔒</span>}
          {paso.estado === "vencido" && <span aria-hidden>⏰</span>}
          {nota}
        </p>
      )}

      {editable && opciones.length > 1 && (
        <div className="mt-2">
          <Select
            value={paso.estado}
            disabled={isPending}
            onChange={(e) => transicionar(e.target.value as PasoEstado)}
            className="!min-h-0 !py-1 text-[length:var(--t-small)]"
          >
            {opciones.map((o) => (
              <option key={o} value={o}>
                {PASO_ESTADO_LABELS[o]}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}

export function TableroM6({
  alumnoId,
  pasos,
  titulo,
}: {
  alumnoId: string;
  pasos: PasoView[];
  titulo: string;
}) {
  const [error, setError] = useState<string | null>(null);

  const porGrupo = ORDEN_GRUPOS.map((grupo) => ({
    grupo,
    pasos: pasos.filter((p) => grupoDePaso(p.codigo) === grupo),
  })).filter((g) => g.pasos.length > 0);

  // Completitud: pasos no-N/A y no marcados opcionales (MIN-13/06).
  const computables = pasos.filter((p) => p.estado !== "na" && p.metadata.opcional !== true);
  const completados = computables.filter((p) => p.estado === "completado").length;
  const pct = computables.length ? Math.round((completados / computables.length) * 100) : 0;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
          Seguimiento · {titulo}
        </h2>
        <span className="font-mono text-[length:var(--t-small)] tabular-nums text-[var(--c-ink-muted)]">
          {completados}/{computables.length} pasos · {pct}%
        </span>
      </div>

      <div className="mb-4 h-2.5 overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-surface-2)]">
        <div
          className="h-full rounded-[var(--r-pill)] [background:var(--grad-brand)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-[var(--r-md)] border border-[var(--c-danger)] bg-[var(--c-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--c-danger)]">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {porGrupo.map(({ grupo, pasos: ps }) => (
          <div key={grupo}>
            <h3 className="mb-2 flex items-center gap-2 text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
              {grupo !== "referencia" && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--r-xs)] bg-[var(--c-brand-100)] font-mono text-[11px] font-bold uppercase text-[var(--c-brand)]">
                  {grupo}
                </span>
              )}
              {GRUPO_LABELS[grupo]}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ps.map((p) => (
                <PasoCard key={p.id} paso={p} alumnoId={alumnoId} onError={setError} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
