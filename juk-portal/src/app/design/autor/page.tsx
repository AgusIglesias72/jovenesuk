import type { ReactNode } from "react";
import { Fraunces, Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

import {
  Badge,
  Button,
  Card,
  Checkbox,
  FieldNote,
  Input,
  Label,
  RuledLabel,
  Select,
  SectionTitle,
  Textarea,
  numeral,
} from "./primitives";
import "./tokens.css";

/* Display serif con carácter "wonky" óptico — el alma de la dirección. */
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});
/* Serif editorial de apoyo para bajadas / cuerpo destacado. */
const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});
/* Workhorse humanista (no Inter): cuerpo, controles, UI. */
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
/* Mono ingenieril para códigos, DNIs, cifras de registro. */
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata = { title: "Autor · Design Lab · JUK" };

/* ════════════════════════════════════════════════════════════════
 * Pieces compartidas
 * ════════════════════════════════════════════════════════════════ */

function ScreenHeading({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="mb-8 border-b-2 border-[var(--c-rule)] pb-4">
      <div className="flex items-baseline gap-4">
        <span
          className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] font-semibold text-[var(--c-accent)] ${numeral}`}
        >
          §{n}
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[var(--t-h1)] font-semibold leading-[var(--lh-tight)] tracking-[var(--ls-display)] text-[var(--c-ink)]">
          {title}
        </h2>
      </div>
      <p className="mt-2 max-w-2xl font-[family-name:var(--font-serif)] text-[var(--t-body)] italic leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        {sub}
      </p>
    </div>
  );
}

function Screen({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

/* Sello/monograma de la marca — letterform, no emoji */
function Monogram({ size = "md", onInk = false }: { size?: "md" | "lg"; onInk?: boolean }) {
  const dim = size === "lg" ? "h-12 w-12 text-2xl" : "h-9 w-9 text-lg";
  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-[var(--r-sm)] border font-[family-name:var(--font-display)] font-semibold`}
      style={
        onInk
          ? { borderColor: "var(--c-ink-onink-muted)", color: "var(--c-ink-onink)" }
          : { borderColor: "var(--c-ink)", backgroundColor: "var(--c-accent)", color: "var(--c-ink-onaccent)" }
      }
    >
      J
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Tira de TOKENS
 * ════════════════════════════════════════════════════════════════ */

const SWATCHES: { label: string; v: string; ink: string }[] = [
  { label: "ink", v: "var(--c-ink)", ink: "var(--c-ink-onink)" },
  { label: "paper", v: "var(--c-paper)", ink: "var(--c-ink)" },
  { label: "surface", v: "var(--c-surface)", ink: "var(--c-ink)" },
  { label: "accent", v: "var(--c-accent)", ink: "var(--c-ink-onaccent)" },
  { label: "accent-700", v: "var(--c-accent-700)", ink: "var(--c-ink-onaccent)" },
  { label: "brand", v: "var(--c-brand)", ink: "var(--c-ink-onbrand)" },
  { label: "brand-500", v: "var(--c-brand-500)", ink: "var(--c-ink-onbrand)" },
  { label: "surface-2", v: "var(--c-surface-2)", ink: "var(--c-ink)" },
];

const RADII = [
  { label: "sm 2", v: "var(--r-sm)" },
  { label: "md 2", v: "var(--r-md)" },
  { label: "lg 3", v: "var(--r-lg)" },
  { label: "xl 4", v: "var(--r-xl)" },
];

