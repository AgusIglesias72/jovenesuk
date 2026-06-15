import Link from "next/link";

import { requireFamilia } from "@/lib/auth/helpers";
import { getAlumnosDeFamilia } from "@/lib/db/queries/familias";

export default async function FamiliasHomePage() {
  const session = await requireFamilia();
  const alumnos = await getAlumnosDeFamilia(session.user.id);

  const primerNombre = session.user.name.trim().split(/\s+/)[0] ?? session.user.name;

  if (alumnos.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 text-center shadow-[shadow:var(--shadow-1)]">
        <p className="text-[length:var(--t-body)] text-[var(--c-ink-muted)]">
          Todavía no hay alumnos asociados a tu cuenta. Escribinos si creés que
          es un error.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold leading-tight">
        Hola, {primerNombre}
      </h1>
      <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        Elegí un alumno para ver cómo va su viaje.
      </p>

      <ul className="mt-6 space-y-3">
        {alumnos.map((alumno) => (
          <li key={alumno.id}>
            <Link
              href={`/familias/${alumno.dni}`}
              className="flex min-h-[var(--tap)] items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-4 shadow-[shadow:var(--shadow-1)] transition-colors hover:border-[var(--c-ink-subtle)]"
            >
              <span className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
                {alumno.nombre} {alumno.apellido}
              </span>
              <span aria-hidden className="text-[var(--c-ink-muted)]">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
