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

  return (
    <div>
      <div className="mb-8">
        <h1
          className="font-display font-semibold text-3xl text-juk-navy-950 leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Ingresar al portal
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Usá tu email del equipo JUK.
        </p>
      </div>

      <LoginForm
        defaultEmail={params.email ?? ""}
        returnTo={params.returnTo ?? "/dashboard"}
      />

      <p className="mt-6 text-sm text-gray-600 text-center">
        ¿Olvidaste tu contraseña?{" "}
        <Link
          href="/reset-password"
          className="text-juk-navy-700 font-medium hover:text-juk-navy-900"
        >
          Restablecerla
        </Link>
      </p>
    </div>
  );
}
