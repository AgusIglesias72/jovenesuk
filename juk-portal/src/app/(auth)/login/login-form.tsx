"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button, Field, Input, Alert } from "@/components/ui";

/**
 * LoginForm — client component handling the email/password login flow.
 *
 * Uses authClient.signIn (Better-Auth) directly. On success, redirects to
 * `returnTo` (defaults to /dashboard). On failure, shows a generic error
 * message — never leaks which field is wrong (PRD §1.2 US-01).
 */

interface LoginFormProps {
  defaultEmail?: string;
  returnTo: string;
}

export function LoginForm({ defaultEmail = "", returnTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { error: authError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: returnTo,
      });

      if (authError) {
        setError(
          "Las credenciales no son válidas. Verificá email y contraseña."
        );
        return;
      }

      router.push(returnTo);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-4">
          <Alert level="critical" title="No se pudo ingresar">
            {error}
          </Alert>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="tu@jovenesenuk.com"
            required
            autoFocus={!defaultEmail}
            disabled={isPending}
          />
        </Field>

        <Field label="Contraseña" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={isPending}
            autoFocus={!!defaultEmail}
          />
        </Field>

        <Button type="submit" size="lg" disabled={isPending} className="mt-2">
          {isPending ? "Ingresando…" : "Ingresar"}
        </Button>
      </div>
    </form>
  );
}
