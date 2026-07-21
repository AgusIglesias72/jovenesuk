"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, Field, Input, LinkButton, Select, useConfirm, useToast } from "@/components/ui";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { USUARIO_ROLE_LABELS, USUARIO_ROLES } from "@/lib/domain/usuarios";

import { createUsuarioAction } from "./actions";

type Created = { email: string; name: string; tempPassword: string };

export function UsuarioForm() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof USUARIO_ROLES)[number]>("admin_juk");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [created, setCreated] = useState<Created | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  useUnsavedChanges(dirty);

  const fe = (k: string) => fieldErrors[k]?.[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    startTransition(async () => {
      const result = await createUsuarioAction({ name, email, role });
      if (result.ok) {
        setDirty(false);
        setCreated(result.data);
        toast.success("Usuario creado.");
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
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
    router.push("/usuarios");
  }

  if (created) {
    return (
      <div className="max-w-xl">
        <div className="rounded-md border border-green-200 bg-green-50 px-5 py-4">
          <h2 className="text-sm font-semibold text-green-800">Usuario creado</h2>
          <p className="mt-1 text-sm text-green-700">
            Pasale estas credenciales a <strong>{created.name}</strong>. La contraseña
            temporal se muestra una sola vez — copiala ahora.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 font-medium text-gray-600">Email</dt>
              <dd className="font-mono text-juk-navy-950">{created.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 font-medium text-gray-600">Contraseña</dt>
              <dd className="font-mono font-semibold text-juk-navy-950">{created.tempPassword}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <LinkButton href="/usuarios">Volver a usuarios</LinkButton>
          <Button
            variant="secondary"
            onClick={() => {
              setCreated(null);
              setName("");
              setEmail("");
              setRole("admin_juk");
              setDirty(false);
            }}
          >
            Crear otro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre" required error={fe("name")} className="sm:col-span-2">
          <Input
            value={name}
            invalid={!!fe("name")}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Email" required error={fe("email")} className="sm:col-span-2">
          <Input
            type="email"
            value={email}
            invalid={!!fe("email")}
            onChange={(e) => {
              setEmail(e.target.value);
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Rol" required>
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as (typeof USUARIO_ROLES)[number]);
              setDirty(true);
            }}
          >
            {USUARIO_ROLES.map((r) => (
              <option key={r} value={r}>
                {USUARIO_ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Se genera una contraseña temporal que vas a ver al confirmar (el envío por
        email todavía no está configurado).
      </p>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={handleCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
