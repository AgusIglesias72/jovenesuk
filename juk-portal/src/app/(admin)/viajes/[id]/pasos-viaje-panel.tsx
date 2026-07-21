"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge, Button, Checkbox, DateInput, Field, Input, Select, StepBadge, Textarea, useToast } from "@/components/ui";
import {
  EXCURSION_ESTADOS,
  PASAJE_SUBESTADOS,
  PASO_VIAJE_DEPENDENCIAS,
  PASO_VIAJE_ESTADO_LABELS,
  PASO_VIAJE_LABELS,
  PASO_VIAJE_NUMERO,
  POLICE_CHECK_ESTADO_LABELS,
  esPasoDerivado,
  transicionesPasoPermitidas,
  type EditablePasoTipo,
  type PasoViajeEstado,
  type PasoViajeTipo,
  type PoliceCheckEstado,
} from "@/lib/domain/pasos-viaje";
import { formatFecha } from "@/lib/utils/date";

import {
  cambiarEstadoPasoViajeAction,
  guardarMetadataPasoViajeAction,
  marcarAlumnoPasoViajeAction,
} from "./pasos-actions";

export type PasoView = {
  tipo: PasoViajeTipo;
  estado: PasoViajeEstado;
  metadata: Record<string, unknown>;
};

export type PoliceGLView = {
  groupLeaderId: string;
  nombre: string;
  apellido: string;
  esPrincipal: boolean;
  estado: PoliceCheckEstado;
  fechaVencimiento: Date | null;
};

const POLICE_TONE: Record<PoliceCheckEstado, "neutral" | "info" | "success" | "danger"> = {
  pendiente: "neutral",
  en_tramite: "info",
  aprobado: "success",
  vencido: "danger",
};

export type RosterItem = { asignacionId: string; nombre: string; apellido: string };

