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
        <h1
          className="font-display font-semibold text-3xl text-juk-navy-950 leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {token ? "Definir nueva contraseña" : "Restablecer contraseña"}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {token
            ? "Elegí una contraseña nueva. Mínimo 8 caracteres."
            : "Te enviamos un link al email para restablecerla."}
        </p>
      </div>

      <ResetPasswordForm token={token ?? null} />

      <p className="mt-6 text-sm text-gray-600 text-center">
        <Link
          href="/login"
          className="text-juk-navy-700 font-medium hover:text-juk-navy-900"
        >
          ← Volver al login
        </Link>
      </p>
    </div>
  );
}
