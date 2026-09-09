import Link from "next/link";

import { Alert } from "@/components/ui";
import { sanitizeReturnTo } from "@/lib/auth/return-to";

import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

interface LoginPageProps {
  searchParams: Promise<{
    email?: string;
    returnTo?: string;
    error?: string;
    reset?: string;
    inactivo?: string;
    portal?: string;
  }>;
}

const COPY = {
  equipo: {
    titulo: "Ingresar al portal",
    bajada: "Ingresá con tu email y contraseña.",
  },
  familias: {
    titulo: "Ingresá al Portal de Familias",
    bajada: "Usá el email con el que te registramos y la contraseña que te enviamos.",
  },
} as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = sanitizeReturnTo(params.returnTo);
  const copy = params.portal === "familias" ? COPY.familias : COPY.equipo;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          {copy.titulo}
        </h1>
        <p className="mt-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          {copy.bajada}
        </p>
      </div>

      {params.reset === "success" && (
        <div className="mb-4">
          <Alert level="success" title="Contraseña actualizada">
            Ya podés ingresar con la nueva.
          </Alert>
        </div>
      )}

      {params.inactivo === "1" && (
        <div className="mb-4">
          <Alert level="critical" title="Cuenta desactivada">
            Tu acceso está dado de baja. Escribinos a Jóvenes en UK para que la reactivemos.
          </Alert>
        </div>
      )}

      <LoginForm defaultEmail={params.email ?? ""} returnTo={returnTo} />

      <p className="mt-6 text-center text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        ¿Olvidaste tu contraseña?{" "}
        <Link
          href="/reset-password"
          className="font-semibold text-[var(--c-brand)] hover:underline"
        >
          Restablecerla
        </Link>
      </p>
    </div>
  );
}
