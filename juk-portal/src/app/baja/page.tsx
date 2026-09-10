import type { Metadata } from "next";

import { darDeBajaPorToken } from "@/lib/db/queries/prospecto-tracking";

export const metadata: Metadata = {
  title: "Baja de comunicaciones · Jóvenes en UK",
  robots: { index: false, follow: false },
};

export default async function BajaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const prospecto = token ? await darDeBajaPorToken(token) : null;
  const dado = prospecto !== null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-8 text-center shadow-[shadow:var(--shadow-2)] sm:p-10">
        <p className="font-[family-name:var(--font-display)] text-[length:var(--t-small)] font-bold uppercase tracking-[0.14em] text-[var(--c-brand)]">
          Jóvenes en UK
        </p>

        <div
          className={`mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-[var(--r-pill)] text-2xl ${
            dado
              ? "bg-[var(--c-success-bg)] text-[var(--c-success)]"
              : "bg-[var(--c-danger-bg)] text-[var(--c-danger)]"
          }`}
          aria-hidden
        >
          {dado ? "✓" : "!"}
        </div>

        {dado ? (
          <>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Listo, te diste de baja
            </h1>
            <p className="mt-3 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              No vas a recibir más correos de <strong>Jóvenes en UK</strong>. Si fue un error o
              cambiás de idea, escribinos a{" "}
              <a
                href="mailto:info@jovenesenuk.com"
                className="font-semibold text-[var(--c-brand)] underline underline-offset-2"
              >
                info@jovenesenuk.com
              </a>{" "}
              y te volvemos a sumar.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              No pudimos procesar la baja
            </h1>
            <p className="mt-3 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              El enlace no es válido o ya expiró. Si querés dejar de recibir nuestros correos,
              escribinos a{" "}
              <a
                href="mailto:info@jovenesenuk.com"
                className="font-semibold text-[var(--c-brand)] underline underline-offset-2"
              >
                info@jovenesenuk.com
              </a>{" "}
              y lo resolvemos.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
