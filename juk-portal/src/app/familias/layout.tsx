import { requireFamilia } from "@/lib/auth/helpers";

import { LogoutButton } from "./logout-button";

export const metadata = { title: "Mi viaje · JUK" };

export default async function FamiliasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireFamilia();

  return (
    <div className="min-h-screen bg-[var(--c-page)] text-[var(--c-ink)]">
      <header className="sticky top-0 z-10 border-b border-[var(--c-border)] bg-[var(--c-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-[length:var(--t-body)] font-extrabold leading-none">
              Jóvenes en UK
            </p>
            <p className="mt-0.5 truncate text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              {session.user.name}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-screen-sm px-4 py-6">{children}</main>
    </div>
  );
}
