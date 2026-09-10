"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button, Input, LinkButton, SectionTitle, Select, useToast } from "@/components/ui";
import {
  ETA_SUBESTADO_LABELS,
  ETA_SUBESTADOS,
  GRUPO_LABELS,
  PASO_ESTADO_LABELS,
  PASO_LABELS,
  PC_SUBESTADO_LABELS,
  PC_SUBESTADOS,
  esPasoEditable,
  grupoDePaso,
  transicionesPasoAlumno,
  type GrupoPaso,
  type PasoCodigo,
  type PasoEstado,
} from "@/lib/domain/pasos";
import { formatFecha } from "@/lib/utils/date";

import { subirDocumentoPasoAction } from "./documentos-actions";
import { actualizarSubEstadoPasoAction, transicionarPasoAlumnoAction } from "./pasos-actions";

/** Pasos que llevan documento adjunto (AF, PC, captura ETA, letters, escribano, psicofísico). */
const PASOS_CON_DOCUMENTO: ReadonlySet<PasoCodigo> = new Set([
  "a1",
  "a3",
  "c1",
  "c2",
  "c3",
  "d1",
  "d2",
]);

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
}: {
  paso: PasoView;
  alumnoId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const c = ESTADO_CLASSES[paso.estado];
  const apagado = paso.estado === "na";
  const editable = esPasoEditable(paso.codigo);
  const opciones = transicionesPasoAlumno(paso.codigo, paso.estado);
  const nota = notaDelPaso(paso);

  // C1 (US-31) y A3 (US-29): el estado se deriva del sub-estado del trámite.
  const conSubEstado = (paso.codigo === "c1" || paso.codigo === "a3") && paso.estado !== "na";
  const subEstados: readonly string[] = paso.codigo === "c1" ? ETA_SUBESTADOS : PC_SUBESTADOS;
  const subEstadoLabels: Record<string, string> =
    paso.codigo === "c1" ? ETA_SUBESTADO_LABELS : PC_SUBESTADO_LABELS;
  const subEstadoActual =
    typeof paso.metadata.subEstado === "string" ? paso.metadata.subEstado : subEstados[0]!;
  const numeroAutorizacion =
    typeof paso.metadata.numeroAutorizacion === "string" ? paso.metadata.numeroAutorizacion : "";

  function transicionar(nuevo: PasoEstado) {
    if (nuevo === paso.estado) return;
    startTransition(async () => {
      const r = await transicionarPasoAlumnoAction({
        pasoId: paso.id,
        nuevoEstado: nuevo,
      });
      if (r.ok) {
        toast.success("Paso actualizado");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function actualizarSubEstado(subEstado: string, numero?: string) {
    startTransition(async () => {
      const r = await actualizarSubEstadoPasoAction({
        pasoId: paso.id,
        subEstado,
        ...(numero !== undefined ? { numeroAutorizacion: numero.trim() } : {}),
      });
      if (r.ok) {
        toast.success("Trámite actualizado");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function subirArchivo(file: File | undefined) {
    if (!file) return;
    setSubiendo(file.name);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("pasoId", paso.id);
      fd.set("archivo", file);
      const r = await subirDocumentoPasoAction(fd);
      setSubiendo(null);
      if (fileRef.current) fileRef.current.value = "";
      if (r.ok) {
        toast.success("Documento subido");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  const archivoUrl =
    typeof paso.metadata.archivoUrl === "string" ? paso.metadata.archivoUrl : null;
  const aceptaDocumento = editable && PASOS_CON_DOCUMENTO.has(paso.codigo) && paso.estado !== "na";

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
        <span className="font-mono text-[length:var(--t-label)] font-bold uppercase text-[var(--c-ink-subtle)]">
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
          className={`mt-1.5 inline-flex items-center gap-1 rounded-[var(--r-xs)] px-1.5 py-0.5 text-[length:var(--t-label)] font-medium ${c.nota}`}
        >
          {paso.estado === "bloqueado" && <span aria-hidden>🔒</span>}
          {paso.estado === "vencido" && <span aria-hidden>⏰</span>}
          {nota}
        </p>
      )}

      {conSubEstado && (
        <div className="mt-2 space-y-2">
          <Select
            value={subEstadoActual}
            disabled={isPending}
            aria-label={`Estado del trámite · ${PASO_LABELS[paso.codigo]}`}
            onChange={(e) => {
              if (e.target.value !== subEstadoActual) actualizarSubEstado(e.target.value);
            }}
          >
            {subEstados.map((s) => (
              <option key={s} value={s}>
                {subEstadoLabels[s] ?? s}
              </option>
            ))}
          </Select>
          {paso.codigo === "c1" && subEstadoActual === "aprobado" && (
            <Input
              type="text"
              placeholder="N° autorización"
              aria-label="N° de autorización del ETA"
              defaultValue={numeroAutorizacion}
              disabled={isPending}
              onBlur={(e) => {
                if (e.target.value.trim() !== numeroAutorizacion)
                  actualizarSubEstado(subEstadoActual, e.target.value);
              }}
            />
          )}
        </div>
      )}

      {editable && !conSubEstado && opciones.length > 1 && (
        <div className="mt-2">
          <Select
            value={paso.estado}
            disabled={isPending}
            aria-label={`Estado de ${PASO_LABELS[paso.codigo]}`}
            onChange={(e) => transicionar(e.target.value as PasoEstado)}
          >
            {opciones.map((o) => (
              <option key={o} value={o}>
                {PASO_ESTADO_LABELS[o]}
              </option>
            ))}
          </Select>
        </div>
      )}

      {aceptaDocumento && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-[length:var(--t-small)]">
          {archivoUrl ? (
            <LinkButton
              variant="ghost"
              href={archivoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--c-brand)]"
            >
              📄 Ver documento
            </LinkButton>
          ) : (
            <span className="px-1 text-[var(--c-ink-subtle)]">Sin documento</span>
          )}
          {/* El input queda oculto y el botón lo dispara: el control nativo no
              respeta el DS ni el target de 44px, y `hidden` no le molesta ni al
              teclado (el botón es el punto de entrada) ni a setInputFiles. */}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            disabled={isPending}
            aria-label={`Adjuntar documento de ${PASO_LABELS[paso.codigo]}`}
            onChange={(e) => subirArchivo(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => fileRef.current?.click()}
          >
            {archivoUrl ? "Reemplazar" : "Adjuntar"}
          </Button>
          {subiendo && (
            <span className="min-w-0 flex-1 truncate text-[var(--c-ink-subtle)]">
              Subiendo {subiendo}…
            </span>
          )}
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
        <SectionTitle>Seguimiento · {titulo}</SectionTitle>
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

      <div className="space-y-5">
        {porGrupo.map(({ grupo, pasos: ps }) => (
          <div key={grupo}>
            <h3 className="mb-2 flex items-center gap-2 text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
              {grupo !== "referencia" && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--r-xs)] bg-[var(--c-brand-100)] font-mono text-[length:var(--t-label)] font-bold uppercase text-[var(--c-brand)]">
                  {grupo}
                </span>
              )}
              {GRUPO_LABELS[grupo]}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ps.map((p) => (
                <PasoCard key={p.id} paso={p} alumnoId={alumnoId} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
