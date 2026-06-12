import type { ReactNode } from "react";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";

import {
  Badge,
  Button,
  Card,
  Checkbox,
  FieldNote,
  Input,
  Label,
  Select,
  SectionTitle,
  Textarea,
} from "./primitives";
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
 * Pieces compartidas
 * ════════════════════════════════════════════════════════════════ */

function ScreenHeading({
  n,
  title,
  sub,
}: {
  n: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-6 flex items-end gap-4">
      <span className="font-[family-name:var(--font-mono)] text-[var(--t-small)] font-bold text-[var(--c-brand-300)]">
        {n}
      </span>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[var(--t-h1)] font-bold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          {title}
        </h2>
        <p className="mt-1 text-[var(--t-small)] text-[var(--c-ink-muted)]">{sub}</p>
      </div>
    </div>
  );
}

function Screen({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

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
              className="grid h-9 w-9 place-items-center rounded-[var(--r-md)] text-[var(--c-ink-onaccent)] shadow-[var(--shadow-accent)]"
              style={{ backgroundImage: "var(--grad-warm)" }}
            >
              <span className="font-[family-name:var(--font-display)] text-lg font-extrabold">J</span>
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-[var(--t-h3)] font-bold text-[var(--c-ink)]">
                Dirección Studio
              </p>
              <p className="text-[var(--t-small)] text-[var(--c-ink-muted)]">
                Cálido · redondeado · touch-first
              </p>
            </div>
          </div>
          <p className="font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-ink-subtle)]">
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
            <p className="mb-2 text-[var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              Paleta
            </p>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((s) => (
                <div
                  key={s.label}
                  className="flex h-14 w-[88px] flex-col justify-end rounded-[var(--r-md)] border border-[var(--c-border)] p-2 shadow-[var(--shadow-soft)]"
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
            <p className="mb-2 text-[var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              Tipografía
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-none tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Bricolage
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-[var(--t-body)] text-[var(--c-ink-muted)]">
              Plus Jakarta Sans — cuerpo cálido y redondo.
            </p>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-[var(--t-mono)] text-[var(--c-ink-subtle)]">
              Space Mono · UK-2026-JUL-LONDON
            </p>
          </div>

          {/* Radios + sombra */}
          <div>
            <p className="mb-2 text-[var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
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
              <span className="rounded-[var(--r-md)] bg-[var(--c-surface)] px-3 py-2 text-[var(--t-small)] shadow-[var(--shadow-1)]">
                shadow-1
              </span>
              <span className="rounded-[var(--r-md)] bg-[var(--c-surface)] px-3 py-2 text-[var(--t-small)] shadow-[var(--shadow-2)]">
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
  { id: "login", label: "Login" },
];

function SubNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[color-mix(in_srgb,var(--c-page)_85%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-10">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="whitespace-nowrap rounded-[var(--r-pill)] px-4 py-2 text-[var(--t-small)] font-semibold text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-surface)] hover:text-[var(--c-brand)]"
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
      <p className="text-[var(--t-small)] font-semibold text-[var(--c-ink-muted)]">{label}</p>
      <p
        className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-none tracking-[var(--ls-tight)]"
        style={{ color: accent }}
      >
        {value}
      </p>
    </Card>
  );
}

function TripCard({
  code,
  title,
  badge,
  dates,
  school,
  used,
  total,
}: {
  code: string;
  title: string;
  badge: ReactNode;
  dates: string;
  school: string;
  used: number;
  total: number;
}) {
  const pct = Math.round((used / total) * 100);
  return (
    <Card className="group flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-2)]">
      <div
        className="relative h-24"
        style={{ backgroundImage: "var(--grad-brand)" }}
      >
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.5),transparent_45%)]" />
        <span className="absolute left-4 top-4 font-[family-name:var(--font-mono)] text-[var(--t-small)] font-bold text-[var(--c-ink-onbrand)]">
          {code}
        </span>
        <span className="absolute right-4 top-4">{badge}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-[family-name:var(--font-display)] text-[var(--t-h3)] font-bold text-[var(--c-ink)]">
          {title}
        </h3>
        <p className="mt-1 text-[var(--t-small)] text-[var(--c-ink-muted)]">{school}</p>
        <p className="mt-3 inline-flex items-center gap-2 text-[var(--t-small)] text-[var(--c-ink-muted)]">
          <span aria-hidden>🗓️</span> {dates}
        </p>

        <div className="mt-4 pt-4 border-t border-[var(--c-border)]">
          <div className="flex items-center justify-between text-[var(--t-small)]">
            <span className="font-semibold text-[var(--c-ink)]">Cupo</span>
            <span className="font-[family-name:var(--font-mono)] text-[var(--c-ink-muted)]">
              {used}/{total}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-[var(--r-pill)] bg-[var(--c-surface-2)]">
            <div
              className="h-full rounded-[var(--r-pill)]"
              style={{ width: `${pct}%`, backgroundImage: "var(--grad-warm)" }}
            />
          </div>
        </div>
      </div>
    </Card>
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
          <p className="text-[var(--t-small)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-accent-600)]">
            Lunes 31 de mayo
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-[var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
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
            <p className="text-[var(--t-small)] text-[var(--c-ink-muted)]">
              Cuando un paso se trabe o un pasaporte esté por vencer, lo vas a ver acá.
            </p>
          </div>
        </Card>
      </div>

      {/* Viajes próximos */}
      <div className="mt-8">
        <div className="flex items-end justify-between">
          <SectionTitle kicker="Viajes próximos">En el horizonte</SectionTitle>
          <a
            href="#viaje"
            className="text-[var(--t-small)] font-semibold text-[var(--c-brand)] hover:underline"
          >
            Ver todos →
          </a>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <TripCard
            code="UK-2026-JUL-LONDON"
            title="Londres en Julio · Campus"
            badge={
              <Badge fg="var(--b-viaje-abierta)" bg="var(--c-surface)" dot>
                Inscripción abierta
              </Badge>
            }
            dates="04/07/2026 – 25/07/2026"
            school="London School of English"
            used={12}
            total={24}
          />
          <TripCard
            code="UK-2026-JUL-BRIGHTON"
            title="Brighton Costa · Campus"
            badge={
              <Badge fg="var(--b-viaje-confirmado)" bg="var(--c-surface)" dot>
                Confirmado
              </Badge>
            }
            dates="11/07/2026 – 01/08/2026"
            school="Brighton Language College"
            used={18}
            total={20}
          />
          <TripCard
            code="UK-2026-AGO-OXFORD"
            title="Oxford Académico · Homestay"
            badge={
              <Badge fg="var(--b-viaje-abierta)" bg="var(--c-surface)" dot>
                Inscripción abierta
              </Badge>
            }
            dates="08/08/2026 – 29/08/2026"
            school="Oxford International"
            used={5}
            total={16}
          />
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
  estado: { label: string; fg: string; bg: string };
};

