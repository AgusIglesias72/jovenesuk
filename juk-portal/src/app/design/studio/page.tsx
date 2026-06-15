import type { ReactNode } from "react";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import Image from "next/image";

import {
  AvatarGroup,
  Badge,
  Button,
  Card,
  Checkbox,
  FieldNote,
  Input,
  Label,
  Screen,
  ScreenHeading,
  SectionTitle,
  Textarea,
} from "../shared/primitives";
import { ComponentesScreen } from "../shared/gallery";
import { SelectMenu } from "../shared/interactive";
import { PagosScreen } from "../shared/pagos";
import { PantallasScreen } from "../shared/pantallas";
import { PantallasAdminScreen } from "../shared/pantallas-admin";
import { SeguimientoScreen } from "../shared/seguimiento";
import "../shared/animations.css";
import "./tokens.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata = { title: "Studio · Design Lab · JUK" };

/* ════════════════════════════════════════════════════════════════
 * Tira de TOKENS
 * ════════════════════════════════════════════════════════════════ */

const SWATCHES: { label: string; v: string; ink?: string }[] = [
  { label: "brand", v: "var(--c-brand)", ink: "var(--c-ink-onbrand)" },
  { label: "brand-500", v: "var(--c-brand-500)", ink: "var(--c-ink-onbrand)" },
  { label: "accent", v: "var(--c-accent)", ink: "var(--c-ink-onaccent)" },
  { label: "honey", v: "var(--c-honey)", ink: "var(--c-ink-onaccent)" },
  { label: "berry", v: "var(--c-berry)", ink: "var(--c-ink-onbrand)" },
  { label: "page", v: "var(--c-page)", ink: "var(--c-ink)" },
  { label: "surface-2", v: "var(--c-surface-2)", ink: "var(--c-ink)" },
  { label: "inverse", v: "var(--c-surface-inverse)", ink: "var(--c-ink-onbrand)" },
  { label: "ink", v: "var(--c-ink)", ink: "var(--c-ink-onbrand)" },
];

const RADII = [
  { label: "sm", v: "var(--r-sm)" },
  { label: "md", v: "var(--r-md)" },
  { label: "lg", v: "var(--r-lg)" },
  { label: "xl", v: "var(--r-xl)" },
];

