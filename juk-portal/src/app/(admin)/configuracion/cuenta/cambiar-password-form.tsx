"use client";

import { useState, useTransition } from "react";

import { Alert, Button, Field, Input, useToast } from "@/components/ui";
import { authClient } from "@/lib/auth/client";

const MIN = 8;

export function CambiarPasswordForm() {
  const toast = useToast();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [isPending, startTransition] = useTransition();

  function limpiar() {
    setActual("");
    setNueva("");
    setRepetir("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setListo(false);

    if (nueva.length < MIN) {
      setError(`La contraseña nueva tiene que tener al menos ${MIN} caracteres.`);
      return;
    }
    if (nueva !== repetir) {
      setError("Las dos contraseñas nuevas no coinciden.");
      return;
    }
    if (nueva === actual) {
      setError("La contraseña nueva tiene que ser distinta de la actual.");
      return;
    }

    startTransition(async () => {
      const { error: authError } = await authClient.changePassword({
        currentPassword: actual,
        newPassword: nueva,
        revokeOtherSessions: true,
      });

      if (authError) {
        setError(
          "No pudimos cambiar la contraseña. Revisá que la actual sea correcta."
        );
        return;
      }

      limpiar();
      setListo(true);
      toast.success("Contraseña actualizada.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4" noValidate>
      {error && (
        <div className="mb-4">
          <Alert level="critical" title="No se pudo cambiar">
            {error}
          </Alert>
        </div>
      )}
      {listo && (
        <div className="mb-4">
          <Alert level="success" title="Listo, contraseña actualizada">
            Cerramos las sesiones abiertas en otros dispositivos. La próxima vez entrá
            con la contraseña nueva.
          </Alert>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Field label="Contraseña actual" required>
          <Input
            type="password"
            value={actual}
            autoComplete="current-password"
            onChange={(e) => setActual(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Contraseña nueva"
          required
          help={`Mínimo ${MIN} caracteres.`}
        >
          <Input
            type="password"
            value={nueva}
            autoComplete="new-password"
            onChange={(e) => setNueva(e.target.value)}
            required
          />
        </Field>
        <Field label="Repetí la contraseña nueva" required>
          <Input
            type="password"
            value={repetir}
            autoComplete="new-password"
            invalid={repetir.length > 0 && repetir !== nueva}
            onChange={(e) => setRepetir(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
