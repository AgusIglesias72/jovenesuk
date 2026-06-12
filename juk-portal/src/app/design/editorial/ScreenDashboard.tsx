import { badgeViaje, proximosViajes, stats } from "./data";
import { Button, Card, Eyebrow, GoldTick, Rule, StateBadge } from "./primitives";

function StatCard({ label, value, note, index }: { label: string; value: string; note: string; index: number }) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-[var(--sp-5)] shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]">
      <span className="pointer-events-none absolute right-3 top-2 font-[family-name:var(--font-mono)] text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
        0{index + 1}
      </span>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-6 flex items-end gap-3">
        <span className="font-[family-name:var(--font-display)] text-[3.25rem] font-light leading-none tracking-[var(--ls-tight)] text-[var(--c-brand)]">
          {value}
        </span>
        <span className="mb-1 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">{note}</span>
      </div>
      <i className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-[var(--c-gold)] transition-transform duration-300 group-hover:scale-x-100" />
    </div>
  );
}

export function ScreenDashboard() {
  return (
    <div className="mx-auto max-w-[68rem] px-[var(--sp-5)] py-[var(--sp-8)]">
      {/* Saludo */}
      <header className="mb-[var(--sp-7)]">
        <div className="mb-3 flex items-center gap-3">
          <GoldTick />
          <Eyebrow gold>Panel general · Temporada 2026</Eyebrow>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--t-display-1)] font-light leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          Buen día, <span className="italic text-[var(--c-brand)]">Agustín</span>.
        </h1>
        <p className="mt-3 max-w-xl text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          Un pantallazo de la operación de hoy. Todo lo que hace que el viaje salga bien, en un solo lugar.
        </p>
      </header>

      {/* Stats */}
      <div className="mb-[var(--sp-8)] grid grid-cols-2 gap-[var(--sp-4)] lg:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} index={i} {...s} />
        ))}
      </div>

      {/* Alertas críticas */}
      <section className="mb-[var(--sp-8)]">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-medium tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Alertas críticas
          </h2>
          <Rule className="flex-1" />
        </div>
        <div className="flex items-center gap-4 rounded-[var(--r-lg)] border border-[var(--c-info)]/25 bg-[var(--c-info-bg)] px-[var(--sp-5)] py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--c-surface)] text-[var(--c-info)] shadow-[var(--shadow-1)]">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="10" cy="10" r="7.25" />
              <path d="M10 9v4.5M10 6.4v.1" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="text-[length:var(--t-body)] font-medium text-[var(--c-ink)]">Sin alertas por ahora</p>
            <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              Cuando un paso se trabe o un pasaporte esté por vencer, lo vas a ver acá.
            </p>
          </div>
        </div>
      </section>

      {/* Viajes próximos */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-medium tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Viajes próximos
            </h2>
          </div>
          <Button variant="ghost" size="sm">
            Ver todos →
          </Button>
        </div>
        <div className="grid gap-[var(--sp-4)] md:grid-cols-2 lg:grid-cols-3">
          {proximosViajes.map((v) => {
            const b = badgeViaje[v.estado];
            const pct = Math.round((v.cupo / v.cupoMax) * 100);
            return (
              <Card key={v.codigo} flush className="flex flex-col overflow-hidden">
                <div className="border-b border-[var(--c-border)] bg-[var(--c-surface-2)] px-[var(--sp-5)] py-3">
                  <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-mono)] tracking-tight text-[var(--c-ink-muted)]">
                    {v.codigo}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-[var(--sp-5)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-medium leading-[var(--lh-snug)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
                      {v.nombre}
                    </h3>
                  </div>
                  <StateBadge fg={b.fg} bg={b.bg}>
                    {b.label}
                  </StateBadge>
                  <dl className="mt-5 space-y-2.5 text-[length:var(--t-small)]">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--c-ink-subtle)]">Fechas</dt>
                      <dd className="text-right font-[family-name:var(--font-mono)] text-[length:var(--t-mono)] text-[var(--c-ink)]">
                        {v.fechas}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--c-ink-subtle)]">Colegio</dt>
                      <dd className="text-right text-[var(--c-ink)]">{v.colegio}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto pt-5">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <Eyebrow>Cupo</Eyebrow>
                      <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink)]">
                        {v.cupo}/{v.cupoMax}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-surface-2)]">
                      <div className="h-full rounded-[var(--r-pill)] bg-[var(--c-gold)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