function TokensStrip() {
  return (
    <div className="border-b border-[var(--c-border)] bg-[var(--c-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 place-items-center rounded-[var(--r-md)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)]"
              style={{ backgroundImage: "var(--grad-warm)" }}
            >
              <span className="font-[family-name:var(--font-display)] text-lg font-extrabold">J</span>
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
                Dirección Studio
              </p>
              <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                Cálido · redondeado · touch-first
              </p>
            </div>
          </div>
          <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Editá{" "}
            <span className="rounded-[var(--r-xs)] bg-[var(--c-surface-2)] px-1.5 py-0.5 text-[var(--c-brand)]">
              src/app/design/studio/tokens.css
            </span>{" "}
            para ajustar esta dirección.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* Paleta */}
          <div>
            <p className="mb-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              Paleta
            </p>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((s) => (
                <div
                  key={s.label}
                  className="flex h-14 w-[88px] flex-col justify-end rounded-[var(--r-md)] border border-[var(--c-border)] p-2 shadow-[shadow:var(--shadow-soft)]"
                  style={{ backgroundColor: s.v }}
                >
                  <span
                    className="font-[family-name:var(--font-mono)] text-[10px] font-bold"
                    style={{ color: s.ink }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tipografía */}
          <div>
            <p className="mb-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              Tipografía
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-none tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Bricolage
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-[length:var(--t-body)] text-[var(--c-ink-muted)]">
              Plus Jakarta Sans — cuerpo cálido y redondo.
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-[length:var(--t-mono)] text-[var(--c-ink-subtle)]">
              Space Mono · UK-2026-JUL-LONDON
            </p>
          </div>

          {/* Radios + sombra */}
          <div>
            <p className="mb-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              Radios & sombra
            </p>
            <div className="flex items-end gap-2">
              {RADII.map((r) => (
                <div key={r.label} className="text-center">
                  <div
                    className="h-12 w-12 border border-[var(--c-border-strong)] bg-[var(--c-surface-2)]"
                    style={{ borderRadius: r.v }}
                  />
                  <span className="mt-1 block font-[family-name:var(--font-mono)] text-[10px] text-[var(--c-ink-subtle)]">
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-[var(--r-md)] bg-[var(--c-surface)] px-3 py-2 text-[length:var(--t-small)] shadow-[shadow:var(--shadow-1)]">
                shadow-1
              </span>
              <span className="rounded-[var(--r-md)] bg-[var(--c-surface)] px-3 py-2 text-[length:var(--t-small)] shadow-[shadow:var(--shadow-2)]">
                shadow-2
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Sub-nav sticky
 * ════════════════════════════════════════════════════════════════ */

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "alumnos", label: "Alumnos (ABM)" },
  { id: "viaje", label: "Detalle de viaje" },
  { id: "seguimiento", label: "Seguimiento M6" },
  { id: "pagos", label: "Pagos" },
  { id: "pantallas", label: "Pantallas" },
  { id: "pantallas-admin", label: "Admin" },
  { id: "componentes", label: "Componentes" },
];

function SubNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[color-mix(in_srgb,var(--c-page)_85%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-10">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="whitespace-nowrap rounded-[var(--r-pill)] px-4 py-2 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-surface)] hover:text-[var(--c-brand)]"
          >
            {n.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 1 · DASHBOARD
 * ════════════════════════════════════════════════════════════════ */

const STATS = [
  { label: "Alumnos", value: "60", tone: "brand", icon: "👥" },
  { label: "Viajes confirmados", value: "3", tone: "success", icon: "✈️" },
  { label: "Viajando ahora", value: "0", tone: "neutral", icon: "🌍" },
  { label: "Inscripción abierta", value: "2", tone: "accent", icon: "📋" },
] as const;

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-[var(--r-md)] text-lg"
        style={{ backgroundColor: "var(--c-surface-2)" }}
        aria-hidden
      >
        {icon}
      </div>
      <p className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)]">{label}</p>
      <p
        className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-none tracking-[var(--ls-tight)]"
        style={{ color: accent }}
      >
        {value}
      </p>
    </Card>
  );
}

type Viaje = {
  code: string;
  title: string;
  school: string;
  dates: string;
  used: number;
  total: number;
  img: string;
  estado: { label: string; k: string };
};

const VIAJES: Viaje[] = [
  {
    code: "UK-2026-JUL-LONDON",
    title: "Londres en Julio · Campus",
    school: "London School of English",
    dates: "04/07/2026 – 25/07/2026",
    used: 12,
    total: 24,
    img: "/design/trips/london-bridge.jpg",
    estado: { label: "Inscripción abierta", k: "abierta" },
  },
  {
    code: "UK-2026-JUL-BRIGHTON",
    title: "Brighton Costa · Campus",
    school: "Brighton Language College",
    dates: "11/07/2026 – 01/08/2026",
    used: 18,
    total: 20,
    img: "/design/trips/brighton.jpg",
    estado: { label: "Confirmado", k: "confirmado" },
  },
  {
    code: "UK-2026-AGO-OXFORD",
    title: "Oxford Académico · Homestay",
    school: "Oxford International",
    dates: "08/08/2026 – 29/08/2026",
    used: 5,
    total: 16,
    img: "/design/trips/oxford.jpg",
    estado: { label: "Inscripción abierta", k: "abierta" },
  },
];

const VIAJES_POSTER: Viaje[] = [
  { ...VIAJES[0]!, img: "/design/trips/london-night.jpg" },
  {
    code: "UK-2027-ENE-EDINBURGH",
    title: "Edimburgo de Invierno · Homestay",
    school: "Edinburgh School of English",
    dates: "09/01/2027 – 30/01/2027",
    used: 0,
    total: 12,
    img: "/design/trips/edinburgh.jpg",
    estado: { label: "Inscripción abierta", k: "abierta" },
  },
  { ...VIAJES[1]! },
];

function estadoBadge(v: Viaje, onPhoto = false) {
  return (
    <Badge
      fg={`var(--b-viaje-${v.estado.k})`}
      bg={onPhoto ? "var(--c-surface)" : `var(--b-viaje-${v.estado.k}-bg)`}
      dot
    >
      {v.estado.label}
    </Badge>
  );
}

function CupoBar({ v, compact }: { v: Viaje; compact?: boolean }) {
  const pct = Math.round((v.used / v.total) * 100);
  return (
    <div className={compact ? "w-32" : ""}>
      {!compact && (
        <div className="flex items-center justify-between text-[length:var(--t-small)]">
          <span className="font-semibold text-[var(--c-ink)]">Cupo</span>
          <span className="font-[family-name:var(--font-mono)] text-[var(--c-ink-muted)]">
            {v.used}/{v.total}
          </span>
        </div>
      )}
      <div className={`${compact ? "" : "mt-2 "}h-2.5 w-full overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-surface-2)]`}>
        <div
          className="h-full rounded-[var(--r-pill)]"
          style={{ width: `${pct}%`, backgroundImage: "var(--grad-warm)" }}
        />
      </div>
    </div>
  );
}

/* V1 — Clásica: foto arriba, datos abajo */
function TripCard({ v }: { v: Viaje }) {
  return (
    <Card className="group flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-[shadow:var(--shadow-2)]">
      <div className="relative h-32 overflow-hidden">
        <Image
          src={v.img}
          alt={v.title}
          fill
          sizes="(max-width: 1024px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,63,58,0.7)] via-[rgba(23,63,58,0.15)] to-transparent" />
        <span className="absolute left-4 bottom-3 rounded-[var(--r-xs)] bg-[rgba(23,63,58,0.55)] px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] font-bold text-[var(--c-ink-onbrand)] backdrop-blur-sm">
          {v.code}
        </span>
        <span className="absolute right-3 top-3">{estadoBadge(v, true)}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
          {v.title}
        </h3>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{v.school}</p>
        <p className="mt-3 inline-flex items-center gap-2 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          <span aria-hidden>🗓️</span> {v.dates}
        </p>
        <div className="mt-4 border-t border-[var(--c-border)] pt-4">
          <CupoBar v={v} />
        </div>
      </div>
    </Card>
  );
}

/* V2 — Destacada: full-width, foto a la izquierda, operación a la derecha */
function TripCardDestacada({ v }: { v: Viaje }) {
  return (
    <Card className="group grid overflow-hidden transition-shadow hover:shadow-[shadow:var(--shadow-2)] md:grid-cols-[1.1fr_1.4fr]">
      <div className="relative min-h-[200px] overflow-hidden md:min-h-[260px]">
        <Image
          src={v.img}
          alt={v.title}
          fill
          sizes="(max-width: 768px) 100vw, 45vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(23,63,58,0.65)] via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 rounded-[var(--r-xs)] bg-[rgba(23,63,58,0.55)] px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] font-bold text-[var(--c-ink-onbrand)] backdrop-blur-sm">
          {v.code}
        </span>
      </div>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {estadoBadge(v)}
          <Badge tone="neutral">21 noches</Badge>
          <Badge tone="brand">Campus</Badge>
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            {v.title}
          </h3>
          <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            {v.school} · {v.dates}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CupoBar v={v} />
          <div>
            <p className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">Group Leaders</p>
            <div className="mt-1.5 flex items-center gap-2">
              <AvatarGroup names={["Paula Vidal", "Mariano Sosa"]} />
              <span className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">2 asignados</span>
            </div>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--c-border)] pt-4">
          <Button variant="primary" size="sm">
            Ver viaje
          </Button>
          <Button variant="outline" size="sm">
            Asignar alumnos
          </Button>
          <span className="ml-auto text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Sale en <span className="font-bold text-[var(--c-accent-600)]">23 días</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

/* V3 — Fila compacta: full-width, varias por lista */
function TripRows({ viajes }: { viajes: Viaje[] }) {
  return (
    <Card className="overflow-hidden">
      <ul>
        {viajes.map((v, i) => (
          <li
            key={v.code}
            className={`group flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--c-brand-50)] sm:px-5 ${i > 0 ? "border-t border-[var(--c-border)]" : ""}`}
          >
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-[var(--r-md)] sm:h-[72px] sm:w-28">
              <Image src={v.img} alt={v.title} fill sizes="120px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--c-ink)] transition-colors group-hover:text-[var(--c-brand)]">
                {v.title}
              </p>
              <p className="truncate font-[family-name:var(--font-mono)] text-[11px] font-bold text-[var(--c-ink-subtle)]">
                {v.code}
              </p>
              <p className="mt-0.5 truncate text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                🗓️ {v.dates}
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <CupoBar v={v} compact />
              <span className="w-12 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                {v.used}/{v.total}
              </span>
            </div>
            <span className="hidden sm:block">{estadoBadge(v)}</span>
            <span aria-hidden className="text-[var(--c-ink-subtle)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--c-brand)]">
              →
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* V4 — Póster: la foto ES la tarjeta */
function TripCardPoster({ v }: { v: Viaje }) {
  return (
    <Card className="group relative h-72 overflow-hidden border-0 transition-transform duration-200 hover:-translate-y-1 hover:shadow-[shadow:var(--shadow-3)]">
      <Image
        src={v.img}
        alt={v.title}
        fill
        sizes="(max-width: 1024px) 100vw, 33vw"
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(18,42,38,0.88)] via-[rgba(18,42,38,0.25)] to-[rgba(18,42,38,0.05)]" />
      <span className="absolute right-3 top-3 rounded-[var(--r-pill)] border border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.18)] px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md">
        {v.estado.label}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-5 text-[var(--c-ink-onbrand)]">
        <p className="font-[family-name:var(--font-mono)] text-[11px] font-bold text-[var(--c-ink-onbrand-muted)]">
          {v.code}
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)]">
          {v.title}
        </h3>
        <div className="mt-2 flex items-center justify-between text-[length:var(--t-small)]">
          <span className="text-[var(--c-ink-onbrand-muted)]">{v.dates}</span>
          <span className="rounded-[var(--r-pill)] bg-[rgba(255,255,255,0.18)] px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] font-bold backdrop-blur-md">
            {v.used}/{v.total}
          </span>
        </div>
      </div>
    </Card>
  );
}

function VarianteTag({ v, nombre }: { v: string; nombre: string }) {
  return (
    <p className="mb-3 mt-8 flex items-center gap-2.5 text-[length:var(--t-small)]">
      <span className="rounded-[var(--r-xs)] bg-[var(--c-surface-inverse)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] font-bold text-[var(--c-ink-onbrand)]">
        {v}
      </span>
      <span className="font-semibold text-[var(--c-ink-muted)]">{nombre}</span>
    </p>
  );
}

function DashboardScreen() {
  return (
    <Screen id="dashboard">
      <ScreenHeading
        n="01"
        title="Dashboard"
        sub="Lo primero que ve el equipo al entrar: estado vivo de la operación."
      />

      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[length:var(--t-small)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-accent-600)]">
            Lunes 31 de mayo
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Buen día, Agustín.
          </h3>
        </div>
        <Button variant="accent">+ Nuevo viaje</Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            accent={
              s.tone === "brand"
                ? "var(--c-brand)"
                : s.tone === "success"
                  ? "var(--c-success)"
                  : s.tone === "accent"
                    ? "var(--c-accent-600)"
                    : "var(--c-ink-subtle)"
            }
          />
        ))}
      </div>

      {/* Alertas críticas */}
      <div className="mt-8">
        <SectionTitle kicker="Alertas críticas">Todo en orden</SectionTitle>
        <Card className="mt-3 flex items-center gap-4 border-[var(--c-border-brand)] bg-[var(--c-brand-50)] p-5">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--r-md)] text-xl"
            style={{ backgroundColor: "var(--c-brand-100)" }}
            aria-hidden
          >
            ✓
          </span>
          <div>
            <p className="font-semibold text-[var(--c-ink)]">Sin alertas por ahora</p>
            <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              Cuando un paso se trabe o un pasaporte esté por vencer, lo vas a ver acá.
            </p>
          </div>
        </Card>
      </div>

      {/* Viajes próximos — 4 variantes de tarjeta para comparar */}
      <div className="mt-8">
        <div className="flex items-end justify-between">
          <SectionTitle kicker="Viajes próximos">En el horizonte</SectionTitle>
          <a
            href="#viaje"
            className="text-[length:var(--t-small)] font-semibold text-[var(--c-brand)] hover:underline"
          >
            Ver todos →
          </a>
        </div>

        <VarianteTag v="V1" nombre="Clásica — foto arriba, grilla de 3" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VIAJES.map((v) => (
            <TripCard key={v.code} v={v} />
          ))}
        </div>

        <VarianteTag v="V2" nombre="Destacada — full-width, para el viaje que sale primero" />
        {VIAJES[0] && <TripCardDestacada v={{ ...VIAJES[0], img: "/design/trips/london-westminster.jpg" }} />}

        <VarianteTag v="V3" nombre="Fila compacta — full-width, lista densa para muchos viajes" />
        <TripRows viajes={VIAJES} />

        <VarianteTag v="V4" nombre="Póster — la foto es la tarjeta, para portadas y destacados" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VIAJES_POSTER.map((v) => (
            <TripCardPoster key={v.code + v.img} v={v} />
          ))}
        </div>
      </div>
    </Screen>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 2 · ABM ALUMNOS
 * ════════════════════════════════════════════════════════════════ */

