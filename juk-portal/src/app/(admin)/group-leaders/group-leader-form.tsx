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
  useConfirm,
  useToast,
} from "@/components/ui";
import { AvisoErrores, useErroresDeFormulario } from "@/components/ui/form-errors";
import {
  POLICE_CHECK_ESTADO_LABELS,
  POLICE_CHECK_ESTADOS,
} from "@/lib/domain/group-leaders";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { toDateInput } from "@/lib/utils/date";
import type { GroupLeader } from "@/lib/db/schema/grupos-leaders";

import {
  createGroupLeaderAction,
  updateGroupLeaderAction,
} from "./actions";

type FormValues = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  policeCheckEstado: (typeof POLICE_CHECK_ESTADOS)[number];
  policeCheckFechaEmision: string;
  policeCheckFechaVencimiento: string;
};

function initialValues(initial?: GroupLeader): FormValues {
  return {
    nombre: initial?.nombre ?? "",
    apellido: initial?.apellido ?? "",
    email: initial?.email ?? "",
    telefono: initial?.telefono ?? "",
    documento: initial?.documento ?? "",
    policeCheckEstado: initial?.policeCheckEstado ?? "pendiente",
    policeCheckFechaEmision: initial?.policeCheckFechaEmision
      ? toDateInput(initial.policeCheckFechaEmision)
      : "",
    policeCheckFechaVencimiento: initial?.policeCheckFechaVencimiento
      ? toDateInput(initial.policeCheckFechaVencimiento)
      : "",
  };
}

export function GroupLeaderForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: GroupLeader;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [values, setValues] = useState<FormValues>(() => initialValues(initial));
  const { formRef, fe, reportar, limpiar, aviso } = useErroresDeFormulario();
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  useUnsavedChanges(dirty);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setDirty(true);
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    limpiar();

    const payload = {
      ...(mode === "edit" && initial ? { id: initial.id } : {}),
      ...values,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createGroupLeaderAction(payload)
          : await updateGroupLeaderAction(payload);
      if (result.ok) {
        setDirty(false);
        toast.success(mode === "create" ? "Group leader creado." : "Cambios guardados.");
        router.push("/group-leaders");
        router.refresh();
      } else {
        toast.error(result.error);
        reportar(result.fieldErrors);
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
    router.push("/group-leaders");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl">
      <AvisoErrores>{aviso}</AvisoErrores>

      <section className="mb-8">
        <SectionTitle className="mb-3">Datos</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre" required error={fe("nombre")}>
            <Input
              value={values.nombre}
              invalid={!!fe("nombre")}
              // Solo en el alta: en un form vacío el primer campo es donde el
              // usuario va a escribir (en edición sería un salto molesto).
              autoFocus={mode === "create"}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </Field>
          <Field label="Apellido" required error={fe("apellido")}>
            <Input value={values.apellido} invalid={!!fe("apellido")} onChange={(e) => set("apellido", e.target.value)} />
          </Field>
          <Field label="Email" required error={fe("email")}>
            <Input type="email" value={values.email} invalid={!!fe("email")} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Teléfono" error={fe("telefono")}>
            <Input value={values.telefono} onChange={(e) => set("telefono", e.target.value)} />
          </Field>
          <Field label="Documento (DNI/pasaporte)" error={fe("documento")}>
            <Input value={values.documento} onChange={(e) => set("documento", e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="mb-8">
        <SectionTitle className="mb-3">Police check</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Estado" required>
            <Select
              value={values.policeCheckEstado}
              onChange={(e) => set("policeCheckEstado", e.target.value as FormValues["policeCheckEstado"])}
            >
              {POLICE_CHECK_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {POLICE_CHECK_ESTADO_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="hidden sm:block" />
          <Field label="Fecha de emisión" error={fe("policeCheckFechaEmision")}>
            <DateInput value={values.policeCheckFechaEmision} onChange={(e) => set("policeCheckFechaEmision", e.target.value)} />
          </Field>
          <Field label="Fecha de vencimiento" error={fe("policeCheckFechaVencimiento")}>
            <DateInput value={values.policeCheckFechaVencimiento} onChange={(e) => set("policeCheckFechaVencimiento", e.target.value)} />
          </Field>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={handleCancelar}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
