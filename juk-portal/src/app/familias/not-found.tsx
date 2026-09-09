import { LinkButton } from "@/components/ui";

/*
 * 404 del Portal de Familias: lo dispara `notFound()` de `[dni]/_data.ts`
 * cuando el DNI de la URL no es de un alumno de esa familia. El 404 público
 * (con links a /salidas) no sirve para alguien que ya está adentro.
 */

export const metadata = { title: "No encontrado" };

export default function FamiliasNotFound() {
  return (
    <section className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <p
        className="font-display text-[64px] font-extrabold leading-none tracking-[var(--ls-tight)] text-[var(--c-brand-300)]"
        aria-hidden
      >
        404
      </p>
      <h1 className="mt-2 font-display text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        No encontramos eso
      </h1>
      <p className="mt-3 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Puede que el link esté mal o que esa página no sea de tu familia.
      </p>
      <div className="mt-8">
        <LinkButton href="/familias">Volver al inicio</LinkButton>
      </div>
    </section>
  );
}
