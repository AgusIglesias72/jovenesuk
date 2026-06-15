import Link from "next/link";

import { cargarAlumnoFamilia } from "./_data";
import { FamiliaNav } from "./familia-nav";

export default async function AlumnoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ dni: string }>;
}) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const base = `/familias/${dni}`;

  return (
    <div>
      <Link
        href="/familias"
        className="inline-flex min-h-[var(--tap)] items-center gap-1.5 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)] hover:text-[var(--c-ink)]"
      >
        <span aria-hidden>←</span> Mis alumnos
      </Link>

      <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-[var(--c-ink)]">
        {alumno.nombre} {alumno.apellido}
      </h1>

      <div className="mt-5 lg:grid lg:grid-cols-[208px_1fr] lg:gap-8">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <FamiliaNav base={base} />
        </aside>
        <div className="mt-5 lg:mt-0">{children}</div>
      </div>
    </div>
  );
}
