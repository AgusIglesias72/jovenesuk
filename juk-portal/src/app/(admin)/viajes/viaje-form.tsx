"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Button,
  DateInput,
  Field,
  Input,
  LinkButton,
  Select,
  Textarea,
  useConfirm,
} from "@/components/ui";
import { toDateInput } from "@/lib/utils/date";
import {
  PAIS_LABELS,
  PAISES,
  TIPO_ALOJAMIENTO_LABELS,
  TIPOS_ALOJAMIENTO,
} from "@/lib/domain/colegios";
import {
  FLUJO_PAGO_LABELS,
  VIAJE_ESTADO_LABELS,
  VIAJE_ESTADOS,
  VIAJE_ORIGEN_LABELS,
  VIAJE_ORIGENES,
  VIAJE_TIPO_LABELS,
  VIAJE_TIPOS,
  aplicaComisionAgencia,
  aplicaFeeRepresentante,
  aplicaUltimoPagoPresencial,
  capacidadMaxima,
  flujoPago,
  opcionesEstado,
} from "@/lib/domain/viajes";
import type { Viaje } from "@/lib/db/schema/viajes";

import {
  cancelarViajeAction,
  createViajeAction,
  updateViajeAction,
} from "./actions";

type ColegioOption = { id: string; nombre: string };

type FormValues = {
  codigo: string;
  nombre: string;
  tipo: (typeof VIAJE_TIPOS)[number];
  fechaInicio: string;
  fechaFin: string;
  origen: (typeof VIAJE_ORIGENES)[number];
  colegioDestinoId: string;
  colegioClienteId: string;
  paisDestino: (typeof PAISES)[number];
  curso: string;
  tipoAlojamientoSolicitado: (typeof TIPOS_ALOJAMIENTO)[number];
  cantidadGroupLeaders: string;
  capacidadMinima: string;
  comisionAgenciaPct: string;
  feeRepresentante: string;
  feeRepresentanteEsPorcentaje: boolean;
  estado: (typeof VIAJE_ESTADOS)[number];
  notasInternas: string;
};

function fechaInput(d: Date | null | undefined): string {
  return d ? toDateInput(d) : "";
}

function initialValues(initial?: Viaje): FormValues {
  return {
    codigo: initial?.codigo ?? "",
    nombre: initial?.nombre ?? "",
    tipo: initial?.tipo ?? "grupal",
    fechaInicio: fechaInput(initial?.fechaInicio),
    fechaFin: fechaInput(initial?.fechaFin),
    origen: initial?.origen ?? "representante_independiente",
    colegioDestinoId: initial?.colegioDestinoId ?? "",
    colegioClienteId: initial?.colegioClienteId ?? "",
    paisDestino: initial?.paisDestino ?? "reino_unido",
    curso: initial?.curso ?? "",
    tipoAlojamientoSolicitado:
      initial?.tipoAlojamientoSolicitado ?? "familia_anfitriona",
    cantidadGroupLeaders: String(initial?.cantidadGroupLeaders ?? 1),
    capacidadMinima: String(initial?.capacidadMinima ?? 5),
    comisionAgenciaPct: initial?.comisionAgenciaPct != null ? String(initial.comisionAgenciaPct) : "",
    feeRepresentante: initial?.feeRepresentante != null ? String(initial.feeRepresentante) : "",
    feeRepresentanteEsPorcentaje: initial?.feeRepresentanteEsPorcentaje ?? false,
    estado: initial?.estado ?? "inscripcion_abierta",
    notasInternas: initial?.notasInternas ?? "",
  };
}