const ESTADO = {
  activo: { label: "Activo", fg: "var(--c-success)", bg: "var(--c-success-bg)" },
  pendiente: { label: "Pendiente", fg: "var(--c-warning)", bg: "var(--c-warning-bg)" },
  inscripto: { label: "Inscripto", fg: "var(--c-info)", bg: "var(--c-info-bg)" },
  baja: { label: "Baja", fg: "var(--c-neutral)", bg: "var(--c-neutral-bg)" },
};

const ALUMNOS: AlumnoRow[] = [
  { apellido: "Álvarez", nombre: "Catalina", dni: "45.102.338", pasaporte: "AAR201144", vto: "12/09/2031", estado: ESTADO.activo },
  { apellido: "Benítez", nombre: "Tomás", dni: "44.788.901", pasaporte: "AAR198052", vto: "03/05/2027", estado: ESTADO.inscripto },
  { apellido: "Castro", nombre: "Malena", dni: "46.013.557", pasaporte: "—", vto: "—", estado: ESTADO.pendiente },
  { apellido: "Domínguez", nombre: "Ignacio", dni: "45.667.210", pasaporte: "AAR210995", vto: "28/11/2030", estado: ESTADO.activo },
  { apellido: "Fernández", nombre: "Lucía", dni: "44.231.880", pasaporte: "AAR175340", vto: "14/02/2026", estado: ESTADO.inscripto },
  { apellido: "Gómez", nombre: "Bautista", dni: "46.520.114", pasaporte: "—", vto: "—", estado: ESTADO.baja },
];