type AlumnoRow = {
  apellido: string;
  nombre: string;
  dni: string;
  pasaporte: string;
  vto: string;
  viaje: string | null;
  estado: { label: string; fg: string; bg: string };
};

const ESTADO = {
  activo: { label: "Activo", fg: "var(--c-success)", bg: "var(--c-success-bg)" },
  pendiente: { label: "Pendiente", fg: "var(--c-warning)", bg: "var(--c-warning-bg)" },
  inscripto: { label: "Inscripto", fg: "var(--c-info)", bg: "var(--c-info-bg)" },
  baja: { label: "Baja", fg: "var(--c-neutral)", bg: "var(--c-neutral-bg)" },
};

const ALUMNOS: AlumnoRow[] = [
  { apellido: "Álvarez", nombre: "Catalina", dni: "45.102.338", pasaporte: "AAR201144", vto: "12/09/2031", viaje: "UK-2026-JUL-LONDON", estado: ESTADO.activo },
  { apellido: "Benítez", nombre: "Tomás", dni: "44.788.901", pasaporte: "AAR198052", vto: "03/05/2027", viaje: "UK-2026-JUL-LONDON", estado: ESTADO.inscripto },
  { apellido: "Castro", nombre: "Malena", dni: "46.013.557", pasaporte: "—", vto: "—", viaje: null, estado: ESTADO.pendiente },
  { apellido: "Domínguez", nombre: "Ignacio", dni: "45.667.210", pasaporte: "AAR210995", vto: "28/11/2030", viaje: "UK-2026-JUL-BRIGHTON", estado: ESTADO.activo },
  { apellido: "Fernández", nombre: "Lucía", dni: "44.231.880", pasaporte: "AAR175340", vto: "14/02/2026", viaje: "UK-2026-AGO-OXFORD", estado: ESTADO.inscripto },
  { apellido: "Gómez", nombre: "Bautista", dni: "46.520.114", pasaporte: "—", vto: "—", viaje: null, estado: ESTADO.baja },
];

