"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Alert,
  Button,
  Field,
  Input,
  LinkButton,
  Select,
  useConfirm,
  useToast,
} from "@/components/ui";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { USUARIO_ROLE_LABELS, USUARIO_ROLES } from "@/lib/domain/usuarios";

import { createUsuarioAction } from "./actions";

type Created = { email: string; name: string; emailEnviado: boolean };

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
        {created.emailEnviado ? (
          <Alert level="success" title={`${created.name} ya tiene cuenta`}>
            Le enviamos a{" "}
            <span className="font-mono text-[length:var(--t-mono)]">{created.email}</span> un
            link para crear su contraseña; vence en 24 h. Nadie más conoce esa clave.
          </Alert>
        ) : (
          <Alert level="warning" title={`${created.name} ya tiene cuenta, pero el email no salió`}>
            La cuenta de{" "}
            <span className="font-mono text-[length:var(--t-mono)]">{created.email}</span> quedó
            creada, pero no pudimos mandarle el link para crear la contraseña. Revisá la
            configuración de Resend y usá &ldquo;Reenviar acceso&rdquo; desde la lista de
            usuarios.
          </Alert>
        )}
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

      <p className="mt-3 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
        No se genera ninguna contraseña: le mandamos por email un link para que cree la
        suya (vence en 24 h).
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
