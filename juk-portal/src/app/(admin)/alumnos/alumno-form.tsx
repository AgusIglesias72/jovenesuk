"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Button,
  DateInput,
  Field,
  Input,
  SectionTitle,
  Select,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import { AvisoErrores, useErroresDeFormulario } from "@/components/ui/form-errors";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import {
  ALUMNO_ESTADO_LABELS,
  ALUMNO_ESTADOS,
  CONDICION_FISCAL_LABELS,
  CONDICIONES_FISCALES,
} from "@/lib/domain/alumnos";
import { toDateInput } from "@/lib/utils/date";
import { formatearDni, soloDigitos } from "@/lib/utils/dni";
import type { Alumno } from "@/lib/db/schema/alumnos";

import {
  createAlumnoAction,
  darDeBajaAlumnoAction,
  reactivarAlumnoAction,
  updateAlumnoAction,
} from "./actions";

type FacturacionValues = {
  razonSocial: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  cuilCuit: string;
  condicionFiscal: (typeof CONDICIONES_FISCALES)[number];
};

/** Los campos que delatan que este alumno YA factura: abren la sección plegada. */
const CAMPOS_FACTURACION = [
  "razonSocial",
  "direccion",
  "localidad",
  "provincia",
  "codigoPostal",
  "cuilCuit",
] as const satisfies readonly (keyof FacturacionValues)[];

type FormValues = {
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  dni: string;
  numeroPasaporte: string;
  fechaVencimientoPasaporte: string;
  telefonoAlumno: string;
  emailAlumno: string;
  alergiasSalud: string;
  tutor1Nombre: string;
  tutor1Celular: string;
  tutor1Email: string;
  tutor2Nombre: string;
  tutor2Celular: string;
  tutor2Email: string;
  facturacion: FacturacionValues;
  preferenciasAlojamiento: string;
  nivelInglesAutoevaluacion: string;
  estado: (typeof ALUMNO_ESTADOS)[number];
  notasInternas: string;
};

function initialValues(initial?: Alumno): FormValues {
  const f = initial?.facturacion ?? null;
  return {
    nombre: initial?.nombre ?? "",
    apellido: initial?.apellido ?? "",
    fechaNacimiento: initial ? toDateInput(initial.fechaNacimiento) : "",
    dni: initial?.dni ?? "",
    numeroPasaporte: initial?.numeroPasaporte ?? "",
    fechaVencimientoPasaporte: initial ? toDateInput(initial.fechaVencimientoPasaporte) : "",
    telefonoAlumno: initial?.telefonoAlumno ?? "",
    emailAlumno: initial?.emailAlumno ?? "",
    alergiasSalud: initial?.alergiasSalud ?? "",
    tutor1Nombre: initial?.tutor1Nombre ?? "",
    tutor1Celular: initial?.tutor1Celular ?? "",
    tutor1Email: initial?.tutor1Email ?? "",
    tutor2Nombre: initial?.tutor2Nombre ?? "",
    tutor2Celular: initial?.tutor2Celular ?? "",
    tutor2Email: initial?.tutor2Email ?? "",
    facturacion: {
      razonSocial: f?.razonSocial ?? "",
      direccion: f?.direccion ?? "",
      localidad: f?.localidad ?? "",
      provincia: f?.provincia ?? "",
      codigoPostal: f?.codigoPostal ?? "",
      cuilCuit: f?.cuilCuit ?? "",
      condicionFiscal: f?.condicionFiscal ?? "consumidor_final",
    },
    preferenciasAlojamiento: initial?.preferenciasAlojamiento ?? "",
    nivelInglesAutoevaluacion: initial?.nivelInglesAutoevaluacion ?? "",
    estado: initial?.estado ?? "pre_inscripto",
    notasInternas: initial?.notasInternas ?? "",
  };
}

