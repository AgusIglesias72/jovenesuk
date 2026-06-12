import { Badge, Button, Card, Eyebrow, Mono } from "../ui";
import { IconArrowRight, IconCalendar, IconInfo, IconPin, IconUsers } from "../icons";

const STATS = [
  { label: "Alumnos", value: "60", delta: "+4 este mes", tone: "neutral" as const, icon: IconUsers },
  { label: "Viajes confirmados", value: "3", delta: "de 5 totales", tone: "success" as const, icon: IconPin },
  { label: "Viajando ahora", value: "0", delta: "sin viajes en curso", tone: "muted" as const, icon: null },
  { label: "Inscripción abierta", value: "2", delta: "36 cupos libres", tone: "brand" as const, icon: null },
];

const TRIPS = [
  {
    code: "UK-2026-JUL-LONDON",
    title: "Londres en Julio · Campus",
    school: "London School of English",
    from: "04/07/2026",
    to: "25/07/2026",
    cupo: 12,
    max: 24,
    badge: "inscripcion_abierta",
    badgeLabel: "Inscripción abierta",
  },
  {
    code: "UK-2026-JUL-OXFORD",
    title: "Oxford Inmersión · Homestay",
    school: "Oxford International College",
    from: "11/07/2026",
    to: "01/08/2026",
    cupo: 8,
    max: 20,
    badge: "inscripcion_abierta",
    badgeLabel: "Inscripción abierta",
  },
  {
    code: "UK-2026-AGO-BRIGHTON",
    title: "Brighton Costa · Campus",
    school: "BSC Brighton",
    from: "08/08/2026",
    to: "29/08/2026",
    cupo: 18,
    max: 18,
    badge: "confirmado",
    badgeLabel: "Confirmado",
  },
];

function StatCard({ label, value, delta, tone, icon: Icon }: (typeof STATS)[number]) {
  const accent =
    tone === "brand"
      ? "var(--c-brand)"
      : tone === "success"
        ? "var(--c-success)"
        : tone === "muted"
          ? "var(--c-ink-4)"
          : "var(--c-ink-3)";
  return (
    <Card className="relative overflow-hidden p-[var(--s-4)]">
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between">
        <Eyebrow>{label}</Eyebrow>
        {Icon && <Icon className="size-[15px] text-[var(--c-ink-4)]" />}
      </div>
      <div className="mt-[var(--s-3)] flex items-baseline gap-[var(--s-2)]">
        <span className="font-[var(--font-display)] text-[length:var(--t-3xl)] font-[number:var(--fw-semibold)] leading-none tracking-[var(--ls-tight)] tabular-nums text-[var(--c-ink)]">
          {value}
        </span>
      </div>
      <p className="mt-[var(--s-2)] text-[length:var(--t-xs)] text-[var(--c-ink-3)]">{delta}</p>
    </Card>
  );
}

function TripCard({ trip }: { trip: (typeof TRIPS)[number] }) {
  const pct = Math.round((trip.cupo / trip.max) * 100);
  const full = trip.cupo >= trip.max;
  return (
    <Card className="group flex flex-col p-[var(--s-4)] transition-shadow duration-200 hover:shadow-[var(--sh-md)]">
      <div className="flex items-start justify-between gap-[var(--s-3)]">
        <Mono className="text-[length:var(--t-xs)] font-[number:var(--fw-medium)] text-[var(--c-ink-3)]">
          {trip.code}
        </Mono>
        <Badge token={trip.badge}>{trip.badgeLabel}</Badge>
      </div>
      <h4 className="mt-[var(--s-3)] text-[length:var(--t-md)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        {trip.title}
      </h4>
      <div className="mt-[var(--s-2)] flex items-center gap-[var(--s-2)] text-[length:var(--t-sm)] text-[var(--c-ink-2)]">
        <IconCalendar className="size-[14px] text-[var(--c-ink-4)]" />
        <Mono>{trip.from}</Mono>
        <span className="text-[var(--c-ink-4)]">→</span>
        <Mono>{trip.to}</Mono>
      </div>
      <p className="mt-[var(--s-1)] text-[length:var(--t-sm)] text-[var(--c-ink-3)]">{trip.school}</p>

      <div className="mt-[var(--s-4)] border-t border-[var(--c-border)] pt-[var(--s-3)]">
        <div className="flex items-center justify-between text-[length:var(--t-xs)]">
          <span className="font-[number:var(--fw-medium)] uppercase tracking-[var(--ls-wide)] text-[var(--c-ink-3)]">
            Cupo
          </span>
          <Mono className="font-[number:var(--fw-semibold)] text-[var(--c-ink)]">
            {trip.cupo}/{trip.max}
          </Mono>
        </div>
        <div className="mt-[var(--s-2)] h-[6px] overflow-hidden rounded-[var(--r-full)] bg-[var(--c-surface-3)]">
          <span
            className="block h-full rounded-[var(--r-full)] transition-[width] duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: full ? "var(--c-success)" : "var(--c-brand)",
            }}
          />
        </div>
      </div>
    </Card>
  );
}

export function Dashboard() {
  return (
    <section id="dashboard" className="scroll-mt-[120px]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--s-4)]">
        <div>
          <Eyebrow>Panel · 31 mayo 2026</Eyebrow>
          <h2 className="mt-[var(--s-2)] font-[var(--font-display)] text-[length:var(--t-2xl)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Buen día, Agustín.
          </h2>
        </div>
        <Button variant="secondary" size="sm">
          <IconCalendar className="size-[14px]" />
          Ver calendario
        </Button>
      </div>

      <div className="mt-[var(--s-5)] grid grid-cols-2 gap-[var(--s-3)] lg:grid-cols-4">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Alertas críticas */}
      <div className="mt-[var(--s-6)]">
        <div className="flex items-center gap-[var(--s-2)]">
          <Eyebrow>Alertas críticas</Eyebrow>
          <span className="h-px flex-1 bg-[var(--c-border)]" />
        </div>
        <Card className="mt-[var(--s-3)] flex items-center gap-[var(--s-3)] border-[var(--c-info-soft)] bg-[var(--c-info-soft)] p-[var(--s-4)]">
          <IconInfo className="size-[18px] shrink-0 text-[var(--c-info)]" />
          <p className="text-[length:var(--t-base)] text-[var(--c-info-ink)]">
            <span className="font-[number:var(--fw-semibold)]">Sin alertas por ahora.</span>{" "}
            Todos los viajes y alumnos están al día.
          </p>
        </Card>
      </div>

      {/* Viajes próximos */}
      <div className="mt-[var(--s-6)]">
        <div className="flex items-center justify-between gap-[var(--s-4)]">
          <div className="flex flex-1 items-center gap-[var(--s-2)]">
            <Eyebrow>Viajes próximos</Eyebrow>
            <span className="h-px flex-1 bg-[var(--c-border)]" />
          </div>
          <button className="inline-flex items-center gap-[var(--s-1)] text-[length:var(--t-sm)] font-[number:var(--fw-medium)] text-[var(--c-brand)] hover:text-[var(--c-brand-hover)]">
            Ver todos
            <IconArrowRight className="size-[14px]" />
          </button>
        </div>
        <div className="mt-[var(--s-3)] grid gap-[var(--s-3)] md:grid-cols-2 xl:grid-cols-3">
          {TRIPS.map((t) => (
            <TripCard key={t.code} trip={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
