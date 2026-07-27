"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  Button,
  DateInput,
  Field,
  Input,
  Select,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import { PAIS_LABELS, PAISES } from "@/lib/domain/colegios";
import { PROSPECTO_ESTADO_LABELS, PROSPECTO_ESTADOS } from "@/lib/domain/prospectos";
import type { Prospecto } from "@/lib/db/schema/prospectos";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

import {
  createProspectoAction,
  subirImagenAction,
  updateProspectoAction,
} from "./actions";

type Estado = (typeof PROSPECTO_ESTADOS)[number];
type Pais = (typeof PAISES)[number];

type FormValues = {
  nombre: string;
  estado: Estado;
  pais: "" | Pais;
  ciudad: string;
  fuente: string;
  contactoNombre: string;
  contactoCargo: string;
  sitioWeb: string;
  ubicacionUrl: string;
  proximaAccionAt: string;
  responsableId: string;
  notas: string;
  motivoPerdida: string;
  emails: string[];
  telefonos: string[];
};

function toISODate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function initialValues(initial?: Prospecto): FormValues {
  return {
    nombre: initial?.nombre ?? "",
    estado: initial?.estado ?? "nuevo",
    pais: initial?.pais ?? "",
    ciudad: initial?.ciudad ?? "",
    fuente: initial?.fuente ?? "",
    contactoNombre: initial?.contactoNombre ?? "",
    contactoCargo: initial?.contactoCargo ?? "",
    sitioWeb: initial?.sitioWeb ?? "",
    ubicacionUrl: initial?.ubicacionUrl ?? "",
    proximaAccionAt: toISODate(initial?.proximaAccionAt ?? null),
    responsableId: initial?.responsableId ?? "",
    notas: initial?.notas ?? "",
    motivoPerdida: initial?.motivoPerdida ?? "",
    emails: initial?.emails.length ? [...initial.emails] : [""],
    telefonos: initial?.telefonos.length ? [...initial.telefonos] : [""],
  };
}

