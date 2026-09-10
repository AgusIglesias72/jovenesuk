const STATS = [
  { valor: "+10", label: "años de trayectoria" },
  { valor: "+1.000", label: "estudiantes capacitados" },
  { valor: "4,9/5", label: "satisfacción post-viaje" },
  { valor: "8", label: "destinos en el mundo" },
] as const;

export function StatsBand() {
  return (
    <div className="relative z-10 mx-auto -mt-10 max-w-5xl px-4 sm:px-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-border)] shadow-[shadow:var(--shadow-2)] lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-[var(--c-surface)] px-6 py-6 text-center">
            <dd className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-brand)]">
              {s.valor}
            </dd>
            <dt className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
