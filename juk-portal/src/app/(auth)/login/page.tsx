import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

interface LoginPageProps {
  searchParams: Promise<{
    email?: string;
    returnTo?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  // "/" es la landing pública, no una pantalla del portal: post-login va al dashboard.
  // Solo aceptamos paths internos (evita open redirects con URLs absolutas).
  const returnTo =
    params.returnTo && params.returnTo.startsWith("/") && !params.returnTo.startsWith("//") && params.returnTo !== "/"
      ? params.returnTo
      : "/dashboard";

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          Ingresar al portal
        </h1>
        <p className="mt-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          Usá tu cuenta del equipo de Jóvenes en UK.
        </p>
      </div>

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