export function ProspectoForm({
  mode,
  initial,
  usuarios,
}: {
  mode: "create" | "edit";
  initial?: Prospecto;
  usuarios: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [values, setValues] = useState<FormValues>(() => initialValues(initial));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [imagenUrl, setImagenUrl] = useState(initial?.imagenUrl ?? null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useUnsavedChanges(dirty);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setDirty(true);
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setLista(key: "emails" | "telefonos", index: number, value: string) {
    setDirty(true);
    setValues((v) => {
      const next = [...v[key]];
      next[index] = value;
      return { ...v, [key]: next };
    });
  }

  function agregarLista(key: "emails" | "telefonos") {
    setDirty(true);
    setValues((v) => ({ ...v, [key]: [...v[key], ""] }));
  }

  function quitarLista(key: "emails" | "telefonos", index: number) {
    setDirty(true);
    setValues((v) => ({ ...v, [key]: v[key].filter((_, i) => i !== index) }));
  }

  function buildPayload() {
    return {
      nombre: values.nombre,
      estado: values.estado,
      pais: values.pais === "" ? undefined : values.pais,
      ciudad: values.ciudad,
      fuente: values.fuente,
      contactoNombre: values.contactoNombre,
      contactoCargo: values.contactoCargo,
      sitioWeb: values.sitioWeb,
      ubicacionUrl: values.ubicacionUrl,
      proximaAccionAt: values.proximaAccionAt,
      responsableId: values.responsableId === "" ? undefined : values.responsableId,
      notas: values.notas,
      motivoPerdida: values.estado === "perdido" ? values.motivoPerdida : "",
      emails: values.emails.map((e) => e.trim()).filter(Boolean),
      telefonos: values.telefonos.map((t) => t.trim()).filter(Boolean),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const payload = buildPayload();

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProspectoAction(payload)
          : await updateProspectoAction(initial!.id, payload);
      if (result.ok) {
        setDirty(false);
        toast.success(mode === "create" ? "Prospecto creado." : "Prospecto actualizado.");
        router.push("/prospectos");
        router.refresh();
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function handleImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !initial) return;
    const formData = new FormData();
    formData.set("prospectoId", initial.id);
    formData.set("file", file);
    setSubiendoImagen(true);
    startTransition(async () => {
      const result = await subirImagenAction(formData);
      setSubiendoImagen(false);
      if (fileRef.current) fileRef.current.value = "";
      if (result.ok) {
        setImagenUrl(result.data.imagenUrl);
        toast.success("Imagen actualizada.");
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
    router.push("/prospectos");
  }

  const fe = (k: string) => fieldErrors[k]?.[0];

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <Section title="Datos generales">
        <Field label="Nombre" required error={fe("nombre")} className="sm:col-span-2">
          <Input
            value={values.nombre}
            invalid={!!fe("nombre")}
            onChange={(e) => set("nombre", e.target.value)}
            placeholder="Nombre del colegio o institución"
          />
        </Field>

        <Field label="Estado" error={fe("estado")}>
          <Select
            value={values.estado}
            onChange={(e) => set("estado", e.target.value as Estado)}
          >
            {PROSPECTO_ESTADOS.map((es) => (
              <option key={es} value={es}>
                {PROSPECTO_ESTADO_LABELS[es]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="País" error={fe("pais")}>
          <Select
            value={values.pais}
            onChange={(e) => set("pais", e.target.value as FormValues["pais"])}
          >
            <option value="">Sin especificar</option>
            {PAISES.map((p) => (
              <option key={p} value={p}>
                {PAIS_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ciudad" error={fe("ciudad")}>
          <Input
            value={values.ciudad}
            invalid={!!fe("ciudad")}
            onChange={(e) => set("ciudad", e.target.value)}
            placeholder="Londres"
          />
        </Field>

        <Field label="Fuente" help="Cómo llegó el prospecto" error={fe("fuente")}>
          <Input
            value={values.fuente}
            invalid={!!fe("fuente")}
            onChange={(e) => set("fuente", e.target.value)}
            placeholder="Referido, feria, web…"
          />
        </Field>
      </Section>

      <Section title="Contacto">
        <Field label="Nombre del contacto" error={fe("contactoNombre")}>
          <Input
            value={values.contactoNombre}
            invalid={!!fe("contactoNombre")}
            onChange={(e) => set("contactoNombre", e.target.value)}
          />
        </Field>

        <Field label="Cargo" error={fe("contactoCargo")}>
          <Input
            value={values.contactoCargo}
            invalid={!!fe("contactoCargo")}
            onChange={(e) => set("contactoCargo", e.target.value)}
            placeholder="Director de admisiones"
          />
        </Field>

        <ListaDinamica
          label="Emails"
          type="email"
          placeholder="contacto@colegio.com"
          valores={values.emails}
          errorAt={(i) => fe(`emails.${i}`)}
          onChange={(i, v) => setLista("emails", i, v)}
          onAgregar={() => agregarLista("emails")}
          onQuitar={(i) => quitarLista("emails", i)}
        />

        <ListaDinamica
          label="Teléfonos"
          type="tel"
          placeholder="+44 20 1234 5678"
          valores={values.telefonos}
          errorAt={(i) => fe(`telefonos.${i}`)}
          onChange={(i, v) => setLista("telefonos", i, v)}
          onAgregar={() => agregarLista("telefonos")}
          onQuitar={(i) => quitarLista("telefonos", i)}
        />
      </Section>

      <Section title="Enlaces y seguimiento">
        <Field label="Sitio web" error={fe("sitioWeb")}>
          <Input
            type="url"
            value={values.sitioWeb}
            invalid={!!fe("sitioWeb")}
            onChange={(e) => set("sitioWeb", e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Field label="Ubicación" help="link de Google Maps" error={fe("ubicacionUrl")}>
          <Input
            type="url"
            value={values.ubicacionUrl}
            invalid={!!fe("ubicacionUrl")}
            onChange={(e) => set("ubicacionUrl", e.target.value)}
            placeholder="https://maps.google.com/…"
          />
        </Field>

        <Field label="Próxima acción" help="Recordatorio de follow-up" error={fe("proximaAccionAt")}>
          <DateInput
            value={values.proximaAccionAt}
            invalid={!!fe("proximaAccionAt")}
            onChange={(e) => set("proximaAccionAt", e.target.value)}
          />
        </Field>

        <Field label="Responsable" error={fe("responsableId")}>
          <Select
            value={values.responsableId}
            onChange={(e) => set("responsableId", e.target.value)}
            searchable={usuarios.length > 8}
          >
            <option value="">Sin asignar</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Notas">
        <Field label="Notas" className="sm:col-span-2" error={fe("notas")}>
          <Textarea
            value={values.notas}
            onChange={(e) => set("notas", e.target.value)}
            placeholder="Información interna sobre el prospecto…"
          />
        </Field>

        {values.estado === "perdido" && (
          <Field
            label="Motivo de la pérdida"
            className="sm:col-span-2"
            error={fe("motivoPerdida")}
          >
            <Textarea
              value={values.motivoPerdida}
              onChange={(e) => set("motivoPerdida", e.target.value)}
              placeholder="Por qué no avanzó…"
            />
          </Field>
        )}
      </Section>

      {mode === "edit" && (
        <Section title="Imagen">
          <div className="sm:col-span-2">
            {imagenUrl && (
              <div className="mb-3 overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)]">
                <Image
                  src={imagenUrl}
                  alt={values.nombre || "Imagen del prospecto"}
                  width={640}
                  height={360}
                  className="h-48 w-full object-cover"
                  unoptimized
                />
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              disabled={subiendoImagen || isPending}
              onChange={handleImagen}
              className="block w-full text-[length:var(--t-small)] text-[var(--c-ink-muted)] file:mr-3 file:cursor-pointer file:rounded-[var(--r-sm)] file:border-0 file:bg-[var(--c-surface-2)] file:px-3 file:py-2 file:text-[var(--c-ink)] hover:file:bg-[var(--c-brand-50)]"
            />
            {subiendoImagen && (
              <p className="mt-2 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                Subiendo imagen…
              </p>
            )}
          </div>
        </Section>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ListaDinamica({
  label,
  type,
  placeholder,
  valores,
  errorAt,
  onChange,
  onAgregar,
  onQuitar,
}: {
  label: string;
  type: "email" | "tel";
  placeholder: string;
  valores: string[];
  errorAt: (index: number) => string | undefined;
  onChange: (index: number, value: string) => void;
  onAgregar: () => void;
  onQuitar: (index: number) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
        {label}
      </span>
      <div className="mt-2 flex flex-col gap-2">
        {valores.map((valor, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                type={type}
                value={valor}
                invalid={!!errorAt(i)}
                onChange={(e) => onChange(i, e.target.value)}
                placeholder={placeholder}
              />
              {errorAt(i) && (
                <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-danger)]">
                  {errorAt(i)}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={valores.length === 1}
              onClick={() => onQuitar(i)}
              aria-label={`Quitar ${label.toLowerCase()}`}
            >
              Quitar
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" className="mt-2" onClick={onAgregar}>
        + Agregar
      </Button>
    </div>
  );
}
