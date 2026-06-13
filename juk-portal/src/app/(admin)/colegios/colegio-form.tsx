"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import {
  CONFIG_DOCUMENTAL_DEFAULT,
  DOCUMENTO_LABELS,
  DOCUMENTOS_PROGRAMA,
  PAIS_LABELS,
  PAISES,
  REQUISITO_LABELS,
  REQUISITOS_DOCUMENTO,
  TIPO_ALOJAMIENTO_LABELS,
  TIPO_COLEGIO_LABELS,
  TIPO_ENTRADA_LABELS,
  TIPOS_ALOJAMIENTO,
  TIPOS_COLEGIO,
  TIPOS_ENTRADA,
  tipoEntradaPorPais,
  type ConfigDocumental,
  type RequisitoDocumento,
} from "@/lib/domain/colegios";
import type { Colegio, Contacto } from "@/lib/db/schema/colegios";

import {
  createColegioAction,
  desactivarColegioAction,
  reactivarColegioAction,
  updateColegioAction,
} from "./actions";

type ContactoValues = { nombre: string; email: string; telefono: string };
type TipoAlojamiento = (typeof TIPOS_ALOJAMIENTO)[number];

type FormValues = {
  nombre: string;
  tipo: (typeof TIPOS_COLEGIO)[number];
  pais: (typeof PAISES)[number];
  ciudad: string;
  contactoAcademico: ContactoValues;
  contactoAdministrativo: ContactoValues;
  contactoAlojamientos: ContactoValues;
  contactoJuniors: ContactoValues;
  cursosDisponibles: string;
  tiposAlojamiento: TipoAlojamiento[];
  tipoEntradaRequerida: (typeof TIPOS_ENTRADA)[number];
  configDocumental: ConfigDocumental;
  comisionAgenciaPorcentaje: string;
  sitioWeb: string;
  notas: string;
};

function toContacto(c: Contacto | null | undefined): ContactoValues {
  return {
    nombre: c?.nombre ?? "",
    email: c?.email ?? "",
    telefono: c?.telefono ?? "",
  };
}

function initialValues(initial?: Colegio, initialConfig?: ConfigDocumental): FormValues {
  const pais = initial?.pais ?? "reino_unido";
  return {
    nombre: initial?.nombre ?? "",
    tipo: initial?.tipo ?? "destino",
    pais,
    ciudad: initial?.ciudad ?? "",
    contactoAcademico: toContacto(initial?.contactoAcademico),
    contactoAdministrativo: toContacto(initial?.contactoAdministrativo),
    contactoAlojamientos: toContacto(initial?.contactoAlojamientos),
    contactoJuniors: toContacto(initial?.contactoJuniors),
    cursosDisponibles: (initial?.cursosDisponibles ?? []).join(", "),
    tiposAlojamiento: initial?.tiposAlojamiento ?? [],
    tipoEntradaRequerida: initial?.tipoEntradaRequerida ?? tipoEntradaPorPais(pais),
    configDocumental: initialConfig ?? { ...CONFIG_DOCUMENTAL_DEFAULT },
    comisionAgenciaPorcentaje:
      initial?.comisionAgenciaPorcentaje != null
        ? String(initial.comisionAgenciaPorcentaje)
        : "",
    sitioWeb: initial?.sitioWeb ?? "",
    notas: initial?.notas ?? "",
  };
}