function AlumnosListCard() {
  return (
    <Card className="overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c-border)] p-5">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
            Alumnos
          </h3>
          <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">60 alumnos</p>
        </div>
        <Button variant="accent" size="sm">
          + Nuevo alumno
        </Button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface-3)] p-4">
        <div className="relative min-w-[220px] flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--c-ink-subtle)]" aria-hidden>
            🔍
          </span>
          <input
            placeholder="Buscar por nombre, DNI o pasaporte…"
            className="min-h-[var(--tap)] w-full rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] pl-11 pr-4 text-[length:var(--t-body)] text-[var(--c-ink)] placeholder:text-[var(--c-ink-subtle)] focus:border-[var(--c-brand-300)] focus:shadow-[shadow:var(--ring-focus)] focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-56">
          <SelectMenu
            defaultValue="Todos los estados"
            options={["Todos los estados", "Activo", "Inscripto", "Pendiente", "Baja"]}
          />
        </div>
      </div>

      {/* tabla */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[var(--c-surface-2)] text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
              <th className="px-5 py-3 font-bold">Alumno</th>
              <th className="px-5 py-3 font-bold">Pasaporte</th>
              <th className="hidden px-5 py-3 font-bold md:table-cell">Viaje</th>
              <th className="px-5 py-3 font-bold">Estado</th>
              <th className="px-5 py-3 text-right font-bold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {ALUMNOS.map((a, i) => (
              <tr
                key={a.dni}
                className={i % 2 ? "bg-[var(--c-surface-3)]" : "bg-[var(--c-surface)]"}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-pill)] font-[family-name:var(--font-display)] text-[length:var(--t-small)] font-bold text-[var(--c-brand)]"
                      style={{ backgroundColor: "var(--c-brand-100)" }}
                      aria-hidden
                    >
                      {a.nombre[0]}
                      {a.apellido[0]}
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--c-ink)]">
                        {a.apellido}, {a.nombre}
                      </p>
                      <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                        DNI {a.dni}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 align-middle">
                  {a.pasaporte === "—" ? (
                    <span className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">Sin cargar</span>
                  ) : (
                    <div>
                      <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink)]">
                        {a.pasaporte}
                      </p>
                      <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">vto {a.vto}</p>
                    </div>
                  )}
                </td>
                <td className="hidden px-5 py-3 align-middle md:table-cell">
                  {a.viaje ? (
                    <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-brand)]">
                      {a.viaje}
                    </span>
                  ) : (
                    <span className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">Sin asignar</span>
                  )}
                </td>
                <td className="px-5 py-3 align-middle">
                  <Badge fg={a.estado.fg} bg={a.estado.bg} dot>
                    {a.estado.label}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right align-middle">
                  <Button variant="ghost" size="sm">
                    Ver
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AlumnoForm() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--c-border)] bg-[var(--c-surface-3)] p-5">
        <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
          Nuevo alumno
        </h3>
        <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Los campos con <span className="text-[var(--c-accent-600)]">*</span> son obligatorios.
        </p>
      </div>

      <div className="space-y-8 p-5 sm:p-6">
        {/* Datos personales */}
        <div>
          <SectionTitle kicker="Sección 1">Datos personales</SectionTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="nombre" required>
                Nombre
              </Label>
              <Input id="nombre" defaultValue="Catalina" />
            </div>
            <div>
              <Label htmlFor="apellido" required>
                Apellido
              </Label>
              <Input id="apellido" placeholder="Apellido del alumno" />
              <FieldNote>Tal cual figura en el documento.</FieldNote>
            </div>
            <div>
              <Label htmlFor="nac" required>
                Fecha de nacimiento
              </Label>
              <Input id="nac" placeholder="DD/MM/AAAA" />
            </div>
            <div>
              <Label htmlFor="dni" required>
                DNI
              </Label>
              <Input id="dni" defaultValue="45.102.33" invalid />
              <FieldNote error>El DNI debe tener entre 7 y 8 dígitos.</FieldNote>
            </div>
            <div>
              <Label htmlFor="pasaporte" required>
                N° de pasaporte
              </Label>
              <Input id="pasaporte" placeholder="AAR000000" />
            </div>
            <div>
              <Label htmlFor="pasvto" required>
                Vencimiento del pasaporte
              </Label>
              <Input id="pasvto" placeholder="DD/MM/AAAA" />
              <FieldNote>Tiene que estar vigente hasta el fin del viaje.</FieldNote>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <SectionTitle kicker="Sección 2">Contacto</SectionTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email del alumno</Label>
              <Input id="email" type="email" placeholder="alumno@ejemplo.com" />
            </div>
            <div>
              <Label htmlFor="cel">Celular</Label>
              <Input id="cel" placeholder="+54 9 11 …" />
            </div>
          </div>
        </div>

        {/* Tutor 1 */}
        <div>
          <SectionTitle kicker="Sección 3">Tutor 1</SectionTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="tnombre" required>
                Nombre
              </Label>
              <Input id="tnombre" placeholder="Nombre del tutor" />
            </div>
            <div>
              <Label htmlFor="tcel" required>
                Celular
              </Label>
              <Input id="tcel" placeholder="+54 9 11 …" />
            </div>
            <div>
              <Label htmlFor="temail" required>
                Email
              </Label>
              <Input id="temail" type="email" placeholder="tutor@ejemplo.com" />
            </div>
          </div>
        </div>

        {/* Facturación */}
        <div>
          <SectionTitle kicker="Sección 4">Facturación</SectionTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fiscal">Condición fiscal</Label>
              <SelectMenu
                id="fiscal"
                defaultValue="Consumidor final"
                options={["Consumidor final", "Responsable inscripto", "Monotributo", "Exento"]}
              />
            </div>
            <div>
              <Label htmlFor="cuit">CUIT / CUIL</Label>
              <Input id="cuit" defaultValue="No editable en este perfil" disabled />
              <FieldNote>Se completa desde Facturación. Campo deshabilitado.</FieldNote>
            </div>
          </div>
        </div>

        {/* Preferencias */}
        <div>
          <SectionTitle kicker="Sección 5">Preferencias</SectionTitle>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="prefs">Notas y preferencias</Label>
              <Textarea
                id="prefs"
                rows={3}
                placeholder="Restricciones alimentarias, alergias, compañeros de cuarto, etc."
              />
            </div>
            <div className="space-y-1">
              <Checkbox id="ck1" label="Autoriza salidas grupales sin tutor" defaultChecked />
              <Checkbox id="ck2" label="Recibe comunicaciones por email" defaultChecked />
              <Checkbox id="ck3" label="Requiere asistencia médica especial" />
              <Checkbox id="ck4" label="Beca aplicada (bloqueado)" disabled />
            </div>
          </div>
        </div>

        {/* acciones */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--c-border)] pt-6">
          <Button variant="ghost">Cancelar</Button>
          <Button variant="outline">Guardar borrador</Button>
          <Button variant="primary">Crear alumno</Button>
        </div>
      </div>
    </Card>
  );
}