export function ViajeForm({
  mode,
  initial,
  colegiosDestino,
  colegiosCliente,
}: {
  mode: "create" | "edit";
  initial?: Viaje;
  colegiosDestino: ColegioOption[];
  colegiosCliente: ColegioOption[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [values, setValues] = useState<FormValues>(() => initialValues(initial));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const fe = (k: string) => fieldErrors[k]?.[0];
  const esIndividual = values.tipo === "individual";
  const capMax = capacidadMaxima(Number(values.cantidadGroupLeaders) || 0, values.tipo);
  const estadosDisponibles = initial
    ? opcionesEstado(initial.estado)
    : VIAJE_ESTADOS;

  function setTipo(tipo: FormValues["tipo"]) {
    setValues((v) => ({
      ...v,
      tipo,
      // Individual viaja sin GLs y con capacidad fija 1 (US-10b).
      cantidadGroupLeaders: tipo === "individual" ? "0" : v.cantidadGroupLeaders === "0" ? "1" : v.cantidadGroupLeaders,
      capacidadMinima: tipo === "individual" ? "1" : v.capacidadMinima,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      ...(mode === "edit" && initial ? { id: initial.id, estado: values.estado } : {}),
      codigo: values.codigo,
      nombre: values.nombre,
      tipo: values.tipo,
      fechaInicio: values.fechaInicio,
      fechaFin: values.fechaFin,
      origen: values.origen,
      colegioDestinoId: values.colegioDestinoId,
      colegioClienteId: values.colegioClienteId,
      paisDestino: values.paisDestino,
      curso: values.curso,
      tipoAlojamientoSolicitado: values.tipoAlojamientoSolicitado,
      cantidadGroupLeaders: values.cantidadGroupLeaders,
      capacidadMinima: values.capacidadMinima,
      comisionAgenciaPct: aplicaComisionAgencia(values.origen) ? values.comisionAgenciaPct : "",
      feeRepresentante: aplicaFeeRepresentante(values.origen) ? values.feeRepresentante : "",
      feeRepresentanteEsPorcentaje: values.feeRepresentanteEsPorcentaje,
      notasInternas: values.notasInternas,
    };

    startTransition(async () => {
      let result =
        mode === "create"
          ? await createViajeAction(payload)
          : await updateViajeAction(payload);
      // US-13: cambiar fechas con pasaportes comprometidos pide confirmación.
      if (!result.ok && "requiereConfirmacion" in result && result.requiereConfirmacion) {
        const { confirmado } = await confirm({
          titulo: "Atención",
          detalle: result.error,
          tone: "warning",
          confirmLabel: "Guardar igual",
        });
        if (confirmado) {
          result = await updateViajeAction(payload, { confirmarPasaportes: true });
        }
      }
      if (result.ok) {
        router.push("/viajes");
        router.refresh();
      } else if (!("requiereConfirmacion" in result && result.requiereConfirmacion)) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  async function cancelarViaje() {
    if (!initial) return;
    // US-13: confirmación + ofrecer notificar a los inscriptos por email.
    const { confirmado } = await confirm({
      titulo: `¿Cancelar el viaje ${initial.codigo}?`,
      detalle: "Los alumnos inscriptos quedan liberados. Esta acción no se puede deshacer.",
      tone: "danger",
      confirmLabel: "Sí, cancelar el viaje",
      cancelLabel: "Volver",
    });
    if (!confirmado) return;
    const { confirmado: notificar } = await confirm({
      titulo: "¿Avisar a las familias?",
      detalle: "Se envía un email de cancelación a los tutores de todos los inscriptos.",
      tone: "brand",
      confirmLabel: "Avisar a las familias",
      cancelLabel: "No avisar",
    });
    startTransition(async () => {
      const result = await cancelarViajeAction(initial.id, { notificarInscriptos: notificar });
      if (result.ok) {
        router.push("/viajes");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <Section title="Identificación">
        <Field
          label="Código"
          required
          error={fe("codigo")}
          help="Formato UK-AAAA-MMM-CIUDAD"
        >
          <Input
            value={values.codigo}
            invalid={!!fe("codigo")}
            onChange={(e) => set("codigo", e.target.value.toUpperCase())}
            placeholder="UK-2026-JUL-LONDON"
          />
        </Field>
        <Field label="Nombre" required error={fe("nombre")}>
          <Input
            value={values.nombre}
            invalid={!!fe("nombre")}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="Londres en Julio · Campus"
          />
        </Field>
        <Field
          label="Tipo de viaje"
          required
          error={fe("tipo")}
          help={
            esIndividual
              ? "Individual: sin group leaders, capacidad 1, nace Confirmado."
              : "Grupal: con group leaders, nace en Inscripción abierta."
          }
        >
          <Select
            value={values.tipo}
            disabled={mode === "edit"}
            onChange={(e) => setTipo(e.target.value as FormValues["tipo"])}
          >
            {VIAJE_TIPOS.map((t) => (
              <option key={t} value={t}>
                {VIAJE_TIPO_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha de inicio" required error={fe("fechaInicio")}>
          <DateInput
            value={values.fechaInicio}
            invalid={!!fe("fechaInicio")}
            onChange={(e) => set("fechaInicio", e.target.value)}
          />
        </Field>
        <Field label="Fecha de fin" required error={fe("fechaFin")}>
          <DateInput
            value={values.fechaFin}
            invalid={!!fe("fechaFin")}
            onChange={(e) => set("fechaFin", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Origen y destino">
        <Field label="Origen" required error={fe("origen")}>
          <Select
            value={values.origen}
            onChange={(e) => set("origen", e.target.value as FormValues["origen"])}
          >
            {VIAJE_ORIGENES.map((o) => (
              <option key={o} value={o}>
                {VIAJE_ORIGEN_LABELS[o]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Colegio cliente"
          error={fe("colegioClienteId")}
          help={
            values.origen === "colegio_cliente"
              ? "Requerido para origen Colegio cliente"
              : "Solo si el origen es un colegio cliente"
          }
        >
          <Select
            searchable
            value={values.colegioClienteId}
            invalid={!!fe("colegioClienteId")}
            onChange={(e) => set("colegioClienteId", e.target.value)}
          >
            <option value="">— Ninguno —</option>
            {colegiosCliente.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Colegio destino" required error={fe("colegioDestinoId")}>
          <Select
            searchable
            value={values.colegioDestinoId}
            invalid={!!fe("colegioDestinoId")}
            onChange={(e) => set("colegioDestinoId", e.target.value)}
          >
            <option value="">— Elegí un colegio —</option>
            {colegiosDestino.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="País de destino" required error={fe("paisDestino")}>
          <Select
            value={values.paisDestino}
            onChange={(e) => set("paisDestino", e.target.value as FormValues["paisDestino"])}
          >
            {PAISES.map((p) => (
              <option key={p} value={p}>
                {PAIS_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Programa">
        <Field label="Curso" required error={fe("curso")}>
          <Input
            value={values.curso}
            invalid={!!fe("curso")}
            onChange={(e) => set("curso", e.target.value)}
            placeholder="General English"
          />
        </Field>
        <Field label="Alojamiento solicitado" required>
          <Select
            value={values.tipoAlojamientoSolicitado}
            onChange={(e) =>
              set(
                "tipoAlojamientoSolicitado",
                e.target.value as FormValues["tipoAlojamientoSolicitado"]
              )
            }
          >
            {TIPOS_ALOJAMIENTO.map((t) => (
              <option key={t} value={t}>
                {TIPO_ALOJAMIENTO_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Capacidad">
        {esIndividual ? (
          <Field
            label="Capacidad"
            help="Viaje individual: 1 alumno, sin group leaders."
          >
            <Input value="1 alumno (fija)" disabled />
          </Field>
        ) : (
          <>
            <Field
              label="Group Leaders"
              required
              error={fe("cantidadGroupLeaders")}
              help={`Capacidad máxima: ${capMax} alumnos (GL × 12)`}
            >
              <Input
                type="number"
                min={1}
                max={20}
                value={values.cantidadGroupLeaders}
                invalid={!!fe("cantidadGroupLeaders")}
                onChange={(e) => set("cantidadGroupLeaders", e.target.value)}
              />
            </Field>
            <Field
              label="Cupo mínimo"
              required
              error={fe("capacidadMinima")}
              help="Mínimo de alumnos para confirmar el viaje"
            >
              <Input
                type="number"
                min={1}
                value={values.capacidadMinima}
                invalid={!!fe("capacidadMinima")}
                onChange={(e) => set("capacidadMinima", e.target.value)}
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Pago y estado">
        <Field
          label="Flujo de pago"
          help={
            aplicaUltimoPagoPresencial(values.origen)
              ? "El último pago se cobra presencialmente en JUK (paso B2 activo)."
              : values.origen === "colegio_cliente"
                ? "Todos los pagos van vía agencia, incluido el último (B2 = N/A)."
                : "Sin agencia externa: comisión y fee no aplican (B2 = N/A)."
          }
        >
          <Input value={FLUJO_PAGO_LABELS[flujoPago(values.origen)]} disabled />
        </Field>

        {aplicaComisionAgencia(values.origen) && (
          <Field
            label="Comisión de la agencia (%)"
            error={fe("comisionAgenciaPct")}
            help="Referencia interna, visible solo para admins."
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={values.comisionAgenciaPct}
              invalid={!!fe("comisionAgenciaPct")}
              onChange={(e) => set("comisionAgenciaPct", e.target.value)}
              placeholder="6"
            />
          </Field>
        )}

        {aplicaFeeRepresentante(values.origen) && (
          <Field
            label="Fee del representante"
            error={fe("feeRepresentante")}
            help="Monto fijo o porcentaje que el representante suma al precio base."
          >
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={values.feeRepresentante}
                invalid={!!fe("feeRepresentante")}
                onChange={(e) => set("feeRepresentante", e.target.value)}
                placeholder="0"
              />
              <Select
                value={values.feeRepresentanteEsPorcentaje ? "pct" : "monto"}
                onChange={(e) =>
                  set("feeRepresentanteEsPorcentaje", e.target.value === "pct")
                }
              >
                <option value="monto">Monto</option>
                <option value="pct">%</option>
              </Select>
            </div>
          </Field>
        )}

        {mode === "edit" && (
          <Field
            label="Estado"
            error={fe("estado")}
            help="Solo se ofrecen las transiciones válidas desde el estado actual."
          >
            <Select
              value={values.estado}
              invalid={!!fe("estado")}
              onChange={(e) => set("estado", e.target.value as FormValues["estado"])}
            >
              {estadosDisponibles.map((s) => (
                <option key={s} value={s}>
                  {VIAJE_ESTADO_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Notas internas" className="col-span-2">
          <Textarea
            value={values.notasInternas}
            onChange={(e) => set("notasInternas", e.target.value)}
            placeholder="Información interna sobre el viaje…"
          />
        </Field>
      </Section>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          {mode === "edit" && initial && initial.estado !== "cancelado" && (
            <Button
              type="button"
              variant="danger"
              disabled={isPending}
              onClick={cancelarViaje}
            >
              Cancelar viaje
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LinkButton href="/viajes" variant="secondary">
            Volver
          </LinkButton>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
