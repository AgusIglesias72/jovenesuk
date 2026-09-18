"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { Alert, Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { sanitizeReturnTo } from "@/lib/auth/return-to";

/**
 * LoginForm — flujo email/contraseña con Better-Auth, más el botón de Google.
 *
 * En caso de credenciales incorrectas mostramos un mensaje genérico (nunca
 * revela qué campo falló, PRD §1.2 US-01); el 403 de cuenta desactivada sí se
 * distingue, porque reintentar credenciales no lo va a resolver.
 *
 * El botón de Google solo aparece si el provider está configurado
 * (`googleHabilitado`), y entra únicamente a una cuenta que ya existe: lo que
 * pasa con un email desconocido lo cuenta el `?error=` que renderiza page.tsx.
 */

type LoginFormProps = {
  defaultEmail?: string;
  returnTo: string;
  googleHabilitado?: boolean;
  /** A dónde vuelve el browser después del callback de Google. */
  callbackGoogle?: string;
};

type ErrorLogin = { titulo: string; detalle: string };

const CREDENCIALES_INVALIDAS: ErrorLogin = {
  titulo: "No se pudo ingresar",
  detalle: "Las credenciales no son válidas. Verificá email y contraseña.",
};

const CUENTA_DESACTIVADA: ErrorLogin = {
  titulo: "Cuenta desactivada",
  detalle: "Tu acceso está dado de baja. Escribinos a Jóvenes en UK para que la reactivemos.",
};

const GOOGLE_FALLO: ErrorLogin = {
  titulo: "No se pudo abrir Google",
  detalle: "Probá de nuevo, o entrá con tu email y contraseña.",
};

export function LoginForm({
  defaultEmail = "",
  returnTo,
  googleHabilitado = false,
  callbackGoogle = "/login",
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ErrorLogin | null>(null);
  const [isPending, startTransition] = useTransition();
  // No sirve useTransition: cuando sale bien, el redirect a Google lo hace el
  // cliente de Better-Auth (window.location), no una transición de React.
  const [googlePending, setGooglePending] = useState(false);

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

  const ingresarConGoogle = async () => {
    setError(null);
    setGooglePending(true);

    // `errorCallbackURL` es obligatorio: sin él, un error del callback termina
    // en la página de error de Better-Auth y el login nunca se entera.
    const { error: authError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: callbackGoogle,
      errorCallbackURL: "/login",
    });

    if (authError) {
      setError(GOOGLE_FALLO);
      setGooglePending(false);
    }
  };

  const ocupado = isPending || googlePending;

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
            disabled={ocupado}
          />
        </Field>

        <Field label="Contraseña" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={ocupado}
            autoFocus={!!defaultEmail}
          />
        </Field>

        <Button type="submit" size="lg" disabled={ocupado} className="mt-2 w-full">
          {isPending ? "Ingresando…" : "Ingresar"}
        </Button>
      </div>

      {googleHabilitado && (
        <>
          <div className="my-5 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-[var(--c-border)]" />
            <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">o</span>
            <span className="h-px flex-1 bg-[var(--c-border)]" />
          </div>

          {/* `secondary`: el primario de la pantalla ya es "Ingresar".
              `size="lg"` deja los 44px de --tap en cualquier pantalla. */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            leadingIcon={<GoogleIcon />}
            onClick={ingresarConGoogle}
            disabled={ocupado}
          >
            {googlePending ? "Abriendo Google…" : "Continuar con Google"}
          </Button>
        </>
      )}
    </form>
  );
}