function TokensStrip() {
  return (
    <div className="border-b-2 border-[var(--c-rule)] bg-[var(--c-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
        {/* Cabecera tipo membrete */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--c-border-strong)] pb-5">
          <div className="flex items-center gap-3">
            <Monogram />
            <div>
              <p className="font-[family-name:var(--font-display)] text-[var(--t-h3)] font-semibold tracking-[var(--ls-display)] text-[var(--c-ink)]">
                Dirección Autor
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[var(--t-micro)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                Cuaderno de campo · papel + tinta · sello
              </p>
            </div>
          </div>
          <p className="max-w-xs font-[family-name:var(--font-mono)] text-[var(--t-micro)] leading-relaxed text-[var(--c-ink-subtle)]">
            Editá{" "}
            <span className="bg-[var(--c-surface-2)] px-1 py-0.5 text-[var(--c-accent)]">
              src/app/design/autor/tokens.css
            </span>{" "}
            para ajustar esta dirección.
          </p>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr_0.9fr]">
          {/* Paleta */}
          <div>
            <RuledLabel>Paleta · 1 acento</RuledLabel>
            <div className="mt-3 flex flex-wrap gap-0 border border-[var(--c-border-strong)]">
              {SWATCHES.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex h-16 w-[84px] flex-col justify-end p-1.5 ${i ? "border-l border-[var(--c-border-strong)]" : ""}`}
                  style={{ backgroundColor: s.v }}
                >
                  <span
                    className="font-[family-name:var(--font-mono)] text-[10px] font-medium"
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
            <RuledLabel>Pairing tipográfico</RuledLabel>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold leading-none tracking-[var(--ls-display)] text-[var(--c-ink)]">
              Fraunces
            </p>
            <p className="mt-1.5 font-[family-name:var(--font-serif)] text-[var(--t-body)] italic text-[var(--c-ink-muted)]">
              Newsreader, para bajadas con voz editorial.
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-[var(--t-small)] text-[var(--c-ink-muted)]">
              IBM Plex Sans — cuerpo de oficio.
            </p>
            <p className={`mt-1 font-[family-name:var(--font-mono)] text-[var(--t-mono)] text-[var(--c-ink-subtle)] ${numeral}`}>
              IBM Plex Mono · UK-2026-JUL-LONDON
            </p>
          </div>

          {/* Radios + reglas */}
          <div>
            <RuledLabel>Radios & reglas</RuledLabel>
            <div className="mt-3 flex items-end gap-3">
              {RADII.map((r) => (
                <div key={r.label} className="text-center">
                  <div
                    className="h-11 w-11 border border-[var(--c-ink)] bg-[var(--c-surface-2)]"
                    style={{ borderRadius: r.v }}
                  />
                  <span className="mt-1 block font-[family-name:var(--font-mono)] text-[10px] text-[var(--c-ink-subtle)]">
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="h-0.5 w-full bg-[var(--c-rule)]" />
              <div className="h-px w-full bg-[var(--c-border-strong)]" />
              <div className="h-px w-2/3 bg-[var(--c-border)]" />
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
  { id: "dashboard", label: "Dashboard", n: "01" },
  { id: "alumnos", label: "Alumnos", n: "02" },
  { id: "viaje", label: "Viaje", n: "03" },
  { id: "login", label: "Login", n: "04" },
];

function SubNav() {
  return (
    <nav className="sticky top-0 z-40 border-b-2 border-[var(--c-rule)] bg-[var(--c-paper)]">
      <div className="mx-auto flex max-w-6xl items-stretch gap-0 overflow-x-auto px-4 sm:px-6 lg:px-10">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="group flex items-baseline gap-2 whitespace-nowrap border-r border-[var(--c-border-strong)] px-4 py-3 text-[var(--t-small)] font-medium text-[var(--c-ink-muted)] transition-colors first:pl-0 hover:bg-[var(--c-surface)] hover:text-[var(--c-accent)]"
          >
            <span className={`font-[family-name:var(--font-mono)] text-[var(--t-micro)] text-[var(--c-ink-faint)] group-hover:text-[var(--c-accent)] ${numeral}`}>
              {n.n}
            </span>
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
  { label: "Alumnos en cartera", value: "60", note: "activos + inscriptos", accent: "var(--c-ink)" },
  { label: "Viajes confirmados", value: "03", note: "temporada 2026", accent: "var(--c-success)" },
  { label: "Viajando ahora", value: "00", note: "ninguno en vuelo", accent: "var(--c-ink-subtle)" },
  { label: "Inscripción abierta", value: "02", note: "sumando cupo", accent: "var(--c-accent)" },
] as const;

function StatCell({
  label,
  value,
  note,
  accent,
  last,
}: {
  label: string;
  value: string;
  note: string;
  accent: string;
  last?: boolean;
}) {
  return (
    <div className={`px-5 py-5 ${last ? "" : "border-r border-[var(--c-border-strong)]"}`}>
      <p className="text-[var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
      </p>
      <p
        className={`mt-3 font-[family-name:var(--font-display)] text-[var(--t-numeral)] font-semibold leading-none tracking-[var(--ls-display)] ${numeral}`}
        style={{ color: accent }}
      >
        {value}
      </p>
      <p className="mt-2 font-[family-name:var(--font-serif)] text-[var(--t-small)] italic text-[var(--c-ink-muted)]">
        {note}
      </p>
    </div>
  );
}

function TripRow({
  code,
  title,
  school,
  dates,
  badge,
  used,
  total,
}: {
  code: string;
  title: string;
  school: string;
  dates: string;
  badge: ReactNode;
  used: number;
  total: number;
}) {
  const pct = Math.round((used / total) * 100);
  return (
    <article className="group grid grid-cols-[1fr_auto] items-start gap-4 border-b border-[var(--c-border-strong)] px-5 py-4 last:border-b-0 hover:bg-[var(--c-surface-3)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-[family-name:var(--font-mono)] text-[var(--t-mono)] text-[var(--c-accent)] ${numeral}`}>
            {code}
          </span>
          {badge}
        </div>
        <h4 className="mt-1.5 font-[family-name:var(--font-display)] text-[var(--t-h3)] font-medium tracking-[var(--ls-display)] text-[var(--c-ink)]">
          {title}
        </h4>
        <p className="mt-0.5 text-[var(--t-small)] text-[var(--c-ink-muted)]">
          {school} · <span className={numeral}>{dates}</span>
        </p>
      </div>
      <div className="w-28 shrink-0 text-right">
        <p className={`font-[family-name:var(--font-mono)] text-[var(--t-h3)] text-[var(--c-ink)] ${numeral}`}>
          {used}<span className="text-[var(--c-ink-faint)]">/{total}</span>
        </p>
        <p className="text-[var(--t-micro)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">cupo</p>
        {/* barra de cupo: regla sólida, sin degradé */}
        <div className="mt-1.5 h-1.5 w-full border border-[var(--c-border-strong)] bg-[var(--c-surface-2)]">
          <div className="h-full bg-[var(--c-ink)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </article>
  );
}

