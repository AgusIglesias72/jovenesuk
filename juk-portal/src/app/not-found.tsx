import { LinkButton } from "@/components/ui";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <p className="font-display text-7xl font-semibold text-juk-navy-950 leading-none">404</p>
      <h1 className="mt-4 text-lg font-semibold text-juk-navy-900">
        Esta página no existe
      </h1>
      <p className="mt-1 max-w-sm text-sm text-gray-600">
        Puede que la sección todavía no esté disponible o que el enlace sea viejo.
      </p>
      <div className="mt-6">
        <LinkButton href="/dashboard">Volver al dashboard</LinkButton>
      </div>
    </div>
  );
}