function AlumnosScreen() {
  return (
    <Screen id="alumnos">
      <ScreenHeading
        n="02"
        title="Alumnos · ABM"
        sub="Lista filtrable a pantalla completa, y abajo el formulario de alta con todos los estados de los campos."
      />
      <div className="space-y-6">
        <AlumnosListCard />
        <AlumnoForm />
      </div>
    </Screen>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 3 · DETALLE DE VIAJE
 * ════════════════════════════════════════════════════════════════ */

const DATOS_VIAJE: { k: string; v: ReactNode }[] = [
  {
    k: "Estado",
    v: (
      <Badge fg="var(--b-viaje-abierta)" bg="var(--b-viaje-abierta-bg)" dot>
        Inscripción abierta
      </Badge>
    ),
  },
  { k: "Fechas", v: "04/07/2026 – 25/07/2026" },
  { k: "Destino", v: "London School of English · Reino Unido" },
  { k: "Curso", v: "General English" },
  { k: "Origen", v: "Representante independiente" },
  { k: "Group Leaders", v: "2" },
  { k: "Cupo", v: "0/24" },
  { k: "Cupo mínimo", v: "5" },
];

const PASOS_M7 = [
  { n: "01", label: "Pasajes", estado: "en_progreso", aviso: null },
  { n: "02", label: "Excursiones", estado: "pendiente", aviso: null },
  { n: "03", label: "Transfers", estado: "bloqueado", aviso: "Requiere Pasajes" },
  { n: "04", label: "Tarjetas de transporte", estado: "pendiente", aviso: null },
  { n: "05", label: "Police Checks", estado: "na", aviso: null },
] as const;

const PASO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
  na: "N/A",
};

function pasoColors(estado: string) {
  return {
    fg: `var(--b-paso-${estado})`,
    bg: `var(--b-paso-${estado}-bg)`,
  };
}

function StepCard({
  n,
  label,
  estado,
  aviso,
  active,
}: {
  n: string;
  label: string;
  estado: string;
  aviso: string | null;
  active?: boolean;
}) {
  const c = pasoColors(estado);
  return (
    <div
      className={[
        "flex min-w-[180px] flex-1 flex-col gap-3 rounded-[var(--r-lg)] border p-4 transition-shadow",
        active
          ? "border-[var(--c-brand-300)] bg-[var(--c-brand-50)] shadow-[shadow:var(--shadow-2)]"
          : "border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-soft)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink-subtle)]">
          {n}
        </span>
        <Badge fg={c.fg} bg={c.bg} dot>
          {PASO_LABEL[estado]}
        </Badge>
      </div>
      <p className="font-semibold text-[var(--c-ink)]">{label}</p>
      {aviso && (
        <p className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] bg-[var(--c-danger-bg)] px-2 py-1 text-[length:var(--t-small)] font-medium text-[var(--c-danger)]">
          <span aria-hidden>🔒</span> {aviso}
        </p>
      )}
    </div>
  );
}

function ViajeScreen() {
  return (
    <Screen id="viaje">
      <ScreenHeading
        n="03"
        title="Detalle de viaje"
        sub="Toda la operación de un viaje en una pantalla: datos, asignaciones, leaders y seguimiento M7."
      />

      {/* header del viaje */}
      <Card
        className="relative mb-6 overflow-hidden border-0 p-6 text-[var(--c-ink-onbrand)]"
        as="section"
      >
        <div className="absolute inset-0" style={{ backgroundImage: "var(--grad-brand)" }} />
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.6),transparent_40%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink-onbrand-muted)]">
              UK-2026-JUL-LONDON
            </span>
            <h3 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)]">
              Londres en Julio · Campus
            </h3>
          </div>
          <Button variant="accent">Editar viaje</Button>
        </div>
      </Card>

      {/* grilla de datos */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {DATOS_VIAJE.map((d) => (
          <Card key={d.k} className="p-4">
            <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              {d.k}
            </p>
            <div className="mt-2 text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">{d.v}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alumnos asignados */}
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--c-border)] p-5">
            <SectionTitle kicker="Asignaciones">Alumnos asignados</SectionTitle>
          </div>
          <div className="flex flex-wrap gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface-3)] p-4">
            <div className="min-w-[200px] flex-1">
              <SelectMenu
                placeholder="Buscar alumno para asignar…"
                options={["Álvarez, Catalina", "Benítez, Tomás", "Castro, Malena"]}
              />
            </div>
            <Button variant="primary" size="sm">
              Asignar
            </Button>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span
              className="grid h-14 w-14 place-items-center rounded-[var(--r-lg)] text-2xl"
              style={{ backgroundColor: "var(--c-surface-2)" }}
              aria-hidden
            >
              🎒
            </span>
            <p className="font-semibold text-[var(--c-ink)]">Todavía no hay alumnos asignados</p>
            <p className="max-w-xs text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              Buscá un alumno arriba y asignalo. El cupo se actualiza solo.
            </p>
          </div>
        </Card>

        {/* Group Leaders */}
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--c-border)] p-5">
            <SectionTitle kicker="Equipo">Group Leaders del viaje</SectionTitle>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--c-surface-2)] text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
                <th className="px-5 py-3 font-bold">Leader</th>
                <th className="px-5 py-3 font-bold">Police check</th>
                <th className="px-5 py-3 font-bold">Rol</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[var(--c-surface)]">
                <td className="px-5 py-3">
                  <p className="font-semibold text-[var(--c-ink)]">Paula Vidal</p>
                  <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">paula@jovenesuk.com</p>
                </td>
                <td className="px-5 py-3">
                  <Badge fg="var(--b-police-aprobado)" bg="var(--b-police-aprobado-bg)" dot>
                    Aprobado
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone="accent">Principal</Badge>
                </td>
              </tr>
              <tr className="bg-[var(--c-surface-3)]">
                <td className="px-5 py-3">
                  <p className="font-semibold text-[var(--c-ink)]">Mariano Sosa</p>
                  <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">mariano@jovenesuk.com</p>
                </td>
                <td className="px-5 py-3">
                  <Badge fg="var(--b-police-en_tramite)" bg="var(--b-police-en_tramite-bg)" dot>
                    En trámite
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone="neutral">Acompañante</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      {/* Seguimiento M7 */}
      <div className="mt-8">
        <SectionTitle kicker="Seguimiento del viaje · M7">5 pasos hasta el despegue</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          {PASOS_M7.map((p) => (
            <StepCard
              key={p.n}
              n={p.n}
              label={p.label}
              estado={p.estado}
              aviso={p.aviso}
              active={p.n === "01"}
            />
          ))}
        </div>

        {/* editor del paso seleccionado */}
        <Card className="mt-5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c-border)] bg-[var(--c-brand-50)] p-5">
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-brand)]">
                01
              </span>
              <h4 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
                Pasajes
              </h4>
            </div>
            <Badge fg="var(--b-paso-en_progreso)" bg="var(--b-paso-en_progreso-bg)" dot>
              En progreso
            </Badge>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="substate">Sub-estado</Label>
              <SelectMenu
                id="substate"
                options={["Cotizando", "Reservado", "Emitido", "Confirmado"]}
                defaultValue="Reservado"
              />
            </div>
            <div>
              <Label htmlFor="aero">Aerolínea</Label>
              <Input id="aero" defaultValue="British Airways" />
            </div>
            <div>
              <Label htmlFor="vuelo">N° de vuelo</Label>
              <Input id="vuelo" placeholder="BA 0246" />
            </div>
            <div>
              <Label htmlFor="eticket">E-ticket URL</Label>
              <Input id="eticket" type="url" placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="fida">Fecha de ida</Label>
              <Input id="fida" placeholder="04/07/2026" />
            </div>
            <div>
              <Label htmlFor="fvuelta">Fecha de vuelta</Label>
              <Input id="fvuelta" placeholder="25/07/2026" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" rows={3} placeholder="Escalas, equipaje, observaciones del operador…" />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button variant="primary">Guardar datos</Button>
            </div>
          </div>
        </Card>
      </div>
    </Screen>
  );
}

/* ════════════════════════════════════════════════════════════════
 * PAGE
 * ════════════════════════════════════════════════════════════════ */

export default function StudioPage() {
  return (
    <div
      className={`v-studio ${display.variable} ${body.variable} ${mono.variable} min-h-screen font-[family-name:var(--font-body)] text-[var(--c-ink)]`}
      style={{
        backgroundColor: "var(--c-page)",
        backgroundImage: "var(--grad-page)",
      }}
    >
      <TokensStrip />
      <SubNav />
      <DashboardScreen />
      <AlumnosScreen />
      <ViajeScreen />
      <SeguimientoScreen />
      <PagosScreen />
      <PantallasScreen />
      <PantallasAdminScreen />
      <ComponentesScreen />
      <footer className="border-t border-[var(--c-border)] px-6 py-8 text-center text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
        Dirección <span className="font-semibold text-[var(--c-ink-muted)]">Studio</span> · concept de
        handoff · restilá todo desde{" "}
        <span className="font-[family-name:var(--font-mono)]">tokens.css</span>
      </footer>
    </div>
  );
}