export function ColegioForm({
  mode,
  initial,
  initialConfig,
}: {
  mode: "create" | "edit";
  initial?: Colegio;
  initialConfig?: ConfigDocumental;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [values, setValues] = useState<FormValues>(() =>
    initialValues(initial, initialConfig)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  useUnsavedChanges(dirty);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setDirty(true);
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setContacto(
    key:
      | "contactoAcademico"
      | "contactoAdministrativo"
      | "contactoAlojamientos"
      | "contactoJuniors",
    field: keyof ContactoValues,
    value: string
  ) {
    setDirty(true);
    setValues((v) => ({ ...v, [key]: { ...v[key], [field]: value } }));
  }

  function toggleAlojamiento(t: TipoAlojamiento, checked: boolean) {
    setDirty(true);
    setValues((v) => ({
      ...v,
      tiposAlojamiento: checked
        ? [...v.tiposAlojamiento, t]
        : v.tiposAlojamiento.filter((x) => x !== t),
    }));
  }

  function setPais(pais: FormValues["pais"]) {
    setDirty(true);
    setValues((v) => ({
      ...v,
      pais,
      // En alta, el tipo de entrada sigue al país (MIN-14); en edición no se pisa.
      tipoEntradaRequerida:
        mode === "create" ? tipoEntradaPorPais(pais) : v.tipoEntradaRequerida,
    }));
  }

  function setRequisito(documento: (typeof DOCUMENTOS_PROGRAMA)[number], requisito: RequisitoDocumento) {
    setDirty(true);
    setValues((v) => ({
      ...v,
      configDocumental: { ...v.configDocumental, [documento]: requisito },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const payload = {
      ...(mode === "edit" && initial ? { id: initial.id } : {}),
      nombre: values.nombre,
      tipo: values.tipo,
      pais: values.pais,
      ciudad: values.ciudad,
      contactoAcademico: values.contactoAcademico,
      contactoAdministrativo: values.contactoAdministrativo,
      contactoAlojamientos: values.contactoAlojamientos,
      contactoJuniors: values.contactoJuniors,
      cursosDisponibles: values.cursosDisponibles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tiposAlojamiento: values.tiposAlojamiento,
      tipoEntradaRequerida: values.tipoEntradaRequerida,
      configDocumental: values.configDocumental,
      comisionAgenciaPorcentaje: values.comisionAgenciaPorcentaje,
      sitioWeb: values.sitioWeb,
      notas: values.notas,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createColegioAction(payload)
          : await updateColegioAction(payload);
      if (result.ok) {
        setDirty(false);
        toast.success(
          mode === "create" ? "Colegio creado." : "Colegio actualizado."
        );
        router.push("/colegios");
        router.refresh();
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function cambiarEstado(nuevo: "activo" | "inactivo") {
    if (!initial) return;
    startTransition(async () => {
      const result =
        nuevo === "inactivo"
          ? await desactivarColegioAction(initial.id)
          : await reactivarColegioAction(initial.id);
      if (result.ok) {
        setDirty(false);
        toast.success(
          nuevo === "inactivo" ? "Colegio desactivado." : "Colegio reactivado."
        );
        router.push("/colegios");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleCancelar() {
    if (dirty) {
      const { confirmado } = await confirm({
        titulo: "¿Descartar los cambios?",
        detalle: "Tenés cambios sin guardar.",
        tone: "warning",
        confirmLabel: "Descartar",
      });
      if (!confirmado) return;
    }
    router.push("/colegios");
  }

  const fe = (k: string) => fieldErrors[k]?.[0];
  const ce = (prefix: string) => ({
    nombre: fe(`${prefix}.nombre`),
    email: fe(`${prefix}.email`),
    telefono: fe(`${prefix}.telefono`),
  });

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <Section title="Datos generales">
        <Field label="Nombre" required error={fe("nombre")} className="col-span-2">
          <Input
            value={values.nombre}
            invalid={!!fe("nombre")}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="London School of English"
          />
        </Field>

        <Field label="Tipo" required error={fe("tipo")}>
          <Select
            value={values.tipo}
            onChange={(e) => set("tipo", e.target.value as FormValues["tipo"])}
          >
            {TIPOS_COLEGIO.map((t) => (
              <option key={t} value={t}>
                {TIPO_COLEGIO_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="País" required error={fe("pais")}>
          <Select
            value={values.pais}
            onChange={(e) => setPais(e.target.value as FormValues["pais"])}
          >
            {PAISES.map((p) => (
              <option key={p} value={p}>
                {PAIS_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ciudad" required error={fe("ciudad")} className="col-span-2">
          <Input
            value={values.ciudad}
            invalid={!!fe("ciudad")}
            onChange={(e) => set("ciudad", e.target.value)}
            placeholder="Londres"
          />
        </Field>
      </Section>

      <Section title="Contactos">
        <ContactoFields
          legend="Académico"
          required
          value={values.contactoAcademico}
          errors={ce("contactoAcademico")}
          onChange={(f, v) => setContacto("contactoAcademico", f, v)}
        />
        <ContactoFields
          legend="Administrativo"
          required
          value={values.contactoAdministrativo}
          errors={ce("contactoAdministrativo")}
          onChange={(f, v) => setContacto("contactoAdministrativo", f, v)}
        />
        <ContactoFields
          legend="Alojamientos (opcional)"
          value={values.contactoAlojamientos}
          errors={ce("contactoAlojamientos")}
          onChange={(f, v) => setContacto("contactoAlojamientos", f, v)}
        />
        <ContactoFields
          legend="Juniors (opcional)"
          value={values.contactoJuniors}
          errors={ce("contactoJuniors")}
          onChange={(f, v) => setContacto("contactoJuniors", f, v)}
        />
      </Section>

      <Section title="Oferta">
        <Field
          label="Cursos disponibles"
          help="Separados por coma"
          className="col-span-2"
        >
          <Input
            value={values.cursosDisponibles}
            onChange={(e) => set("cursosDisponibles", e.target.value)}
            placeholder="General English, IELTS, Business English"
          />
        </Field>

        <div className="col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
            Tipos de alojamiento
          </span>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {TIPOS_ALOJAMIENTO.map((t) => (
              <Checkbox
                key={t}
                label={TIPO_ALOJAMIENTO_LABELS[t]}
                checked={values.tiposAlojamiento.includes(t)}
                onChange={(e) => toggleAlojamiento(t, e.target.checked)}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Documentos del programa">
        <p className="col-span-2 -mt-1 text-sm text-gray-600">
          Qué exige este colegio. Define los pasos del tablero del alumno al
          asignarlo a un viaje (los cambios aplican solo a asignaciones nuevas).
          “Opcional” activa el paso pero no cuenta para la completitud ni las alertas.
        </p>
        {DOCUMENTOS_PROGRAMA.map((doc) => (
          <Field key={doc} label={DOCUMENTO_LABELS[doc]}>
            <Select
              value={values.configDocumental[doc]}
              onChange={(e) => setRequisito(doc, e.target.value as RequisitoDocumento)}
            >
              {REQUISITOS_DOCUMENTO.map((r) => (
                <option key={r} value={r}>
                  {REQUISITO_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
        ))}
        <Field
          label="Documentación de entrada"
          help="Rige el paso C1 (ETA) del alumno. Se deriva del país; ajustable."
        >
          <Select
            value={values.tipoEntradaRequerida}
            onChange={(e) =>
              set("tipoEntradaRequerida", e.target.value as FormValues["tipoEntradaRequerida"])
            }
          >
            {TIPOS_ENTRADA.map((t) => (
              <option key={t} value={t}>
                {TIPO_ENTRADA_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Configuración">
        <Field
          label="Comisión de agencia (%)"
          help="Solo visible para el equipo JUK"
          error={fe("comisionAgenciaPorcentaje")}
        >
          <Input
            type="number"
            min={0}
            max={100}
            value={values.comisionAgenciaPorcentaje}
            invalid={!!fe("comisionAgenciaPorcentaje")}
            onChange={(e) => set("comisionAgenciaPorcentaje", e.target.value)}
          />
        </Field>

        <Field label="Sitio web" error={fe("sitioWeb")}>
          <Input
            type="url"
            value={values.sitioWeb}
            invalid={!!fe("sitioWeb")}
            onChange={(e) => set("sitioWeb", e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Field label="Notas" className="col-span-2">
          <Textarea
            value={values.notas}
            onChange={(e) => set("notas", e.target.value)}
            placeholder="Información interna sobre el colegio…"
          />
        </Field>
      </Section>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          {mode === "edit" && initial && (
            <Button
              type="button"
              variant="danger"
              disabled={isPending}
              onClick={() =>
                cambiarEstado(initial.estado === "activo" ? "inactivo" : "activo")
              }
            >
              {initial.estado === "activo" ? "Desactivar" : "Reactivar"}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={handleCancelar}
          >
            Cancelar
          </Button>
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

function ContactoFields({
  legend,
  required,
  value,
  errors,
  onChange,
}: {
  legend: string;
  required?: boolean;
  value: ContactoValues;
  errors?: { nombre?: string; email?: string; telefono?: string };
  onChange: (field: keyof ContactoValues, value: string) => void;
}) {
  return (
    <fieldset className="col-span-2 rounded-md border border-gray-200 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
        {legend}
        {required && <span className="ml-0.5 text-juk-coral-600">*</span>}
      </legend>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Nombre" error={errors?.nombre}>
          <Input
            invalid={!!errors?.nombre}
            value={value.nombre}
            onChange={(e) => onChange("nombre", e.target.value)}
          />
        </Field>
        <Field label="Email" error={errors?.email}>
          <Input
            type="email"
            invalid={!!errors?.email}
            value={value.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
        </Field>
        <Field label="Teléfono" error={errors?.telefono}>
          <Input
            invalid={!!errors?.telefono}
            value={value.telefono}
            onChange={(e) => onChange("telefono", e.target.value)}
          />
        </Field>
      </div>
    </fieldset>
  );
}
