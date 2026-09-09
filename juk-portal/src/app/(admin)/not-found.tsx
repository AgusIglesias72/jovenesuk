import { LinkButton } from "@/components/ui";

/*
 * 404 del back-office: lo dispara `notFound()` de cualquier page del grupo
 * (alumno/viaje/colegio inexistente). Se renderiza dentro del AdminShell, así
 * que el 404 público ("se fue de excursión", con links a /salidas) no aplica
 * acá.
 */

export const metadata = { title: "No encontrado" };

export default function AdminNotFound() {
  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p
        className="font-display text-[64px] font-extrabold leading-none tracking-[var(--ls-tight)] text-[var(--c-brand-300)]"
        aria-hidden
      >
        404
      </p>
      <h1 className="mt-2 max-w-xl font-display text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        No encontramos eso
      </h1>
      <p className="mt-3 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        El registro no existe o se dio de baja. Revisá el link o buscalo desde el listado.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <LinkButton href="/dashboard">Ir al dashboard</LinkButton>
        <LinkButton href="/alumnos" variant="secondary">
          Ver alumnos
        </LinkButton>
      </div>
    </section>
  );
}
