"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import {
  ETA_SUBESTADOS,
  ETA_SUBESTADO_LABELS,
  PASO_LABELS,
  type EtaSubEstado,
  type PasoCodigo,
  type PasoEstado,
} from "@/lib/domain/pasos";

import {
  confirmarPasoFamiliaAction,
  reportarEtaFamiliaAction,
  subirDocumentoFamiliaAction,
  type FamiliaResult,
} from "../../_actions";
import { ProgresoBarra } from "../../_ui";

/**
 * Tarjeta operable de un paso del tablero, desde el portal de familias. Según el
 * código del paso muestra el accionable correcto (subir documento, reportar ETA,
 * confirmar) y delega en las server actions de _actions.ts; el ownership se
 * valida siempre server-side. El estado se muestra con copy familiar.
 */

type Tone = "neutral" | "info" | "success" | "danger";

const ESTADO_FAMILIA: Record<PasoEstado, { label: string; tone: Tone; atenuado?: boolean }> = {
  completado: { label: "Listo", tone: "success" },
  en_progreso: { label: "En curso", tone: "info" },
  pendiente: { label: "Pendiente", tone: "neutral" },
  bloqueado: { label: "En preparación", tone: "info" },
  vencido: { label: "Requiere acción", tone: "danger" },
  na: { label: "No aplica", tone: "neutral", atenuado: true },
};

const SUBIBLES: ReadonlySet<PasoCodigo> = new Set<PasoCodigo>(["a1", "a3", "d2"]);

const CARD =
  "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 shadow-[shadow:var(--shadow-1)]";

function listosDe(pasos: PasoAlumno[]): { listos: number; total: number } {
  const aplican = pasos.filter(
    (p) => p.estado !== "na" && (p.metadata as Record<string, unknown>)?.opcional !== true
  );
  return {
    listos: aplican.filter((p) => p.estado === "completado").length,
    total: aplican.length,
  };
}

