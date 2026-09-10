"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { WHATSAPP_URL } from "@/lib/contact";
import { type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import {
  ETA_PROBLEMA_LABELS,
  ETA_PROBLEMAS,
  ETA_SUBESTADO_LABELS_FAMILIA,
  ETA_SUBESTADOS,
  ETA_SUBESTADOS_FAMILIA,
  ETA_URL_OFICIAL,
  GRUPO_LABELS_FAMILIA,
  PASO_AYUDA_FAMILIA,
  PASO_LABELS_FAMILIA,
  RESPONSABLE_LABELS,
  agruparPorGrupoPaso,
  codigoVisible,
  esEtaSubEstadoFamilia,
  type EtaProblema,
  type EtaSubEstado,
  type EtaSubEstadoFamilia,
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
 * Documentación del alumno desde el portal de familias (PRD 04 · Módulo 1).
 *
 * Agrupa los trámites en las etapas del tablero (A/B/C/D) con su identificador
 * visible, y cada tarjeta dice qué es y quién lo mueve (copy del dominio, no
 * del JSX). Según el código muestra el accionable (subir documento, reportar
 * ETA, confirmar) y delega en las server actions de _actions.ts; el ownership
 * se valida siempre server-side.
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

const LINK =
  "font-semibold text-[var(--c-brand)] underline decoration-[var(--c-brand-300)] underline-offset-4 hover:decoration-[var(--c-brand)]";

function listosDe(pasos: PasoAlumno[]): { listos: number; total: number } {
  const aplican = pasos.filter(
    (p) => p.estado !== "na" && (p.metadata as Record<string, unknown>)?.opcional !== true
  );
  return {
    listos: aplican.filter((p) => p.estado === "completado").length,
    total: aplican.length,
  };
}

function metadataDe(paso: PasoAlumno): Record<string, unknown> {
  return (paso.metadata ?? {}) as Record<string, unknown>;
}

function subEstadoEta(paso: PasoAlumno): EtaSubEstado {
  const valor = metadataDe(paso).subEstado;
  return typeof valor === "string" && (ETA_SUBESTADOS as readonly string[]).includes(valor)
    ? (valor as EtaSubEstado)
    : "pendiente";
}

function tipoProblemaEta(paso: PasoAlumno): EtaProblema | null {
  const valor = metadataDe(paso).tipoProblema;
  return typeof valor === "string" && (ETA_PROBLEMAS as readonly string[]).includes(valor)
    ? (valor as EtaProblema)
    : null;
}

/** Estado visible para la familia; el ETA con problema va en rojo (US-1.6.6). */
function estadoVisible(paso: PasoAlumno): { label: string; tone: Tone; atenuado?: boolean } {
  if (paso.codigo === "c1" && paso.estado !== "na") {
    const sub = subEstadoEta(paso);
    if (sub === "rechazado") return { label: "Con un problema", tone: "danger" };
    if (sub === "en_tramite") return { label: "En trámite", tone: "info" };
  }
  return ESTADO_FAMILIA[paso.estado as PasoEstado];
}

export function DocumentacionPasos({
  titulo,
  pasos,
}: {
  titulo: string;
  pasos: PasoAlumno[];
}) {
  const { listos, total } = listosDe(pasos);
  const pendientes = pasos.filter((p) => p.estado === "vencido").length;
  const grupos = agruparPorGrupoPaso(pasos);

  return (
    <section className="space-y-6" aria-label={titulo}>
      <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold text-[var(--c-ink)]">{titulo}</h2>
          <span className="shrink-0 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)]">
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

      {grupos.map(({ grupo, items }) => {
        const cfg = GRUPO_LABELS_FAMILIA[grupo];
        const avance = listosDe(items);
        return (
          <section key={grupo} className="space-y-2" aria-label={cfg.titulo}>
            <div className="flex items-end justify-between gap-3 px-1">
              <div className="min-w-0">
                <h3 className="font-display text-[length:var(--t-body)] font-bold text-[var(--c-ink)]">
                  {cfg.titulo}
                </h3>
                <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{cfg.bajada}</p>
              </div>
              {avance.total > 0 && (
                <span className="shrink-0 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                  {avance.listos}/{avance.total}
                </span>
              )}
            </div>
            <ul className="space-y-2">
              {items.map((paso) => (
                <li key={paso.id}>
                  <PasoFamilia paso={paso} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}

export function PasoFamilia({ paso }: { paso: PasoAlumno }) {
  const codigo = paso.codigo as PasoCodigo;
  const cfg = estadoVisible(paso);
  const label = PASO_LABELS_FAMILIA[codigo] ?? paso.codigo;
  const ayuda = PASO_AYUDA_FAMILIA[codigo];
  const noAplica = paso.estado === "na";

  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className={`min-w-0 ${cfg.atenuado ? "opacity-60" : ""}`}>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-[var(--r-xs)] bg-[var(--c-surface-2)] px-1.5 py-0.5 font-mono text-[length:var(--t-label)] font-bold text-[var(--c-ink-muted)]">
              {codigoVisible(codigo)}
            </span>
            <span className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">{label}</span>
          </p>
          {ayuda && !noAplica && (
            <>
              <p className="mt-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                {ayuda.que}
              </p>
              <p className="mt-1 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                {RESPONSABLE_LABELS[ayuda.responsable]}
              </p>
            </>
          )}
          {noAplica && (
            <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              No hace falta para este viaje.
            </p>
          )}
        </div>
        <Badge tone={cfg.tone} className={`shrink-0 ${cfg.atenuado ? "opacity-70" : ""}`}>
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

  const metadata = metadataDe(paso);
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
      {/* El input nativo queda oculto: en el teléfono cada plataforma lo dibuja
          distinto y el nombre del archivo se corta. El botón grande es el que
          abre el picker del sistema (que ya ofrece cámara, fotos y archivos),
          y `hidden` no le impide a Playwright hacer setInputFiles. */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        disabled={pending}
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        aria-label={`Adjuntar archivo para ${PASO_LABELS_FAMILIA[paso.codigo as PasoCodigo]}`}
        className="hidden"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="w-full sm:w-auto"
        >
          Elegir archivo o sacar foto
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={enviar}
          disabled={!archivo || pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Subiendo…" : yaEnviado ? "Reemplazar" : "Subir archivo"}
        </Button>
      </div>
      {archivo && (
        <p className="truncate text-[length:var(--t-small)] font-medium text-[var(--c-ink)]">
          Elegiste: {archivo.name}
        </p>
      )}
      <p className="text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
        Aceptamos PDF, JPG o PNG.
      </p>
    </div>
  );
}

/* ============================================================
   C1 · ETA — avance, problema (US-1.6) y orientación (US-1.7)
   ============================================================ */

function ReportarEta({ paso }: { paso: PasoAlumno }) {
  const actual = subEstadoEta(paso);
  const conProblema = actual === "rechazado";
  // Con un problema reportado, lo natural es volver a pedirlo: "en trámite" (US-1.8).
  const inicial: EtaSubEstadoFamilia = esEtaSubEstadoFamilia(actual)
    ? actual
    : conProblema
      ? "en_tramite"
      : "pendiente";

  const [subEstado, setSubEstado] = useState<EtaSubEstadoFamilia>(inicial);
  const [reportando, setReportando] = useState(false);
  const { pending, correr } = useAccion();

  return (
    <div className="mt-3 space-y-3">
      {conProblema && <OrientacionEta problema={tipoProblemaEta(paso)} />}

      <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        {conProblema ? "Cuando lo vuelvas a pedir, contanos en qué etapa está." : "Contanos en qué etapa está."}{" "}
        Se pide en el{" "}
        <a href={ETA_URL_OFICIAL} target="_blank" rel="noopener noreferrer" className={LINK}>
          sitio oficial del gobierno británico ↗
        </a>
        .
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          className="w-full sm:min-w-[220px] sm:flex-1"
          value={subEstado}
          disabled={pending}
          aria-label="Estado del ETA"
          onChange={(e) => {
            if (esEtaSubEstadoFamilia(e.target.value)) setSubEstado(e.target.value);
          }}
        >
          {ETA_SUBESTADOS_FAMILIA.map((s) => (
            <option key={s} value={s}>
              {ETA_SUBESTADO_LABELS_FAMILIA[s]}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          className="w-full sm:w-auto"
          onClick={() =>
            correr(
              () => reportarEtaFamiliaAction({ pasoId: paso.id, subEstado }),
              "Actualizamos el estado del ETA"
            )
          }
        >
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      {reportando ? (
        <ProblemaEta paso={paso} onCerrar={() => setReportando(false)} />
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={pending}
          className="w-full sm:w-auto"
          onClick={() => setReportando(true)}
        >
          Tuve un problema con el ETA
        </Button>
      )}
    </div>
  );
}

function ProblemaEta({ paso, onCerrar }: { paso: PasoAlumno; onCerrar: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<EtaProblema>("rechazo_gobierno");
  const [comentario, setComentario] = useState("");
  const [captura, setCaptura] = useState<File | null>(null);

  function enviar() {
    startTransition(async () => {
      // La captura va primero: subirla mueve el paso a "en curso", y el reporte
      // que sigue es el que lo deja marcado con el problema.
      if (captura) {
        const formData = new FormData();
        formData.set("pasoId", paso.id);
        formData.set("archivo", captura);
        const subida = await subirDocumentoFamiliaAction(formData);
        if (!subida.ok) {
          toast.error("No pudimos subir la captura", { descripcion: subida.error });
          return;
        }
      }

      const res = await reportarEtaFamiliaAction({
        pasoId: paso.id,
        subEstado: "rechazado",
        tipoProblema: tipo,
        comentario: comentario.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Recibimos tu aviso", {
          descripcion: "Quedó registrado para el equipo de JUK. Te dejamos los próximos pasos en el trámite.",
        });
        onCerrar();
        router.refresh();
      } else {
        toast.error("No pudimos enviar el aviso", { descripcion: res.error });
      }
    });
  }

  return (
    <div className="space-y-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-3)] p-4">
      <div>
        <p className="font-display text-[length:var(--t-body)] font-bold text-[var(--c-ink)]">
          Contanos qué pasó con el ETA
        </p>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Pasa más de lo que parece y casi siempre tiene solución. Con estos datos te podemos ayudar más rápido.
        </p>
      </div>

      <Field label="¿Qué pasó?">
        <Select
          value={tipo}
          disabled={pending}
          onChange={(e) => {
            const valor = e.target.value;
            const elegido = ETA_PROBLEMAS.find((p) => p === valor);
            if (elegido) setTipo(elegido);
          }}
        >
          {ETA_PROBLEMAS.map((p) => (
            <option key={p} value={p}>
              {ETA_PROBLEMA_LABELS[p]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Contanos un poco más (opcional)" help="Por ejemplo, el mensaje de error que te apareció.">
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={2000}
          disabled={pending}
        />
      </Field>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={pending}
          onChange={(e) => setCaptura(e.target.files?.[0] ?? null)}
          aria-label="Captura del error del ETA"
          className="hidden"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="w-full sm:w-auto"
        >
          {captura ? "Cambiar captura" : "Adjuntar una captura (opcional)"}
        </Button>
        {captura && (
          <p className="truncate text-[length:var(--t-small)] font-medium text-[var(--c-ink)]">
            Elegiste: {captura.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="lg" onClick={enviar} disabled={pending} className="w-full sm:w-auto">
          {pending ? "Enviando…" : "Enviar aviso"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onCerrar}
          disabled={pending}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function OrientacionEta({ problema }: { problema: EtaProblema | null }) {
  return (
    <div
      role="status"
      className="space-y-2 rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-3)] p-4 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]"
    >
      <p className="font-display text-[length:var(--t-body)] font-bold text-[var(--c-ink)]">
        Recibimos tu aviso: te ayudamos a resolverlo
      </p>
      {problema && (
        <p>
          Nos contaste: <span className="font-semibold text-[var(--c-ink)]">{ETA_PROBLEMA_LABELS[problema]}</span>.
        </p>
      )}
      <ul className="list-disc space-y-1 pl-5">
        <li>Revisá que el nombre, el número de pasaporte y la fecha de nacimiento estén igual que en el pasaporte.</li>
        <li>Si fue un error de datos o de la app, podés volver a pedirlo desde el sitio oficial.</li>
        <li>
          Si el gobierno lo rechazó, escribinos antes de volver a intentar: en algunos casos hace falta pedir
          una visa, que puede demorar hasta 3 semanas.
        </li>
      </ul>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <a href={ETA_URL_OFICIAL} target="_blank" rel="noopener noreferrer" className={LINK}>
          Ir al sitio oficial ↗
        </a>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
          Escribinos por WhatsApp ↗
        </a>
      </p>
    </div>
  );
}

function ConfirmarPaso({ paso }: { paso: PasoAlumno }) {
  const metadata = metadataDe(paso);
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
        size="lg"
        disabled={pending}
        className="w-full sm:w-auto"
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
