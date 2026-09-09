"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { sanitizeReturnTo } from "@/lib/auth/return-to";

/**
 * LoginForm — flujo email/contraseña con Better-Auth.
 *
 * En caso de credenciales incorrectas mostramos un mensaje genérico (nunca
 * revela qué campo falló, PRD §1.2 US-01); el 403 de cuenta desactivada sí se
 * distingue, porque reintentar credenciales no lo va a resolver.
 */

interface LoginFormProps {
  defaultEmail?: string;
  returnTo: string;
}

type ErrorLogin = { titulo: string; detalle: string };

const CREDENCIALES_INVALIDAS: ErrorLogin = {
  titulo: "No se pudo ingresar",
  detalle: "Las credenciales no son válidas. Verificá email y contraseña.",
};

const CUENTA_DESACTIVADA: ErrorLogin = {
  titulo: "Cuenta desactivada",
  detalle: "Tu acceso está dado de baja. Escribinos a Jóvenes en UK para que la reactivemos.",
};

export function LoginForm({ defaultEmail = "", returnTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ErrorLogin | null>(null);
  const [isPending, startTransition] = useTransition();

  // Defensa en profundidad: el prop ya viene saneado del server component.
  const destino = sanitizeReturnTo(returnTo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { error: authError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: destino,
      });

      if (authError) {
        setError(authError.status === 403 ? CUENTA_DESACTIVADA : CREDENCIALES_INVALIDAS);
        return;
      }

      router.push(destino);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-4">
          <Alert level="critical" title={error.titulo}>
            {error.detalle}
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
            placeholder="tu@email.com"
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

        <Button type="submit" size="lg" disabled={isPending} className="mt-2 w-full">
          {isPending ? "Ingresando…" : "Ingresar"}
        </Button>
      </div>
    </form>
  );
}
