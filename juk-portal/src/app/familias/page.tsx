import Link from "next/link";
import { redirect } from "next/navigation";

import { requireFamilia } from "@/lib/auth/helpers";
import { getAlumnosDeFamilia } from "@/lib/db/queries/familias";

import { LogoutButton } from "./logout-button";

export default async function FamiliasHomePage() {
  const session = await requireFamilia();
  const alumnos = await getAlumnosDeFamilia(session.user.id);

  if (alumnos.length === 1) {
    redirect(`/familias/${alumnos[0]!.dni}`);
  }

  const primerNombre =
    session.user.name.trim().split(/\s+/)[0] ?? session.user.name;

  return (
    <div className="min-h-screen bg-[var(--c-page)] text-[var(--c-ink)]">
      <header className="sticky top-0 z-10 border-b border-[var(--c-border)] bg-[var(--c-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-md)] bg-[image:var(--grad-warm)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)]"
              aria-hidden
            >
              <span className="font-display text-base font-extrabold">J</span>
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[length:var(--t-body)] font-extrabold leading-none">
                Jóvenes en UK
              </p>
              <p className="mt-0.5 truncate text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                {session.user.name}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {alumnos.length === 0 ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 text-center shadow-[shadow:var(--shadow-1)]">
            <p className="text-[length:var(--t-body)] text-[var(--c-ink-muted)]">
              Todavía no hay alumnos asociados a tu cuenta. Escribinos si creés
              que es un error.
            </p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
