import { requireFamilia } from "@/lib/auth/helpers";

export const metadata = { title: "Mi viaje · JUK" };

export default async function FamiliasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFamilia();

  return (
    <div className="min-h-screen bg-[var(--c-page)] text-[var(--c-ink)]">
      {children}
    </div>
  );
}
