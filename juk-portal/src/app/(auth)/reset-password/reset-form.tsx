"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button, Field, Input, Alert } from "@/components/ui";

/**
 * Reset password form — operates in two modes:
 *
 *  1) Without token (`token === null`): requests the reset link via email
 *  2) With token: lets the user set a new password
 *
 * Generic success message to avoid email enumeration (we don't confirm
 * whether the email exists in the system).
 */

interface ResetPasswordFormProps {
  token: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  if (token) {
    return <SetNewPasswordForm token={token} />;
  }
  return <RequestResetForm />;
}

function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { error: authError } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (authError) {
        // Aún así mostramos éxito genérico para evitar enumeration
      }

      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <Alert level="success" title="Listo, revisá tu casilla">
        Si el email existe en el sistema, vas a recibir un link para restablecer tu contraseña.
        El link es válido por 24 horas.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-4">
          <Alert level="critical" title="Algo salió mal">
            {error}
          </Alert>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Field label="Email" required help="Te enviaremos un link de restablecimiento.">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="tu@jovenesenuk.com"
            required
            autoFocus
            disabled={isPending}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isPending} className="mt-2 w-full">
          {isPending ? "Enviando…" : "Mandarme el link"}
        </Button>
      </div>
    </form>
  );
}

function SetNewPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      const { error: authError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (authError) {
        setError(
          "No pudimos restablecer tu contraseña. El link puede haber expirado — pedí uno nuevo."
        );
        return;
      }

      router.push("/login?reset=success");
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-4">
          <Alert level="critical" title="No se pudo cambiar">
            {error}
          </Alert>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Field label="Contraseña nueva" required help="Mínimo 8 caracteres.">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            autoFocus
            disabled={isPending}
          />
        </Field>

        <Field label="Confirmar contraseña" required>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            disabled={isPending}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isPending} className="mt-2 w-full">
          {isPending ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </div>
    </form>
  );
}
