import Link from "next/link";

import { DESIGN_VARIANTS } from "./variants";

const ANCLAS = ["Dashboard", "ABM (lista + formulario)", "Detalle de viaje", "Login / onboarding"];

export default function DesignIndexPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Design Lab</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Tres direcciones visuales para el JUK Portal, cada una manejada por su propio archivo de
        tokens. Entrá a cada una, comparalas sobre las mismas 4 pantallas ancla, y elegí la base.
      </p>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Pantallas ancla en cada variante
      </p>
      <ul className="mt-1 flex flex-wrap gap-2 text-sm text-gray-600">
        {ANCLAS.map((a) => (
          <li key={a} className="rounded-full border border-gray-200 px-3 py-1">
            {a}
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {DESIGN_VARIANTS.map((v) => (
          <Link
            key={v.slug}
            href={`/design/${v.slug}`}
            className="group rounded-xl border border-gray-200 p-5 transition-colors hover:border-gray-400"
          >
            <span className="text-lg font-semibold text-gray-900">{v.name}</span>
            <span className="mt-1 block text-sm text-gray-600">{v.desc}</span>
            <span className="mt-4 inline-block text-sm font-medium text-gray-400 group-hover:text-gray-700">
              Ver variante →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