export function PasosViajePanel({
  viajeId,
  pasos,
  policeEstado,
  policeGLs,
  roster,
}: {
  viajeId: string;
  pasos: PasoView[];
  policeEstado: PasoViajeEstado;
  policeGLs: PoliceGLView[];
  roster: RosterItem[];
}) {
  const [selected, setSelected] = useState<PasoViajeTipo>("pasajes");

  const estadoPorTipo = useMemo(() => {
    const map = new Map<PasoViajeTipo, PasoViajeEstado>();
    for (const p of pasos) map.set(p.tipo, esPasoDerivado(p.tipo) ? policeEstado : p.estado);
    return map;
  }, [pasos, policeEstado]);

  const pasajesCompletado = estadoPorTipo.get("pasajes") === "completado";
  const selectedPaso = pasos.find((p) => p.tipo === selected);

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
        Seguimiento del viaje · M7
      </h2>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {pasos.map((p) => {
          const estado = estadoPorTipo.get(p.tipo) ?? p.estado;
          const bloqueadoPorDep =
            PASO_VIAJE_DEPENDENCIAS[p.tipo] === "pasajes" && !pasajesCompletado;
          const activo = p.tipo === selected;
          return (
            <button
              key={p.tipo}
              type="button"
              onClick={() => setSelected(p.tipo)}
              aria-pressed={activo}
              className={[
                "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
                activo
                  ? "border-juk-navy-700 bg-juk-navy-50"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <span className="font-mono text-[11px] font-bold text-gray-400">
                0{PASO_VIAJE_NUMERO[p.tipo]}
              </span>
              <span className="text-sm font-semibold text-juk-navy-950">
                {PASO_VIAJE_LABELS[p.tipo]}
              </span>
              <StepBadge state={estado} />
              {bloqueadoPorDep && (
                <span className="text-[11px] text-amber-700">Requiere Pasajes</span>
              )}
            </button>
          );
        })}
      </div>

      {selected === "police_checks" ? (
        <PoliceChecksView estado={policeEstado} gls={policeGLs} />
      ) : selectedPaso ? (
        <PasoEditor
          key={selectedPaso.tipo}
          viajeId={viajeId}
          paso={selectedPaso}
          pasajesCompletado={pasajesCompletado}
          roster={roster}
        />
      ) : null}
    </section>
  );
}

function PasoEditor({
  viajeId,
  paso,
  pasajesCompletado,
  roster,
}: {
  viajeId: string;
  paso: PasoView;
  pasajesCompletado: boolean;
  roster: RosterItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const tipo = paso.tipo as EditablePasoTipo;

  function cambiarEstado(estado: PasoViajeEstado) {
    startTransition(async () => {
      const r = await cambiarEstadoPasoViajeAction(viajeId, paso.tipo, estado);
      if (r.ok) {
        toast.success("Estado del paso actualizado");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function guardar(metadata: unknown) {
    startTransition(async () => {
      const r = await guardarMetadataPasoViajeAction(viajeId, tipo, metadata);
      if (r.ok) {
        toast.success("Paso guardado");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const dependenciaBloqueada =
    PASO_VIAJE_DEPENDENCIAS[paso.tipo] === "pasajes" && !pasajesCompletado;

  // Misma regla que la action: con la dependencia sin cumplir, no se ofrece
  // avanzar a "en_progreso"/"completado" (siempre se conserva el estado actual).
  const estadosOpciones = transicionesPasoPermitidas(paso.estado).filter(
    (est) =>
      !dependenciaBloqueada ||
      est === paso.estado ||
      (est !== "en_progreso" && est !== "completado")
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-juk-navy-950">{PASO_VIAJE_LABELS[paso.tipo]}</h3>
        <div className="w-full sm:w-56">
          <Select
            value={paso.estado}
            disabled={isPending}
            onChange={(e) => cambiarEstado(e.target.value as PasoViajeEstado)}
          >
            {estadosOpciones.map((est) => (
              <option key={est} value={est}>
                {PASO_VIAJE_ESTADO_LABELS[est]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {dependenciaBloqueada && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Transfers depende de que <strong>Pasajes</strong> esté completado para poder avanzar.
        </p>
      )}

      {tipo === "pasajes" && (
        <PasajesForm metadata={paso.metadata} disabled={isPending} onSave={guardar} />
      )}
      {tipo === "excursiones" && (
        <ExcursionesForm metadata={paso.metadata} disabled={isPending} onSave={guardar} />
      )}
      {tipo === "transfers" && (
        <>
          <TransfersForm metadata={paso.metadata} disabled={isPending} onSave={guardar} />
          <RosterCobertura
            viajeId={viajeId}
            tipo="transfers"
            etiqueta="Transfer asignado"
            metadata={paso.metadata}
            roster={roster}
          />
        </>
      )}
      {tipo === "tarjeta_transporte" && (
        <>
          <TarjetaForm metadata={paso.metadata} disabled={isPending} onSave={guardar} />
          <RosterCobertura
            viajeId={viajeId}
            tipo="tarjeta_transporte"
            etiqueta="Tarjeta entregada"
            metadata={paso.metadata}
            roster={roster}
          />
        </>
      )}
    </div>
  );
}

/**
 * Cobertura por alumno (M7 P3/P4): el paso se completa cuando TODOS los
 * alumnos del roster están marcados, y se reabre si alguno se desmarca.
 */
function RosterCobertura({
  viajeId,
  tipo,
  etiqueta,
  metadata,
  roster,
}: {
  viajeId: string;
  tipo: "transfers" | "tarjeta_transporte";
  etiqueta: string;
  metadata: Record<string, unknown>;
  roster: RosterItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const porAlumno = (metadata.porAlumno as Record<string, boolean> | undefined) ?? {};
  const marcados = roster.filter((r) => porAlumno[r.asignacionId] === true).length;

  function marcar(asignacionId: string, cubierto: boolean) {
    startTransition(async () => {
      const r = await marcarAlumnoPasoViajeAction(viajeId, tipo, asignacionId, cubierto);
      if (r.ok) {
        toast.success("Cobertura actualizada");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="mt-5" data-roster-cobertura={tipo}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
          {etiqueta} · por alumno
        </h4>
        <span className="font-mono text-[length:var(--t-small)] tabular-nums text-[var(--c-ink-muted)]">
          {marcados}/{roster.length}
        </span>
      </div>
      {roster.length === 0 ? (
        <p className="text-sm text-[var(--c-ink-subtle)]">
          Sin alumnos asignados al viaje todavía.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--c-border)] overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)]">
          {roster.map((r) => (
            <li key={r.asignacionId} className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium text-[var(--c-ink)]">
                {r.apellido}, {r.nombre}
              </span>
              <Checkbox
                label={etiqueta}
                checked={porAlumno[r.asignacionId] === true}
                disabled={isPending}
                onChange={(e) => marcar(r.asignacionId, e.target.checked)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── helpers de lectura de metadata (json suelto) ── */
const str = (m: Record<string, unknown>, k: string) => (typeof m[k] === "string" ? (m[k] as string) : "");
const numStr = (m: Record<string, unknown>, k: string) => (typeof m[k] === "number" ? String(m[k]) : "");
const boolOf = (m: Record<string, unknown>, k: string) => m[k] === true;
const toNum = (s: string): number | undefined => {
  const t = s.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
};
const orUndef = (s: string) => (s.trim() === "" ? undefined : s.trim());

type FormProps = {
  metadata: Record<string, unknown>;
  disabled: boolean;
  onSave: (metadata: unknown) => void;
};

function PasajesForm({ metadata, disabled, onSave }: FormProps) {
  const [subEstado, setSubEstado] = useState(str(metadata, "subEstado"));
  const [aerolinea, setAerolinea] = useState(str(metadata, "aerolinea"));
  const [numeroVuelo, setNumeroVuelo] = useState(str(metadata, "numeroVuelo"));
  const [fechaSalida, setFechaSalida] = useState(str(metadata, "fechaSalida"));
  const [fechaLlegada, setFechaLlegada] = useState(str(metadata, "fechaLlegada"));
  const [eTicketUrl, setETicketUrl] = useState(str(metadata, "eTicketUrl"));
  const [notas, setNotas] = useState(str(metadata, "notas"));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sub-estado">
          <Select value={subEstado} onChange={(e) => setSubEstado(e.target.value)} disabled={disabled}>
            <option value="">—</option>
            {PASAJE_SUBESTADOS.map((s) => (
              <option key={s} value={s}>
                {s === "sin_iniciar" ? "Sin iniciar" : s === "reservado" ? "Reservado" : "Emitido"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Aerolínea">
          <Input value={aerolinea} onChange={(e) => setAerolinea(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="N° de vuelo">
          <Input value={numeroVuelo} onChange={(e) => setNumeroVuelo(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="E-ticket (URL)" help="Pegá el enlace al e-ticket. La subida de archivos llega más adelante.">
          <Input value={eTicketUrl} onChange={(e) => setETicketUrl(e.target.value)} disabled={disabled} placeholder="https://…" />
        </Field>
        <Field label="Fecha de salida">
          <DateInput value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Fecha de llegada">
          <DateInput value={fechaLlegada} onChange={(e) => setFechaLlegada(e.target.value)} disabled={disabled} />
        </Field>
      </div>
      <Field label="Notas">
        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} disabled={disabled} />
      </Field>
      <div>
        <Button
          type="button"
          disabled={disabled}
          onClick={() =>
            onSave({
              subEstado: orUndef(subEstado),
              aerolinea: orUndef(aerolinea),
              numeroVuelo: orUndef(numeroVuelo),
              fechaSalida: orUndef(fechaSalida),
              fechaLlegada: orUndef(fechaLlegada),
              eTicketUrl: orUndef(eTicketUrl),
              notas: orUndef(notas),
            })
          }
        >
          Guardar datos
        </Button>
      </div>
    </div>
  );
}

type ExcursionRow = { id: string; nombre: string; fecha: string; proveedor: string; costoGbp: string; estado: string };

function ExcursionesForm({ metadata, disabled, onSave }: FormProps) {
  const inicial = Array.isArray(metadata.excursiones) ? (metadata.excursiones as unknown[]) : [];
  const [rows, setRows] = useState<ExcursionRow[]>(
    inicial.map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      return {
        id: crypto.randomUUID(),
        nombre: str(o, "nombre"),
        fecha: str(o, "fecha"),
        proveedor: str(o, "proveedor"),
        costoGbp: numStr(o, "costoGbp"),
        estado: str(o, "estado"),
      };
    })
  );

  const update = (i: number, patch: Partial<ExcursionRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const add = () =>
    setRows((rs) => [...rs, { id: crypto.randomUUID(), nombre: "", fecha: "", proveedor: "", costoGbp: "", estado: "" }]);

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 && <p className="text-sm text-gray-500">Todavía no hay excursiones cargadas.</p>}

      {rows.map((r, i) => (
        <div key={r.id} className="grid gap-3 rounded-md border border-gray-200 p-3 sm:grid-cols-12">
          <Field label="Nombre" className="sm:col-span-4">
            <Input value={r.nombre} onChange={(e) => update(i, { nombre: e.target.value })} disabled={disabled} />
          </Field>
          <Field label="Fecha" className="sm:col-span-2">
            <DateInput value={r.fecha} onChange={(e) => update(i, { fecha: e.target.value })} disabled={disabled} />
          </Field>
          <Field label="Proveedor" className="sm:col-span-3">
            <Input value={r.proveedor} onChange={(e) => update(i, { proveedor: e.target.value })} disabled={disabled} />
          </Field>
          <Field label="Costo (£)" className="sm:col-span-1">
            <Input inputMode="decimal" value={r.costoGbp} onChange={(e) => update(i, { costoGbp: e.target.value })} disabled={disabled} />
          </Field>
          <Field label="Estado" className="sm:col-span-2">
            <Select value={r.estado} onChange={(e) => update(i, { estado: e.target.value })} disabled={disabled}>
              <option value="">—</option>
              {EXCURSION_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s === "propuesta" ? "Propuesta" : s === "reservada" ? "Reservada" : "Pagada"}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-12">
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => remove(i)}>
              Quitar
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" disabled={disabled} onClick={add}>
          Agregar excursión
        </Button>
        <Button
          type="button"
          disabled={disabled}
          onClick={() =>
            onSave({
              excursiones: rows
                .filter((r) => r.nombre.trim() !== "")
                .map((r) => ({
                  nombre: r.nombre.trim(),
                  fecha: orUndef(r.fecha),
                  proveedor: orUndef(r.proveedor),
                  costoGbp: toNum(r.costoGbp),
                  estado: orUndef(r.estado),
                })),
            })
          }
        >
          Guardar excursiones
        </Button>
      </div>
    </div>
  );
}

function TransfersForm({ metadata, disabled, onSave }: FormProps) {
  const [proveedor, setProveedor] = useState(str(metadata, "proveedor"));
  const [costo, setCosto] = useState(numStr(metadata, "costoPorAlumnoGbp"));
  const [llegadaConfirmada, setLlegadaConfirmada] = useState(boolOf(metadata, "llegadaConfirmada"));
  const [notas, setNotas] = useState(str(metadata, "notas"));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Proveedor">
          <Input value={proveedor} onChange={(e) => setProveedor(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Costo por alumno (£)">
          <Input inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} disabled={disabled} />
        </Field>
      </div>
      <Checkbox
        label="Llegada coordinada / confirmada"
        checked={llegadaConfirmada}
        disabled={disabled}
        onChange={(e) => setLlegadaConfirmada(e.target.checked)}
      />
      <Field label="Notas">
        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} disabled={disabled} />
      </Field>
      <div>
        <Button
          type="button"
          disabled={disabled}
          onClick={() =>
            onSave({
              proveedor: orUndef(proveedor),
              costoPorAlumnoGbp: toNum(costo),
              llegadaConfirmada,
              notas: orUndef(notas),
            })
          }
        >
          Guardar datos
        </Button>
      </div>
    </div>
  );
}

function TarjetaForm({ metadata, disabled, onSave }: FormProps) {
  const [tipo, setTipo] = useState(str(metadata, "tipo"));
  const [cantidad, setCantidad] = useState(numStr(metadata, "cantidad"));
  const [costo, setCosto] = useState(numStr(metadata, "costoGbp"));
  const [proveedor, setProveedor] = useState(str(metadata, "proveedor"));
  const [comprobanteUrl, setComprobanteUrl] = useState(str(metadata, "comprobanteUrl"));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" help="Ej. Oyster, Travelcard">
          <Input value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Proveedor">
          <Input value={proveedor} onChange={(e) => setProveedor(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Cantidad">
          <Input inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Costo total (£)">
          <Input inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Comprobante (URL)" className="sm:col-span-2" help="La subida de archivos llega más adelante.">
          <Input value={comprobanteUrl} onChange={(e) => setComprobanteUrl(e.target.value)} disabled={disabled} placeholder="https://…" />
        </Field>
      </div>
      <div>
        <Button
          type="button"
          disabled={disabled}
          onClick={() =>
            onSave({
              tipo: orUndef(tipo),
              cantidad: toNum(cantidad),
              costoGbp: toNum(costo),
              proveedor: orUndef(proveedor),
              comprobanteUrl: orUndef(comprobanteUrl),
            })
          }
        >
          Guardar datos
        </Button>
      </div>
    </div>
  );
}

function PoliceChecksView({ estado, gls }: { estado: PasoViajeEstado; gls: PoliceGLView[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-juk-navy-950">Police Checks</h3>
        <StepBadge state={estado} />
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Este paso se calcula automáticamente a partir del police check de cada Group Leader del viaje.
      </p>

      {gls.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
          No hay Group Leaders asignados a este viaje todavía. La asignación de GLs al viaje llega en el
          próximo paso.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {gls.map((gl) => (
            <li key={gl.groupLeaderId} className="flex items-center justify-between py-2.5">
              <div>
                <span className="font-semibold text-juk-navy-950">
                  {gl.apellido}, {gl.nombre}
                </span>
                {gl.esPrincipal && <span className="ml-2 text-xs text-gray-500">(principal)</span>}
                {gl.fechaVencimiento && (
                  <span className="ml-2 font-mono text-xs text-gray-500">
                    vence {formatFecha(gl.fechaVencimiento)}
                  </span>
                )}
              </div>
              <Badge tone={POLICE_TONE[gl.estado]}>{POLICE_CHECK_ESTADO_LABELS[gl.estado]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