export function AlumnoForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Alumno;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [values, setValues] = useState<FormValues>(() => initialValues(initial));
  const { formRef, fe, hayErrorCon, reportar, limpiar, aviso } = useErroresDeFormulario();
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [facturacionAbierta, setFacturacionAbierta] = useState(() =>
    CAMPOS_FACTURACION.some((k) => (initial?.facturacion?.[k] ?? "") !== "")
  );

  useUnsavedChanges(dirty);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setDirty(true);
    setValues((v) => ({ ...v, [key]: value }));
  }
  function setFact<K extends keyof FacturacionValues>(key: K, value: FacturacionValues[K]) {
    setDirty(true);
    setValues((v) => ({ ...v, facturacion: { ...v.facturacion, [key]: value } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    limpiar();

    const { estado, ...rest } = values;
    const payload = {
      ...(mode === "edit" && initial ? { id: initial.id, estado } : {}),
      ...rest,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAlumnoAction(payload)
          : await updateAlumnoAction(payload);
      if (result.ok) {
        setDirty(false);
        toast.success(mode === "create" ? "Alumno creado." : "Alumno guardado.");
        router.push("/alumnos");
        router.refresh();
      } else {
        toast.error(result.error);
        reportar(result.fieldErrors);
      }
    });
  }

  async function darDeBaja() {
    if (!initial) return;
    const { confirmado, valor } = await confirm({
      titulo: `¿Dar de baja a ${initial.nombre} ${initial.apellido}?`,
      detalle: "Se lo quita de los listados activos. Sus datos y su historial se conservan.",
      tone: "danger",
      confirmLabel: "Sí, dar de baja",
      campo: { label: "Motivo (opcional)", placeholder: "Ej: la familia pospone el viaje" },
    });
    if (!confirmado) return;
    startTransition(async () => {
      const result = await darDeBajaAlumnoAction(initial.id, valor || null);
      if (result.ok) {
        setDirty(false);
        toast.success("Alumno dado de baja.");
        router.push("/alumnos");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function cancelar() {
    if (dirty) {
      const { confirmado } = await confirm({
        titulo: "¿Descartar los cambios?",
        detalle: "Tenés cambios sin guardar.",
        tone: "warning",
        confirmLabel: "Descartar",
      });
      if (!confirmado) return;
    }
    router.push("/alumnos");
  }

  function reactivar() {
    if (!initial) return;
    startTransition(async () => {
      const result = await reactivarAlumnoAction(initial.id);
      if (result.ok) {
        setDirty(false);
        toast.success("Alumno reactivado.");
        router.push("/alumnos");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const alta = mode === "create";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl">
      <AvisoErrores>{aviso}</AvisoErrores>

      <Section title="Datos personales">
        <TextField label="Nombre" required autoFocus={alta} value={values.nombre} error={fe("nombre")} onChange={(v) => set("nombre", v)} />
        <TextField label="Apellido" required value={values.apellido} error={fe("apellido")} onChange={(v) => set("apellido", v)} />
        <TextField label="Fecha de nacimiento" required type="date" value={values.fechaNacimiento} error={fe("fechaNacimiento")} onChange={(v) => set("fechaNacimiento", v)} />
        <TextField label="DNI" required value={formatearDni(values.dni)} error={fe("dni")} onChange={(v) => set("dni", soloDigitos(v))} />
        <TextField label="N° de pasaporte" required value={values.numeroPasaporte} error={fe("numeroPasaporte")} onChange={(v) => set("numeroPasaporte", v)} />
        <TextField label="Vencimiento del pasaporte" required type="date" value={values.fechaVencimientoPasaporte} error={fe("fechaVencimientoPasaporte")} onChange={(v) => set("fechaVencimientoPasaporte", v)} />
      </Section>

      <Section title="Contacto del alumno">
        <TextField label="Teléfono" value={values.telefonoAlumno} onChange={(v) => set("telefonoAlumno", v)} />
        <TextField label="Email" type="email" value={values.emailAlumno} error={fe("emailAlumno")} onChange={(v) => set("emailAlumno", v)} />
        <Field label="Alergias / salud" help="Información confidencial" className="col-span-1 sm:col-span-2">
          <Textarea value={values.alergiasSalud} onChange={(e) => set("alergiasSalud", e.target.value)} />
        </Field>
      </Section>

      <Section title="Tutor 1">
        <TextField label="Nombre" required value={values.tutor1Nombre} error={fe("tutor1Nombre")} onChange={(v) => set("tutor1Nombre", v)} />
        <TextField label="Celular" required value={values.tutor1Celular} error={fe("tutor1Celular")} onChange={(v) => set("tutor1Celular", v)} />
        <TextField label="Email" required type="email" value={values.tutor1Email} error={fe("tutor1Email")} onChange={(v) => set("tutor1Email", v)} className="col-span-1 sm:col-span-2" />
      </Section>

      <Section title="Tutor 2 (opcional)">
        <TextField label="Nombre" value={values.tutor2Nombre} onChange={(v) => set("tutor2Nombre", v)} />
        <TextField label="Celular" value={values.tutor2Celular} onChange={(v) => set("tutor2Celular", v)} />
        <TextField label="Email" type="email" value={values.tutor2Email} error={fe("tutor2Email")} onChange={(v) => set("tutor2Email", v)} className="col-span-1 sm:col-span-2" />
      </Section>

      <SeccionPlegable
        title="Facturación (opcional)"
        abierta={facturacionAbierta || hayErrorCon("facturacion.")}
        onToggle={setFacturacionAbierta}
      >
        <TextField label="Razón social" value={values.facturacion.razonSocial} error={fe("facturacion.razonSocial")} onChange={(v) => setFact("razonSocial", v)} />
        <TextField label="CUIL / CUIT" value={values.facturacion.cuilCuit} error={fe("facturacion.cuilCuit")} onChange={(v) => setFact("cuilCuit", v)} />
        <TextField label="Dirección" value={values.facturacion.direccion} error={fe("facturacion.direccion")} onChange={(v) => setFact("direccion", v)} />
        <TextField label="Localidad" value={values.facturacion.localidad} error={fe("facturacion.localidad")} onChange={(v) => setFact("localidad", v)} />
        <TextField label="Provincia" value={values.facturacion.provincia} error={fe("facturacion.provincia")} onChange={(v) => setFact("provincia", v)} />
        <TextField label="Código postal" value={values.facturacion.codigoPostal} error={fe("facturacion.codigoPostal")} onChange={(v) => setFact("codigoPostal", v)} />
        <Field label="Condición fiscal">
          <Select value={values.facturacion.condicionFiscal} onChange={(e) => setFact("condicionFiscal", e.target.value as FacturacionValues["condicionFiscal"])}>
            {CONDICIONES_FISCALES.map((c) => (
              <option key={c} value={c}>
                {CONDICION_FISCAL_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
      </SeccionPlegable>

      <Section title="Preferencias y notas">
        <TextField label="Preferencias de alojamiento" value={values.preferenciasAlojamiento} onChange={(v) => set("preferenciasAlojamiento", v)} />
        <TextField label="Nivel de inglés (autoevaluación)" value={values.nivelInglesAutoevaluacion} onChange={(v) => set("nivelInglesAutoevaluacion", v)} />
        {mode === "edit" && (
          <Field label="Estado">
            <Select value={values.estado} onChange={(e) => set("estado", e.target.value as FormValues["estado"])}>
              {ALUMNO_ESTADOS.filter((e) => e !== "baja" || values.estado === "baja").map((e) => (
                <option key={e} value={e} disabled={e === "baja"}>
                  {ALUMNO_ESTADO_LABELS[e]}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Notas internas" className="col-span-1 sm:col-span-2">
          <Textarea value={values.notasInternas} onChange={(e) => set("notasInternas", e.target.value)} />
        </Field>
      </Section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          {mode === "edit" && initial && initial.estado !== "baja" && (
            <Button
              type="button"
              variant="danger"
              disabled={isPending}
              onClick={darDeBaja}
              className="w-full sm:w-auto"
            >
              Dar de baja
            </Button>
          )}
          {mode === "edit" && initial && initial.estado === "baja" && (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={reactivar}
              className="w-full sm:w-auto"
            >
              Reactivar
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={cancelar}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
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
      <SectionTitle className="mb-3">{title}</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * Sección plegable — Facturación arranca cerrada (MIN-15: se conserva, pero
 * son 7 campos que casi nunca se cargan en el alta).
 */
function SeccionPlegable({
  title,
  abierta,
  onToggle,
  children,
}: {
  title: string;
  abierta: boolean;
  onToggle: (abierta: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details
      open={abierta}
      onToggle={(e) => onToggle(e.currentTarget.open)}
      className="group mb-8 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4"
    >
      <summary className="-mx-4 flex min-h-[var(--tap)] list-none items-center gap-2 px-4 text-[var(--c-ink-subtle)] [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="transition-transform duration-150 group-open:rotate-90"
        >
          ▸
        </span>
        <SectionTitle as="div">{title}</SectionTitle>
      </summary>
      <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}

function TextField({
  label,
  required,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  help,
  className,
  autoFocus,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  help?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <Field label={label} required={required} error={error} help={help} className={className}>
      {type === "date" ? (
        <DateInput
          value={value}
          invalid={!!error}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          type={type}
          value={value}
          invalid={!!error}
          placeholder={placeholder}
          // Solo en el alta: en un form vacío el primer campo es exactamente
          // donde el usuario va a escribir (en edición sería un salto molesto).
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}