function AlumnosListCard() {
  return (
    <Card className="overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c-border)] p-5">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-[var(--t-h2)] font-bold text-[var(--c-ink)]">
            Alumnos
          </h3>
          <p className="text-[var(--t-small)] text-[var(--c-ink-muted)]">60 alumnos</p>
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
            className="min-h-[var(--tap)] w-full rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] pl-11 pr-4 text-[var(--t-body)] text-[var(--c-ink)] placeholder:text-[var(--c-ink-subtle)] focus:border-[var(--c-brand-300)] focus:shadow-[var(--ring-focus)] focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select options={["Todos los estados", "Activo", "Inscripto", "Pendiente", "Baja"]} />
        </div>
      </div>

      {/* tabla */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[var(--c-surface-2)] text-[var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
              <th className="px-5 py-3 font-bold">Alumno</th>
              <th className="px-5 py-3 font-bold">Pasaporte</th>
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
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-pill)] font-[family-name:var(--font-display)] text-[var(--t-small)] font-bold text-[var(--c-brand)]"
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
                      <p className="font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-ink-subtle)]">
                        DNI {a.dni}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 align-middle">
                  {a.pasaporte === "—" ? (
                    <span className="text-[var(--t-small)] text-[var(--c-ink-subtle)]">Sin cargar</span>
                  ) : (
                    <div>
                      <p className="font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-ink)]">
                        {a.pasaporte}
                      </p>
                      <p className="text-[var(--t-small)] text-[var(--c-ink-muted)]">vto {a.vto}</p>
                    </div>
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
        <h3 className="font-[family-name:var(--font-display)] text-[var(--t-h2)] font-bold text-[var(--c-ink)]">
          Nuevo alumno
        </h3>
        <p className="text-[var(--t-small)] text-[var(--c-ink-muted)]">
          Los campos con <span className="text-[var(--c-accent-600)]">*</span> son obligatorios.
        </p>
      </div>

      <div className="space-y-8 p-5 sm:p-6">
        {/* Datos personales */}
        <div>
          <SectionTitle kicker="Sección 1">Datos personales</SectionTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              <Select
                id="fiscal"
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
        sub="Lista filtrable y el formulario de alta — con todos los estados de los campos."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] xl:grid-cols-[0.9fr_1.1fr]">
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
          ? "border-[var(--c-brand-300)] bg-[var(--c-brand-50)] shadow-[var(--shadow-2)]"
          : "border-[var(--c-border)] bg-[var(--c-surface)] shadow-[var(--shadow-soft)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--font-mono)] text-[var(--t-small)] font-bold text-[var(--c-ink-subtle)]">
          {n}
        </span>
        <Badge fg={c.fg} bg={c.bg} dot>
          {PASO_LABEL[estado]}
        </Badge>
      </div>
      <p className="font-semibold text-[var(--c-ink)]">{label}</p>
      {aviso && (
        <p className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] bg-[var(--c-danger-bg)] px-2 py-1 text-[var(--t-small)] font-medium text-[var(--c-danger)]">
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
            <span className="font-[family-name:var(--font-mono)] text-[var(--t-small)] font-bold text-[var(--c-ink-onbrand-muted)]">
              UK-2026-JUL-LONDON
            </span>
            <h3 className="mt-1 font-[family-name:var(--font-display)] text-[var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)]">
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
            <p className="text-[var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              {d.k}
            </p>
            <div className="mt-2 text-[var(--t-body)] font-semibold text-[var(--c-ink)]">{d.v}</div>
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
              <Select options={["Buscar alumno para asignar…", "Álvarez, Catalina", "Benítez, Tomás", "Castro, Malena"]} />
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
            <p className="max-w-xs text-[var(--t-small)] text-[var(--c-ink-muted)]">
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
              <tr className="bg-[var(--c-surface-2)] text-[var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
                <th className="px-5 py-3 font-bold">Leader</th>
                <th className="px-5 py-3 font-bold">Police check</th>
                <th className="px-5 py-3 font-bold">Rol</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[var(--c-surface)]">
                <td className="px-5 py-3">
                  <p className="font-semibold text-[var(--c-ink)]">Paula Vidal</p>
                  <p className="text-[var(--t-small)] text-[var(--c-ink-muted)]">paula@jovenesuk.com</p>
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
                  <p className="text-[var(--t-small)] text-[var(--c-ink-muted)]">mariano@jovenesuk.com</p>
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
              <span className="font-[family-name:var(--font-mono)] text-[var(--t-small)] font-bold text-[var(--c-brand)]">
                01
              </span>
              <h4 className="font-[family-name:var(--font-display)] text-[var(--t-h3)] font-bold text-[var(--c-ink)]">
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
              <Select
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
 * 4 · LOGIN
 * ════════════════════════════════════════════════════════════════ */

function LoginScreen() {
  return (
    <Screen id="login">
      <ScreenHeading
        n="04"
        title="Login / onboarding"
        sub="La puerta de entrada: marca cálida a la izquierda, formulario directo a la derecha."
      />
      <Card className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-2">
          {/* panel de marca */}
          <div className="relative flex min-h-[440px] flex-col justify-between overflow-hidden p-8 text-[var(--c-ink-onbrand)]">
            <div className="absolute inset-0" style={{ backgroundImage: "var(--grad-brand)" }} />
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30 blur-2xl" style={{ backgroundImage: "var(--grad-warm)" }} />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[var(--c-brand-500)] opacity-30 blur-2xl" />

            <div className="relative flex items-center gap-3">
              <span
                className="grid h-12 w-12 place-items-center rounded-[var(--r-lg)] text-[var(--c-ink-onaccent)] shadow-[var(--shadow-accent)]"
                style={{ backgroundImage: "var(--grad-warm)" }}
              >
                <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold">J</span>
              </span>
              <div className="leading-tight">
                <p className="font-[family-name:var(--font-display)] font-bold">Jóvenes en UK</p>
                <p className="text-[var(--t-small)] text-[var(--c-ink-onbrand-muted)]">Portal Interno</p>
              </div>
            </div>

            <div className="relative">
              <p className="font-[family-name:var(--font-display)] text-[var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)]">
                Todo lo que hace que el viaje salga bien, en un solo lugar.
              </p>
              <p className="mt-4 max-w-sm text-[var(--c-ink-onbrand-muted)]">
                Alumnos, viajes, group leaders y el seguimiento de cada paso — del primer formulario al
                regreso a casa.
              </p>
            </div>

            <div className="relative flex gap-2">
              <span className="h-2 w-8 rounded-[var(--r-pill)] bg-[var(--c-accent)]" />
              <span className="h-2 w-2 rounded-[var(--r-pill)] bg-[var(--c-ink-onbrand-muted)]" />
              <span className="h-2 w-2 rounded-[var(--r-pill)] bg-[var(--c-ink-onbrand-muted)]" />
            </div>
          </div>

          {/* formulario */}
          <div className="flex items-center justify-center p-8 sm:p-12">
            <div className="w-full max-w-sm">
              <h3 className="font-[family-name:var(--font-display)] text-[var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
                Ingresar al portal
              </h3>
              <p className="mt-1 text-[var(--t-small)] text-[var(--c-ink-muted)]">
                Usá tu cuenta del equipo de Jóvenes en UK.
              </p>

              <form className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="login-email" required>
                    Email
                  </Label>
                  <Input id="login-email" type="email" placeholder="vos@jovenesuk.com" />
                </div>
                <div>
                  <Label htmlFor="login-pass" required>
                    Contraseña
                  </Label>
                  <Input id="login-pass" type="password" placeholder="••••••••" />
                </div>
                <Button type="submit" variant="primary" className="w-full">
                  Ingresar
                </Button>
              </form>

              <p className="mt-6 text-center text-[var(--t-small)] text-[var(--c-ink-muted)]">
                ¿Olvidaste tu contraseña?{" "}
                <a className="font-semibold text-[var(--c-brand)] hover:underline" href="#login">
                  Restablecerla
                </a>
              </p>
            </div>
          </div>
        </div>
      </Card>
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
      <LoginScreen />
      <footer className="border-t border-[var(--c-border)] px-6 py-8 text-center text-[var(--t-small)] text-[var(--c-ink-subtle)]">
        Dirección <span className="font-semibold text-[var(--c-ink-muted)]">Studio</span> · concept de
        handoff · restilá todo desde{" "}
        <span className="font-[family-name:var(--font-mono)]">tokens.css</span>
      </footer>
    </div>
  );
}