export function DocumentacionPasos({
  titulo,
  pasos,
}: {
  titulo: string;
  pasos: PasoAlumno[];
}) {
  const { listos, total } = listosDe(pasos);
  const pendientes = pasos.filter(
    (p) => p.estado === "vencido"
  ).length;
  return (
    <section className="space-y-3">
      <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)]">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-base font-bold text-[var(--c-ink)]">{titulo}</h3>
          <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)]">
            {total > 0 ? `${listos} de ${total} listos` : "Sin trámites por ahora"}
          </span>
        </div>
        <div className="mt-3">
          <ProgresoBarra valor={listos} total={total} tone={total > 0 && listos === total ? "success" : "brand"} />
        </div>
        {pendientes > 0 && (
          <p className="mt-2 text-[length:var(--t-small)] font-medium text-[var(--c-danger)]">
            {pendientes === 1 ? "Hay 1 trámite que requiere tu acción." : `Hay ${pendientes} trámites que requieren tu acción.`}
          </p>
        )}
      </div>
      <ul className="space-y-2">
        {pasos.map((paso) => (
          <li key={paso.id}>
            <PasoFamilia paso={paso} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PasoFamilia({ paso }: { paso: PasoAlumno }) {
  const codigo = paso.codigo as PasoCodigo;
  const cfg = ESTADO_FAMILIA[paso.estado as PasoEstado];
  const label = PASO_LABELS[codigo] ?? paso.codigo;

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-[length:var(--t-body)] font-medium text-[var(--c-ink)] ${
            cfg.atenuado ? "opacity-60" : ""
          }`}
        >
          {label}
        </span>
        <Badge tone={cfg.tone} className={cfg.atenuado ? "opacity-70" : ""}>
          {cfg.label}
        </Badge>
      </div>
      <Accionable paso={paso} />
    </div>
  );
}

function Accionable({ paso }: { paso: PasoAlumno }) {
  if (paso.estado === "na") return null;
  const codigo = paso.codigo as PasoCodigo;

  if (SUBIBLES.has(codigo)) return <SubirArchivo paso={paso} />;
  if (codigo === "c1") return <ReportarEta paso={paso} />;
  if (codigo === "d1") return <ConfirmarPaso paso={paso} />;
  return null;
}

function useAccion() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function correr(fn: () => Promise<FamiliaResult>, exito: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(exito);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return { pending, correr };
}

function SubirArchivo({ paso }: { paso: PasoAlumno }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const { pending, correr } = useAccion();

  const metadata = paso.metadata as Record<string, unknown>;
  const yaEnviado =
    typeof metadata.archivoUrl === "string" ||
    paso.estado === "en_progreso" ||
    paso.estado === "completado";

  function enviar() {
    if (!archivo) return;
    const formData = new FormData();
    formData.set("pasoId", paso.id);
    formData.set("archivo", archivo);
    correr(() => subirDocumentoFamiliaAction(formData), "Enviado ✓ — lo revisamos pronto");
    setArchivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mt-3 space-y-2">
      {yaEnviado && (
        <p className="text-[length:var(--t-small)] font-medium text-[var(--c-success)]">
          Enviado ✓ — lo revisamos pronto
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={pending}
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          aria-label={`Adjuntar archivo para ${PASO_LABELS[paso.codigo as PasoCodigo]}`}
          className="min-w-0 flex-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)] file:mr-3 file:rounded-[var(--r-pill)] file:border file:border-[var(--c-border-strong)] file:bg-[var(--c-surface)] file:px-3 file:py-1.5 file:text-[length:var(--t-label)] file:font-semibold file:text-[var(--c-ink)]"
        />
        <Button
          type="button"
          size="sm"
          onClick={enviar}
          disabled={!archivo || pending}
        >
          {pending ? "Subiendo…" : yaEnviado ? "Reemplazar" : "Subir archivo"}
        </Button>
      </div>
      <p className="text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
        Aceptamos PDF, JPG o PNG.
      </p>
    </div>
  );
}

function ReportarEta({ paso }: { paso: PasoAlumno }) {
  const metadata = paso.metadata as Record<string, unknown>;
  const inicial =
    typeof metadata.subEstado === "string" &&
    (ETA_SUBESTADOS as readonly string[]).includes(metadata.subEstado)
      ? (metadata.subEstado as EtaSubEstado)
      : "pendiente";

  const [subEstado, setSubEstado] = useState<EtaSubEstado>(inicial);
  const { pending, correr } = useAccion();

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        Contanos en qué etapa está el ETA.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="min-w-[180px] flex-1"
          value={subEstado}
          disabled={pending}
          aria-label="Estado del ETA"
          onChange={(e) => setSubEstado(e.target.value as EtaSubEstado)}
        >
          {ETA_SUBESTADOS.map((s) => (
            <option key={s} value={s}>
              {ETA_SUBESTADO_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            correr(
              () => reportarEtaFamiliaAction({ pasoId: paso.id, subEstado }),
              "Actualizamos el estado del ETA"
            )
          }
        >
          {pending ? "Guardando…" : "Reportar"}
        </Button>
      </div>
    </div>
  );
}

function ConfirmarPaso({ paso }: { paso: PasoAlumno }) {
  const metadata = paso.metadata as Record<string, unknown>;
  const confirmado =
    metadata.confirmadoFamilia === true ||
    paso.estado === "en_progreso" ||
    paso.estado === "completado";
  const { pending, correr } = useAccion();

  if (confirmado) {
    return (
      <p className="mt-3 text-[length:var(--t-small)] font-medium text-[var(--c-success)]">
        Confirmaste que la obtuviste ✓
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        Cuando tengas la autorización firmada ante escribano, confirmala acá.
      </p>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          correr(
            () => confirmarPasoFamiliaAction({ pasoId: paso.id }),
            "Registramos tu confirmación"
          )
        }
      >
        {pending ? "Confirmando…" : "Confirmo que la obtuve"}
      </Button>
    </div>
  );
}
