import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Restablecer contraseña" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          {token ? "Crear nueva contraseña" : "Recuperar contraseña"}
        </h1>
        <p className="mt-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          {token
            ? "Elegí una contraseña nueva. Mínimo 8 caracteres."
            : "Decinos tu email del equipo y te mandamos un link para crear una nueva."}
        </p>
      </div>

      <ResetPasswordForm token={token ?? null} />

      <p className="mt-6 text-center text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        <Link
          href="/login"
          className="font-semibold text-[var(--c-brand)] hover:underline"
        >
          ← Volver al login
        </Link>
      </p>
    </div>
  );
}