function DashboardScreen() {
  return (
    <Screen id="dashboard">
      <ScreenHeading
        n="01"
        title="Dashboard"
        sub="La portada del día: el estado de la operación leído como una primera plana, no como un tablero de widgets."
      />

      {/* Membrete del día + acción, asimétrico */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] uppercase tracking-[var(--ls-label)] text-[var(--c-accent)] ${numeral}`}>
            Lunes · 31.05.2026
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-[var(--t-display-2)] font-semibold leading-[var(--lh-tight)] tracking-[var(--ls-display)] text-[var(--c-ink)]">
            Buen día, Agustín.
          </h3>
        </div>
        <Button variant="accent">Nuevo viaje</Button>
      </div>

      {/* Tira de cifras: una sola ficha dividida por reglas, no 4 cards iguales */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-[var(--c-border-strong)] sm:grid-cols-4 sm:divide-y-0">
          {STATS.map((s, i) => (
            <StatCell key={s.label} {...s} last={i === STATS.length - 1} />
          ))}
        </div>
      </Card>

      {/* Dos columnas asimétricas: alertas (angosta) + viajes (ancha) */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Alertas */}
        <div>
          <SectionTitle kicker="Bitácora · alertas">Sin novedades</SectionTitle>
          <Card className="mt-4 p-5">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--r-sm)] border border-[var(--c-success)] font-[family-name:var(--font-mono)] text-[var(--c-success)]"
                aria-hidden
              >
                ✓
              </span>
              <div>
                <p className="font-medium text-[var(--c-ink)]">Todo en orden por ahora</p>
                <p className="mt-1 font-[family-name:var(--font-serif)] text-[var(--t-small)] italic leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                  Cuando un paso se trabe o un pasaporte esté por vencer, va a aparecer anotado en este
                  margen.
                </p>
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <RuledLabel>Próximo vencimiento</RuledLabel>
            <div className="mt-3 flex items-baseline justify-between border-b border-[var(--c-border)] pb-2">
              <span className="text-[var(--t-small)] text-[var(--c-ink-muted)]">Fernández, Lucía</span>
              <span className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-accent)] ${numeral}`}>
                14.02.2026
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-b border-[var(--c-border)] pb-2">
              <span className="text-[var(--t-small)] text-[var(--c-ink-muted)]">Benítez, Tomás</span>
              <span className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-ink-muted)] ${numeral}`}>
                03.05.2027
              </span>
            </div>
          </div>
        </div>

        {/* Viajes próximos */}
        <div>
          <div className="flex items-end justify-between">
            <SectionTitle kicker="En el horizonte">Viajes próximos</SectionTitle>
            <a
              href="#viaje"
              className="text-[var(--t-small)] font-medium text-[var(--c-accent)] underline-offset-4 hover:underline"
            >
              Ver todos
            </a>
          </div>
          <Card className="mt-4 overflow-hidden">
            <TripRow
              code="UK-2026-JUL-LONDON"
              title="Londres en Julio · Campus"
              school="London School of English"
              dates="04.07 – 25.07.2026"
              used={12}
              total={24}
              badge={
                <Badge fg="var(--b-viaje-abierta)" bg="var(--b-viaje-abierta-bg)" dot>
                  Inscripción abierta
                </Badge>
              }
            />
            <TripRow
              code="UK-2026-JUL-BRIGHTON"
              title="Brighton Costa · Campus"
              school="Brighton Language College"
              dates="11.07 – 01.08.2026"
              used={18}
              total={20}
              badge={
                <Badge fg="var(--b-viaje-confirmado)" bg="var(--b-viaje-confirmado-bg)" dot>
                  Confirmado
                </Badge>
              }
            />
            <TripRow
              code="UK-2026-AGO-OXFORD"
              title="Oxford Académico · Homestay"
              school="Oxford International"
              dates="08.08 – 29.08.2026"
              used={5}
              total={16}
              badge={
                <Badge fg="var(--b-viaje-abierta)" bg="var(--b-viaje-abierta-bg)" dot>
                  Inscripción abierta
                </Badge>
              }
            />
          </Card>
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
  { apellido: "Álvarez", nombre: "Catalina", dni: "45.102.338", pasaporte: "AAR201144", vto: "12.09.2031", estado: ESTADO.activo },
  { apellido: "Benítez", nombre: "Tomás", dni: "44.788.901", pasaporte: "AAR198052", vto: "03.05.2027", estado: ESTADO.inscripto },
  { apellido: "Castro", nombre: "Malena", dni: "46.013.557", pasaporte: "—", vto: "—", estado: ESTADO.pendiente },
  { apellido: "Domínguez", nombre: "Ignacio", dni: "45.667.210", pasaporte: "AAR210995", vto: "28.11.2030", estado: ESTADO.activo },
  { apellido: "Fernández", nombre: "Lucía", dni: "44.231.880", pasaporte: "AAR175340", vto: "14.02.2026", estado: ESTADO.inscripto },
  { apellido: "Gómez", nombre: "Bautista", dni: "46.520.114", pasaporte: "—", vto: "—", estado: ESTADO.baja },
];

function AlumnosListCard() {
  return (
    <Card className="overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--c-rule)] p-5">
        <div className="flex items-baseline gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-[var(--t-h2)] font-semibold tracking-[var(--ls-display)] text-[var(--c-ink)]">
            Padrón de alumnos
          </h3>
          <span className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-ink-subtle)] ${numeral}`}>
            60 registros
          </span>
        </div>
        <Button variant="accent" size="sm">
          Nuevo alumno
        </Button>
      </div>

      {/* filtros */}
      <div className="flex flex-wrap gap-3 border-b border-[var(--c-border-strong)] bg-[var(--c-surface-3)] p-4">
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-[var(--c-ink-subtle)]" aria-hidden>
            ⌕
          </span>
          <input
            placeholder="Buscar por nombre, DNI o pasaporte…"
            className="min-h-[var(--tap)] w-full rounded-[var(--r-sm)] border border-[var(--c-border-strong)] border-b-2 bg-[var(--c-surface)] pl-8 pr-3 text-[var(--t-body)] text-[var(--c-ink)] placeholder:italic placeholder:text-[var(--c-ink-subtle)] focus:border-[var(--c-ink)] focus:border-b-[var(--c-accent)] focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-52">
          <Select options={["Todos los estados", "Activo", "Inscripto", "Pendiente", "Baja"]} />
        </div>
      </div>

      {/* tabla — full width en su propia fila */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[var(--c-rule)] text-[var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              <th className="px-5 py-2.5 font-semibold">Alumno</th>
              <th className="px-5 py-2.5 font-semibold">Documento</th>
              <th className="px-5 py-2.5 font-semibold">Pasaporte</th>
              <th className="px-5 py-2.5 font-semibold">Estado</th>
              <th className="px-5 py-2.5 text-right font-semibold">Ficha</th>
            </tr>
          </thead>
          <tbody>
            {ALUMNOS.map((a) => (
              <tr
                key={a.dni}
                className="border-b border-[var(--c-border)] transition-colors last:border-b-0 hover:bg-[var(--c-surface-3)]"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-sm)] border border-[var(--c-border-strong)] bg-[var(--c-surface-2)] font-[family-name:var(--font-display)] text-[var(--t-small)] font-semibold text-[var(--c-ink)]"
                      aria-hidden
                    >
                      {a.nombre[0]}
                      {a.apellido[0]}
                    </span>
                    <p className="font-medium text-[var(--c-ink)]">
                      {a.apellido}, <span className="text-[var(--c-ink-muted)]">{a.nombre}</span>
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3 align-middle">
                  <p className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-ink-muted)] ${numeral}`}>
                    {a.dni}
                  </p>
                </td>
                <td className="px-5 py-3 align-middle">
                  {a.pasaporte === "—" ? (
                    <span className="text-[var(--t-small)] italic text-[var(--c-ink-faint)]">sin cargar</span>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-ink)] ${numeral}`}>
                        {a.pasaporte}
                      </span>
                      <span className={`text-[var(--t-micro)] text-[var(--c-ink-subtle)] ${numeral}`}>
                        vto {a.vto}
                      </span>
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
                    Ver →
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
      <div className="border-b-2 border-[var(--c-rule)] p-5">
        <p className="text-[var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-accent)]">
          Alta de ficha
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-[var(--t-h2)] font-semibold tracking-[var(--ls-display)] text-[var(--c-ink)]">
          Nuevo alumno
        </h3>
        <p className="mt-1 font-[family-name:var(--font-serif)] text-[var(--t-small)] italic text-[var(--c-ink-muted)]">
          Los campos con <span className="text-[var(--c-accent)]">*</span> son obligatorios.
        </p>
      </div>

      <div className="space-y-8 p-5 sm:p-6">
        {/* Datos personales */}
        <div>
          <RuledLabel>1 · Datos personales</RuledLabel>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nombre" required>Nombre</Label>
              <Input id="nombre" defaultValue="Catalina" />
            </div>
            <div>
              <Label htmlFor="apellido" required>Apellido</Label>
              <Input id="apellido" placeholder="Apellido del alumno" />
              <FieldNote>Tal cual figura en el documento.</FieldNote>
            </div>
            <div>
              <Label htmlFor="nac" required>Fecha de nacimiento</Label>
              <Input id="nac" placeholder="DD/MM/AAAA" mono />
            </div>
            <div>
              <Label htmlFor="dni" required>DNI</Label>
              <Input id="dni" defaultValue="45.102.33" mono invalid />
              <FieldNote error>El DNI debe tener entre 7 y 8 dígitos.</FieldNote>
            </div>
            <div>
              <Label htmlFor="pasaporte" required>N° de pasaporte</Label>
              <Input id="pasaporte" placeholder="AAR000000" mono />
            </div>
            <div>
              <Label htmlFor="pasvto" required>Vencimiento del pasaporte</Label>
              <Input id="pasvto" placeholder="DD/MM/AAAA" mono />
              <FieldNote>Tiene que estar vigente hasta el fin del viaje.</FieldNote>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <RuledLabel>2 · Contacto</RuledLabel>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email del alumno</Label>
              <Input id="email" type="email" placeholder="alumno@ejemplo.com" />
            </div>
            <div>
              <Label htmlFor="cel">Celular</Label>
              <Input id="cel" placeholder="+54 9 11 …" mono />
            </div>
          </div>
        </div>

        {/* Tutor 1 */}
        <div>
          <RuledLabel>3 · Tutor 1</RuledLabel>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="tnombre" required>Nombre</Label>
              <Input id="tnombre" placeholder="Nombre del tutor" />
            </div>
            <div>
              <Label htmlFor="tcel" required>Celular</Label>
              <Input id="tcel" placeholder="+54 9 11 …" mono />
            </div>
            <div>
              <Label htmlFor="temail" required>Email</Label>
              <Input id="temail" type="email" placeholder="tutor@ejemplo.com" />
            </div>
          </div>
        </div>

        {/* Facturación */}
        <div>
          <RuledLabel>4 · Facturación</RuledLabel>
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
          <RuledLabel>5 · Preferencias</RuledLabel>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="prefs">Notas y preferencias</Label>
              <Textarea
                id="prefs"
                rows={3}
                placeholder="Restricciones alimentarias, alergias, compañeros de cuarto, etc."
              />
            </div>
            <div className="space-y-1 border-t border-[var(--c-border)] pt-3">
              <Checkbox id="ck1" label="Autoriza salidas grupales sin tutor" defaultChecked />
              <Checkbox id="ck2" label="Recibe comunicaciones por email" defaultChecked />
              <Checkbox id="ck3" label="Requiere asistencia médica especial" />
              <Checkbox id="ck4" label="Beca aplicada (bloqueado)" disabled />
            </div>
          </div>
        </div>

        {/* acciones */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t-2 border-[var(--c-rule)] pt-6">
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
        sub="El padrón como una tabla de imprenta, a todo el ancho; el alta como un formulario foliado por secciones."
      />
      {/* Tabla full-width en su propia fila; el formulario debajo, en columna acotada */}
      <div className="space-y-8">
        <AlumnosListCard />
        <div className="grid lg:grid-cols-[1fr_minmax(0,720px)] lg:gap-10">
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <RuledLabel>Sobre el alta</RuledLabel>
              <p className="mt-3 font-[family-name:var(--font-serif)] text-[var(--t-body)] italic leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                Cada ficha sigue el mismo orden que el legajo en papel: identidad, contacto, tutores,
                facturación y notas. Así, quien carga reconoce el formulario sin tener que pensarlo.
              </p>
              <div className="mt-5 space-y-2">
                {["Datos personales", "Contacto", "Tutor 1", "Facturación", "Preferencias"].map((s, i) => (
                  <div key={s} className="flex items-baseline gap-3 border-b border-[var(--c-border)] pb-2">
                    <span className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] text-[var(--c-accent)] ${numeral}`}>
                      0{i + 1}
                    </span>
                    <span className="text-[var(--t-small)] text-[var(--c-ink-muted)]">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <AlumnoForm />
        </div>
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
  { k: "Fechas", v: <span className={numeral}>04.07 – 25.07.2026</span> },
  { k: "Destino", v: "London School of English · UK" },
  { k: "Curso", v: "General English" },
  { k: "Origen", v: "Representante independiente" },
  { k: "Group Leaders", v: <span className={numeral}>2</span> },
  { k: "Cupo", v: <span className={numeral}>0 / 24</span> },
  { k: "Cupo mínimo", v: <span className={numeral}>5</span> },
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
  return { fg: `var(--b-paso-${estado})`, bg: `var(--b-paso-${estado}-bg)` };
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
        "flex min-w-[170px] flex-1 flex-col gap-3 rounded-[var(--r-md)] border p-4",
        active
          ? "border-[var(--c-ink)] bg-[var(--c-surface)] shadow-[var(--shadow-accent)]"
          : "border-[var(--c-border-strong)] bg-[var(--c-surface)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] font-semibold text-[var(--c-ink-faint)] ${numeral}`}>
          {n}
        </span>
        <Badge fg={c.fg} bg={c.bg} dot>
          {PASO_LABEL[estado]}
        </Badge>
      </div>
      <p className="font-[family-name:var(--font-display)] text-[var(--t-h3)] font-medium tracking-[var(--ls-display)] text-[var(--c-ink)]">
        {label}
      </p>
      {aviso && (
        <p className="inline-flex items-center gap-1.5 border-l-2 border-[var(--c-danger)] bg-[var(--c-danger-bg)] px-2 py-1 text-[var(--t-micro)] font-medium text-[var(--c-danger)]">
          <span aria-hidden className="font-bold">×</span> {aviso}
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
        sub="Toda la operación de un viaje en una hoja: cabecera, datos de registro, asignaciones, leaders y el seguimiento M7."
      />

      {/* Cabecera en tinta sólida (sin degradé) */}
      <Card
        as="section"
        className="mb-8 overflow-hidden border-[var(--c-ink)] bg-[var(--c-surface-inverse)] p-6 text-[var(--c-ink-onink)] sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <Monogram size="lg" onInk />
            <div>
              <span className={`font-[family-name:var(--font-mono)] text-[var(--t-small)] tracking-[var(--ls-mono)] text-[var(--c-accent-300)] ${numeral}`}>
                UK-2026-JUL-LONDON
              </span>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-[var(--t-display-2)] font-semibold leading-[var(--lh-tight)] tracking-[var(--ls-display)]">
                Londres en Julio
              </h3>
              <p className="mt-1 font-[family-name:var(--font-serif)] text-[var(--t-body)] italic text-[var(--c-ink-onink-muted)]">
                Campus · London School of English
              </p>
            </div>
          </div>
          <Button variant="accent">Editar viaje</Button>
        </div>
      </Card>

      {/* Datos de registro: grilla con reglas, sin cards flotantes */}
      <Card className="mb-8 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {DATOS_VIAJE.map((d) => (
            <div
              key={d.k}
              className="border-b border-r border-[var(--c-border)] px-4 py-4"
            >
              <p className="text-[var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                {d.k}
              </p>
              <div className="mt-2 text-[var(--t-body)] font-medium text-[var(--c-ink)]">{d.v}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Alumnos asignados */}
        <Card className="overflow-hidden">
          <div className="border-b-2 border-[var(--c-rule)] p-5">
            <SectionTitle kicker="Asignaciones">Alumnos del viaje</SectionTitle>
          </div>
          <div className="flex flex-wrap gap-3 border-b border-[var(--c-border-strong)] bg-[var(--c-surface-3)] p-4">
            <div className="min-w-[200px] flex-1">
              <Select options={["Buscar alumno para asignar…", "Álvarez, Catalina", "Benítez, Tomás", "Castro, Malena"]} />
            </div>
            <Button variant="primary" size="sm">
              Asignar
            </Button>
          </div>
          {/* estado vacío con copy bien escrito, sin emoji */}
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <span
              className="font-[family-name:var(--font-display)] text-5xl italic text-[var(--c-ink-faint)]"
              aria-hidden
            >
              0
            </span>
            <p className="font-[family-name:var(--font-display)] text-[var(--t-h3)] font-medium text-[var(--c-ink)]">
              Todavía no hay alumnos asignados
            </p>
            <p className="max-w-xs font-[family-name:var(--font-serif)] text-[var(--t-small)] italic leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              Buscá un alumno arriba y asignalo a este viaje. El cupo se recalcula solo, sobre el total
              de 24.
            </p>
          </div>
        </Card>

        {/* Group Leaders */}
        <Card className="overflow-hidden">
          <div className="border-b-2 border-[var(--c-rule)] p-5">
            <SectionTitle kicker="Equipo">Group Leaders</SectionTitle>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-[var(--c-rule)] text-[var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                <th className="px-5 py-2.5 font-semibold">Leader</th>
                <th className="px-5 py-2.5 font-semibold">Police check</th>
                <th className="px-5 py-2.5 font-semibold">Rol</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--c-border)]">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-[var(--c-ink)]">Paula Vidal</p>
                  <p className="font-[family-name:var(--font-mono)] text-[var(--t-micro)] text-[var(--c-ink-subtle)]">
                    paula@jovenesuk.com
                  </p>
                </td>
                <td className="px-5 py-3.5">
                  <Badge fg="var(--b-police-aprobado)" bg="var(--b-police-aprobado-bg)" dot>
                    Aprobado
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone="accent">Principal</Badge>
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-[var(--c-ink)]">Mariano Sosa</p>
                  <p className="font-[family-name:var(--font-mono)] text-[var(--t-micro)] text-[var(--c-ink-subtle)]">
                    mariano@jovenesuk.com
                  </p>
                </td>
                <td className="px-5 py-3.5">
                  <Badge fg="var(--b-police-en_tramite)" bg="var(--b-police-en_tramite-bg)" dot>
                    En trámite
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone="neutral">Acompañante</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      {/* Seguimiento M7 */}
      <div className="mt-10">
        <SectionTitle kicker="Seguimiento del viaje · M7">Cinco pasos hasta el despegue</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          {PASOS_M7.map((p) => (
            <StepCard key={p.n} n={p.n} label={p.label} estado={p.estado} aviso={p.aviso} active={p.n === "01"} />
          ))}
        </div>

        {/* editor del paso seleccionado */}
        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--c-rule)] p-5">
            <div className="flex items-baseline gap-3">
              <span className={`font-[family-name:var(--font-mono)] text-[var(--t-h3)] font-semibold text-[var(--c-accent)] ${numeral}`}>
                01
              </span>
              <h4 className="font-[family-name:var(--font-display)] text-[var(--t-h2)] font-semibold tracking-[var(--ls-display)] text-[var(--c-ink)]">
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
              <Input id="vuelo" placeholder="BA 0246" mono />
            </div>
            <div>
              <Label htmlFor="eticket">E-ticket URL</Label>
              <Input id="eticket" type="url" placeholder="https://…" mono />
            </div>
            <div>
              <Label htmlFor="fida">Fecha de ida</Label>
              <Input id="fida" placeholder="04/07/2026" mono />
            </div>
            <div>
              <Label htmlFor="fvuelta">Fecha de vuelta</Label>
              <Input id="fvuelta" placeholder="25/07/2026" mono />
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
        sub="La portada del portal: a la izquierda, una página de tinta con la promesa de la agencia; a la derecha, el ingreso, escueto."
      />
      <Card className="overflow-hidden p-0">
        {/* Asimétrico: panel de tinta ancho + formulario angosto */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          {/* panel de marca · TINTA SÓLIDA, sin degradé */}
          <div className="relative flex min-h-[460px] flex-col justify-between bg-[var(--c-surface-inverse)] p-8 text-[var(--c-ink-onink)] sm:p-10">
            {/* textura sutil: reglas de renglón, hechas con border, no blur */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, var(--c-ink-onink) 31px, var(--c-ink-onink) 32px)",
              }}
              aria-hidden
            />
            <div className="relative flex items-center gap-3">
              <Monogram size="lg" onInk />
              <div className="leading-tight">
                <p className="font-[family-name:var(--font-display)] text-[var(--t-h3)] font-semibold tracking-[var(--ls-display)]">
                  Jóvenes en UK
                </p>
                <p className="font-[family-name:var(--font-mono)] text-[var(--t-micro)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onink-muted)]">
                  Portal interno
                </p>
              </div>
            </div>

            <div className="relative">
              <span className="mb-4 block h-0.5 w-12 bg-[var(--c-accent)]" />
              <p className="font-[family-name:var(--font-display)] text-[var(--t-display-2)] font-medium leading-[var(--lh-snug)] tracking-[var(--ls-display)]">
                Todo lo que hace que el viaje salga bien,{" "}
                <span className="italic text-[var(--c-accent-300)]">en una sola hoja.</span>
              </p>
              <p className="mt-4 max-w-sm font-[family-name:var(--font-serif)] text-[var(--t-body)] italic leading-[var(--lh-body)] text-[var(--c-ink-onink-muted)]">
                Alumnos, viajes, group leaders y el seguimiento de cada paso — del primer formulario al
                regreso a casa.
              </p>
            </div>

            <div className="relative flex items-center gap-3 font-[family-name:var(--font-mono)] text-[var(--t-micro)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onink-muted)]">
              <span className="text-[var(--c-accent-300)]">●</span> 60 alumnos
              <span className="text-[var(--c-ink-onink-muted)]">·</span> 3 viajes
              <span className="text-[var(--c-ink-onink-muted)]">·</span> temporada 2026
            </div>
          </div>

          {/* formulario */}
          <div className="flex items-center justify-center bg-[var(--c-surface)] p-8 sm:p-12">
            <div className="w-full max-w-sm">
              <p className="text-[var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-accent)]">
                Acceso
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-[var(--t-h1)] font-semibold tracking-[var(--ls-display)] text-[var(--c-ink)]">
                Ingresar al portal
              </h3>
              <p className="mt-1.5 font-[family-name:var(--font-serif)] text-[var(--t-small)] italic text-[var(--c-ink-muted)]">
                Usá tu cuenta del equipo de Jóvenes en UK.
              </p>

              <form className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="login-email" required>Email</Label>
                  <Input id="login-email" type="email" placeholder="vos@jovenesuk.com" />
                </div>
                <div>
                  <Label htmlFor="login-pass" required>Contraseña</Label>
                  <Input id="login-pass" type="password" placeholder="••••••••" />
                </div>
                <Button type="submit" variant="primary" className="w-full">
                  Ingresar
                </Button>
              </form>

              <div className="mt-6 border-t border-[var(--c-border)] pt-4 text-center">
                <a className="text-[var(--t-small)] font-medium text-[var(--c-accent)] underline-offset-4 hover:underline" href="#login">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
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

export default function AutorPage() {
  return (
    <div
      className={`v-autor ${display.variable} ${serif.variable} ${body.variable} ${mono.variable} min-h-screen font-[family-name:var(--font-body)] text-[var(--c-ink)]`}
      style={{ backgroundColor: "var(--c-page)" }}
    >
      <TokensStrip />
      <SubNav />
      <DashboardScreen />
      <AlumnosScreen />
      <ViajeScreen />
      <LoginScreen />
      <footer className="border-t-2 border-[var(--c-rule)] px-6 py-8 text-center">
        <p className="font-[family-name:var(--font-mono)] text-[var(--t-micro)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
          Dirección <span className="text-[var(--c-accent)]">Autor</span> · concept de handoff · restilá
          todo desde tokens.css
        </p>
      </footer>
    </div>
  );
}
