"use client";

/*
 * Demos interactivos de la dirección STUDIO (tabs, overlays, toasts,
 * command palette, calendario, slider). Igual que primitives.tsx:
 * autocontenidos, todo sale de ./tokens.css.
 */
import { useEffect, useRef, useState } from "react";

import {
  Avatar,
  Badge,
  Button,
  Divider,
  FieldNote,
  Input,
  Kbd,
  Label,
  Progress,
  Textarea,
  ToastCard,
  cn,
} from "./primitives";

/* ════════════════════════════════════════════════════════════════
 * Tabs
 * ════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: "datos", label: "Datos" },
  { id: "documentos", label: "Documentos" },
  { id: "pagos", label: "Pagos" },
  { id: "historial", label: "Historial" },
] as const;

export function TabsDemo() {
  const [active, setActive] = useState<string>("documentos");
  return (
    <div>
      <div
        role="tablist"
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-[var(--r-pill)] border border-[var(--c-border)] bg-[var(--c-surface-2)] p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "min-h-[36px] whitespace-nowrap rounded-[var(--r-pill)] px-4 text-[length:var(--t-small)] font-semibold transition-all",
              active === t.id
                ? "bg-[var(--c-surface)] text-[var(--c-brand)] shadow-[shadow:var(--shadow-1)]"
                : "text-[var(--c-ink-muted)] hover:text-[var(--c-ink)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5">
        {active === "datos" && (
          <dl className="grid gap-3 text-[length:var(--t-small)] sm:grid-cols-2">
            <div>
              <dt className="font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">DNI</dt>
              <dd className="mt-0.5 font-[family-name:var(--font-mono)] text-[var(--c-ink)]">45.102.338</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">Nacimiento</dt>
              <dd className="mt-0.5 text-[var(--c-ink)]">14/03/2009</dd>
            </div>
          </dl>
        )}
        {active === "documentos" && (
          <ul className="space-y-2.5">
            {[
              { doc: "Pasaporte AAR201144", estado: "Validado", tone: "var(--c-success)", bg: "var(--c-success-bg)" },
              { doc: "Permiso parental", estado: "Pendiente", tone: "var(--c-warning)", bg: "var(--c-warning-bg)" },
              { doc: "Ficha médica", estado: "Validado", tone: "var(--c-success)", bg: "var(--c-success-bg)" },
            ].map((d) => (
              <li key={d.doc} className="flex items-center justify-between gap-3 text-[length:var(--t-small)]">
                <span className="flex items-center gap-2 font-medium text-[var(--c-ink)]">
                  <span aria-hidden>📄</span> {d.doc}
                </span>
                <Badge fg={d.tone} bg={d.bg} dot>
                  {d.estado}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {active === "pagos" && (
          <div className="space-y-3">
            <Progress label="Plan de pagos · 6 cuotas" value={50} warm />
            <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              3 de 6 cuotas acreditadas · próxima vence el 10/07/2026.
            </p>
          </div>
        )}
        {active === "historial" && (
          <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            Último cambio: paso 4 (Visa) marcado{" "}
            <span className="font-semibold text-[var(--c-success)]">completado</span> por Paula ·
            28/05/2026 18:42.
          </p>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Dialog (confirmación destructiva)
 * ════════════════════════════════════════════════════════════════ */

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Dar de baja un alumno…
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dlg-title"
        >
          <button
            type="button"
            aria-label="cerrar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px] animate-[studio-fade_.2s_ease-out]"
          />
          <div className="relative w-full max-w-md rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[shadow:var(--shadow-3)] animate-[studio-pop_.25s_cubic-bezier(.2,.9,.3,1.15)]">
            <span
              className="grid h-12 w-12 place-items-center rounded-[var(--r-lg)] text-xl"
              style={{ backgroundColor: "var(--c-danger-bg)" }}
              aria-hidden
            >
              🗑️
            </span>
            <h4
              id="dlg-title"
              className="mt-4 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]"
            >
              ¿Dar de baja a Catalina Álvarez?
            </h4>
            <p className="mt-1.5 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              Se la quita del viaje <span className="font-[family-name:var(--font-mono)]">UK-2026-JUL-LONDON</span> y
              el cupo se libera. Los pagos registrados no se tocan.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="!bg-[var(--c-danger)] !shadow-[0_12px_28px_rgba(214,81,81,0.3)] hover:!bg-[#c24444]"
                onClick={() => setOpen(false)}
              >
                Sí, dar de baja
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Drawer (sheet lateral)
 * ════════════════════════════════════════════════════════════════ */

export function DrawerDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Abrir ficha rápida →
      </Button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="ficha rápida">
          <button
            type="button"
            aria-label="cerrar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px] animate-[studio-fade_.2s_ease-out]"
          />
          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col overflow-y-auto rounded-l-[var(--r-xl)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-3)] animate-[studio-slide-left_.3s_cubic-bezier(.2,.9,.3,1)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] p-5">
              <div className="flex items-center gap-3">
                <Avatar name="Catalina Álvarez" size="lg" />
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
                    Catalina Álvarez
                  </p>
                  <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                    DNI 45.102.338
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="cerrar"
                className="grid h-9 w-9 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-subtle)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="success" dot>
                  Activa
                </Badge>
                <Badge tone="info" dot>
                  UK-2026-JUL-LONDON
                </Badge>
              </div>
              <Progress label="Seguimiento M6" value={60} />
              <Divider label="Contacto" />
              <dl className="space-y-2.5 text-[length:var(--t-small)]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--c-ink-muted)]">Tutor</dt>
                  <dd className="font-semibold text-[var(--c-ink)]">Marcela Pereyra</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--c-ink-muted)]">Celular</dt>
                  <dd className="font-[family-name:var(--font-mono)] text-[var(--c-ink)]">+54 9 11 5550 1234</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--c-ink-muted)]">Email</dt>
                  <dd className="font-semibold text-[var(--c-ink)]">familia.alvarez@gmail.com</dd>
                </div>
              </dl>
              <Divider label="Notas" />
              <Textarea rows={3} placeholder="Notas internas del equipo…" defaultValue="Vegetariana. Comparte cuarto con L. Fernández." />
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cerrar
                </Button>
                <Button variant="primary">Ver ficha completa</Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Dropdown menu
 * ════════════════════════════════════════════════════════════════ */

const MENU_ITEMS = [
  { label: "Ver ficha", icon: "👁️" },
  { label: "Editar datos", icon: "✏️" },
  { label: "Asignar a un viaje", icon: "✈️" },
] as const;

export function DropdownDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        Acciones
        <svg viewBox="0 0 20 20" aria-hidden className={cn("h-4 w-4 transition-transform", open && "rotate-180")}>
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute left-0 z-50 mt-2 w-60 overflow-hidden rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-1.5 shadow-[shadow:var(--shadow-2)] animate-[studio-pop_.18s_ease-out]"
          >
            {MENU_ITEMS.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-3 py-2.5 text-left text-[length:var(--t-small)] font-medium text-[var(--c-ink)] transition-colors hover:bg-[var(--c-brand-50)] hover:text-[var(--c-brand)]"
              >
                <span aria-hidden>{it.icon}</span> {it.label}
              </button>
            ))}
            <div className="mx-2 my-1.5 h-px bg-[var(--c-border)]" />
            <button
              type="button"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-3 py-2.5 text-left text-[length:var(--t-small)] font-semibold text-[var(--c-danger)] transition-colors hover:bg-[var(--c-danger-bg)]"
            >
              <span aria-hidden>🗑️</span> Dar de baja
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Toasts (stack vivo)
 * ════════════════════════════════════════════════════════════════ */

type Toast = {
  id: number;
  tone: "success" | "info" | "warning" | "danger";
  title: string;
  body: string;
};

const TOAST_SAMPLES: Omit<Toast, "id">[] = [
  { tone: "success", title: "Alumno asignado", body: "Catalina Álvarez ya es parte de UK-2026-JUL-LONDON." },
  { tone: "info", title: "Recordatorio programado", body: "Se avisa a las familias 7 días antes del vencimiento." },
  { tone: "warning", title: "Cupo casi completo", body: "Brighton Costa: quedan 2 lugares de 20." },
  { tone: "danger", title: "No se pudo guardar", body: "El DNI ya existe en otro alumno. Revisalo." },
];

export function ToastsDemo() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  function push(sample: Omit<Toast, "id">) {
    const id = nextId.current++;
    setToasts((ts) => [...ts.slice(-2), { ...sample, id }]);
    timers.current.push(
      window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4500),
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        {TOAST_SAMPLES.map((s) => (
          <Button key={s.tone} variant="outline" size="sm" onClick={() => push(s)}>
            {s.tone === "success" ? "Éxito" : s.tone === "info" ? "Info" : s.tone === "warning" ? "Aviso" : "Error"}
          </Button>
        ))}
      </div>

      <div className="pointer-events-none mt-4 flex min-h-[120px] flex-col items-end justify-end gap-2.5 rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface-3)] p-4">
        {toasts.length === 0 && (
          <p className="m-auto text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Tocá un botón: los toasts aparecen acá y se van solos.
          </p>
        )}
        {toasts.map((t) => (
          <div key={t.id} className="w-full max-w-sm animate-[studio-toast_.25s_ease-out]">
            <ToastCard
              tone={t.tone}
              title={t.title}
              onClose={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
            >
              {t.body}
            </ToastCard>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Command palette
 * ════════════════════════════════════════════════════════════════ */

const COMMANDS = [
  { group: "Acciones", icon: "✈️", label: "Crear viaje nuevo", kbd: "N" },
  { group: "Acciones", icon: "🎒", label: "Dar de alta un alumno", kbd: "A" },
  { group: "Acciones", icon: "📤", label: "Exportar alumnos a CSV", kbd: null },
  { group: "Ir a", icon: "📊", label: "Dashboard", kbd: "G D" },
  { group: "Ir a", icon: "🧭", label: "Viajes", kbd: "G V" },
  { group: "Ir a", icon: "🏫", label: "Colegios", kbd: null },
  { group: "Alumnos", icon: "👤", label: "Álvarez, Catalina — DNI 45.102.338", kbd: null },
  { group: "Alumnos", icon: "👤", label: "Benítez, Tomás — DNI 44.788.901", kbd: null },
] as const;

export function CommandDemo() {
  const [q, setQ] = useState("");
  const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(filtered.map((c) => c.group))];

  return (
    <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-2)]">
      <div className="flex items-center gap-3 border-b border-[var(--c-border)] px-4">
        <span aria-hidden className="text-[var(--c-ink-subtle)]">
          🔍
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar acciones, alumnos, viajes…"
          className="min-h-[52px] w-full bg-transparent text-[length:var(--t-body)] text-[var(--c-ink)] placeholder:text-[var(--c-ink-subtle)] focus:outline-none"
        />
        <Kbd>esc</Kbd>
      </div>

      <div className="max-h-72 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <p className="px-3 py-8 text-center text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Nada que coincida con «{q}».
          </p>
        )}
        {groups.map((g) => (
          <div key={g}>
            <p className="px-3 pb-1 pt-3 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              {g}
            </p>
            {filtered
              .filter((c) => c.group === g)
              .map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left text-[length:var(--t-small)] font-medium text-[var(--c-ink)] transition-colors hover:bg-[var(--c-brand-50)] hover:text-[var(--c-brand)]"
                >
                  <span aria-hidden>{c.icon}</span>
                  <span className="flex-1">{c.label}</span>
                  {c.kbd && (
                    <span className="flex gap-1">
                      {c.kbd.split(" ").map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 border-t border-[var(--c-border)] bg-[var(--c-surface-3)] px-4 py-2.5 text-[11px] text-[var(--c-ink-subtle)]">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navegar
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> abrir
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd> desde cualquier pantalla
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Select custom (mantiene el diseño al desplegar — nada de nativo)
 * ════════════════════════════════════════════════════════════════ */

export function SelectMenu({
  id,
  options,
  defaultValue,
  placeholder = "Elegí una opción…",
  disabled,
  invalid,
}: {
  id?: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(defaultValue ?? null);

  return (
    <div className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-[var(--tap)] w-full items-center justify-between gap-3 rounded-[var(--r-md)] border bg-[var(--c-surface)] px-4 text-left text-[length:var(--t-body)] transition-[border-color,box-shadow] duration-150 focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--c-surface-2)] disabled:text-[var(--c-ink-subtle)]",
          invalid
            ? "border-[var(--c-danger)] shadow-[shadow:var(--ring-error)]"
            : open
              ? "border-[var(--c-brand-300)] shadow-[shadow:var(--ring-focus)]"
              : "border-[var(--c-border-strong)] focus-visible:border-[var(--c-brand-300)] focus-visible:shadow-[shadow:var(--ring-focus)]",
        )}
      >
        <span className={cn("truncate", value ? "text-[var(--c-ink)]" : "text-[var(--c-ink-subtle)]")}>
          {value ?? placeholder}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--c-ink-subtle)] transition-transform duration-200",
            open && "rotate-180 text-[var(--c-brand)]",
          )}
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="cerrar opciones"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <ul
            role="listbox"
            aria-labelledby={id}
            className="absolute z-50 mt-2 flex max-h-64 w-full flex-col gap-1 overflow-y-auto rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-1.5 shadow-[shadow:var(--shadow-2)] animate-[studio-pop_.18s_ease-out]"
          >
            {options.map((o) => {
              const active = o === value;
              return (
                <li key={o}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setValue(o);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left text-[length:var(--t-small)] transition-colors",
                      active
                        ? "bg-[var(--c-brand-50)] font-semibold text-[var(--c-brand)]"
                        : "font-medium text-[var(--c-ink)] hover:bg-[var(--c-surface-2)]",
                    )}
                  >
                    <span className="truncate">{o}</span>
                    {active && (
                      <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0">
                        <path
                          d="M4 10.5 8 14.5 16 5.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Date range picker (calendario navegable + rango editable)
 * ════════════════════════════════════════════════════════════════ */

const DOW = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function DateRangeDemo() {
  const [view, setView] = useState({ y: 2026, m: 6 }); // julio 2026
  const [start, setStart] = useState<Date | null>(new Date(2026, 6, 4));
  const [end, setEnd] = useState<Date | null>(new Date(2026, 6, 25));

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // semana arranca lunes
  const totalDays = new Date(view.y, view.m + 1, 0).getDate();

  const moveMonth = (delta: number) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const pick = (day: number) => {
    const d = new Date(view.y, view.m, day);
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
    } else if (d.getTime() <= start.getTime()) {
      setStart(d);
    } else {
      setEnd(d);
    }
  };

  const sameDay = (a: Date | null, day: number) =>
    !!a && a.getFullYear() === view.y && a.getMonth() === view.m && a.getDate() === day;
  const between = (day: number) => {
    if (!start || !end) return false;
    const t = new Date(view.y, view.m, day).getTime();
    return t > start.getTime() && t < end.getTime();
  };

  const noches = start && end ? Math.round((end.getTime() - start.getTime()) / 86_400_000) : null;

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="w-full max-w-sm rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="mes anterior"
            className="grid h-9 w-9 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-brand)] active:scale-95"
          >
            ←
          </button>
          <p className="font-[family-name:var(--font-display)] font-bold text-[var(--c-ink)]">
            {MESES[view.m]} {view.y}
          </p>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="mes siguiente"
            className="grid h-9 w-9 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-muted)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-brand)] active:scale-95"
          >
            →
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 text-center">
          {DOW.map((d, i) => (
            <span
              key={`${d}${i}`}
              className="pb-2 text-[length:var(--t-label)] font-bold uppercase text-[var(--c-ink-subtle)]"
            >
              {d}
            </span>
          ))}
          {Array.from({ length: offset }).map((_, i) => (
            <span key={`pad${i}`} />
          ))}
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
            const isCap = sameDay(start, day) || sameDay(end, day);
            const inRange = between(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => pick(day)}
                className={cn(
                  "relative mx-auto my-0.5 grid h-9 w-9 place-items-center text-[length:var(--t-small)] font-semibold transition-colors",
                  isCap
                    ? "rounded-[var(--r-pill)] bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
                    : inRange
                      ? "rounded-[var(--r-sm)] bg-[var(--c-brand-50)] text-[var(--c-brand)]"
                      : "rounded-[var(--r-pill)] text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)]",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--c-border)] pt-3 text-[length:var(--t-small)]">
          <span className="text-[var(--c-ink-muted)]">
            {noches !== null ? (
              <>
                <span className="font-semibold text-[var(--c-ink)]">{noches}</span> noches
              </>
            ) : (
              "Elegí la fecha de regreso…"
            )}
          </span>
          <Badge tone="accent" dot>
            Fechas del viaje
          </Badge>
        </div>
      </div>

      <div className="min-w-[220px] flex-1 space-y-4">
        <div>
          <Label htmlFor="g-date-1" required>
            Salida
          </Label>
          <input
            id="g-date-1"
            value={fmtFecha(start)}
            readOnly
            className="min-h-[var(--tap)] w-full rounded-[var(--r-md)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] px-4 font-[family-name:var(--font-mono)] text-[length:var(--t-body)] text-[var(--c-ink)] focus:outline-none"
          />
        </div>
        <div>
          <Label htmlFor="g-date-2" required>
            Regreso
          </Label>
          <input
            id="g-date-2"
            value={fmtFecha(end)}
            readOnly
            className="min-h-[var(--tap)] w-full rounded-[var(--r-md)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] px-4 font-[family-name:var(--font-mono)] text-[length:var(--t-body)] text-[var(--c-ink)] focus:outline-none"
          />
          <p className="mt-1.5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Tocá un día para la salida y otro para el regreso. El pasaporte debe estar vigente hasta
            esta fecha.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Slider
 * ════════════════════════════════════════════════════════════════ */

export function SliderDemo() {
  const [value, setValue] = useState(24);
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between">
        <Label htmlFor="cupo-slider">Cupo del viaje</Label>
        <span className="rounded-[var(--r-sm)] bg-[var(--c-brand-50)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-brand)]">
          {value}
        </span>
      </div>
      <input
        id="cupo-slider"
        type="range"
        min={4}
        max={40}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-[var(--r-pill)] bg-[var(--c-surface-2)] accent-[var(--c-brand)]"
        style={{
          backgroundImage: `linear-gradient(to right, var(--c-brand) ${((value - 4) / 36) * 100}%, transparent ${((value - 4) / 36) * 100}%)`,
        }}
      />
      <div className="mt-1.5 flex justify-between font-[family-name:var(--font-mono)] text-[11px] text-[var(--c-ink-subtle)]">
        <span>mín 4</span>
        <span>máx 40</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Input con contador (textarea viva)
 * ════════════════════════════════════════════════════════════════ */

export function CounterFieldDemo() {
  const MAX = 140;
  const [text, setText] = useState("Vegetariana. Comparte cuarto con L. Fernández.");
  const over = text.length > MAX;
  return (
    <div>
      <Label htmlFor="notas-counter">Notas para el colegio</Label>
      <textarea
        id="notas-counter"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={cn(
          "w-full resize-none rounded-[var(--r-md)] border bg-[var(--c-surface)] px-4 py-3 text-[length:var(--t-body)] text-[var(--c-ink)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--c-ink-subtle)] focus:outline-none",
          over
            ? "border-[var(--c-danger)] shadow-[shadow:var(--ring-error)]"
            : "border-[var(--c-border-strong)] focus:border-[var(--c-brand-300)] focus:shadow-[shadow:var(--ring-focus)]",
        )}
      />
      <div className="mt-1 flex justify-end">
        <span
          className="font-[family-name:var(--font-mono)] text-[11px] font-bold"
          style={{ color: over ? "var(--c-danger)" : "var(--c-ink-subtle)" }}
        >
          {text.length}/{MAX}
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Search con sugerencias
 * ════════════════════════════════════════════════════════════════ */

const SUGERENCIAS = [
  "Álvarez, Catalina",
  "Benítez, Tomás",
  "Castro, Malena",
  "Domínguez, Ignacio",
  "Fernández, Lucía",
];

export function SearchDemo() {
  const [q, setQ] = useState("");
  const matches = q.length > 0 ? SUGERENCIAS.filter((s) => s.toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <div className="relative w-full max-w-sm">
      <span className="pointer-events-none absolute left-4 top-[22px] -translate-y-1/2 text-[var(--c-ink-subtle)]" aria-hidden>
        🔍
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Probá escribir «al»…"
        aria-label="buscar alumno"
        className="min-h-[var(--tap)] w-full rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] pl-11 pr-4 text-[length:var(--t-body)] text-[var(--c-ink)] placeholder:text-[var(--c-ink-subtle)] focus:border-[var(--c-brand-300)] focus:shadow-[shadow:var(--ring-focus)] focus:outline-none"
      />
      {matches.length > 0 && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-1.5 shadow-[shadow:var(--shadow-2)] animate-[studio-pop_.15s_ease-out]">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setQ(m)}
              className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-3 py-2.5 text-left text-[length:var(--t-small)] font-medium text-[var(--c-ink)] transition-colors hover:bg-[var(--c-brand-50)] hover:text-[var(--c-brand)]"
            >
              <span aria-hidden>👤</span> {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Modal con formulario (alta rápida)
 * ════════════════════════════════════════════════════════════════ */

export function FormModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="accent" onClick={() => setOpen(true)}>
        + Nuevo colegio
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fm-title"
        >
          <button
            type="button"
            aria-label="cerrar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px] animate-[studio-fade_.2s_ease-out]"
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-3)] animate-[studio-pop_.25s_cubic-bezier(.2,.9,.3,1.15)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface-3)] p-5">
              <div>
                <h4
                  id="fm-title"
                  className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]"
                >
                  Nuevo colegio
                </h4>
                <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                  Alta rápida — después completás el resto desde la ficha.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="cerrar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-subtle)] transition-colors hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="fm-nombre" required>
                  Nombre
                </Label>
                <Input id="fm-nombre" placeholder="Brighton Language College" autoFocus />
              </div>
              <div>
                <Label htmlFor="fm-ciudad" required>
                  Ciudad
                </Label>
                <Input id="fm-ciudad" placeholder="Brighton" />
              </div>
              <div>
                <Label htmlFor="fm-tipo" required>
                  Tipo
                </Label>
                <SelectMenu id="fm-tipo" defaultValue="Destino" options={["Destino", "Cliente"]} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="fm-email">Email de contacto</Label>
                <Input id="fm-email" type="email" placeholder="admissions@colegio.co.uk" />
                <FieldNote>Lo usamos para las cartas de aceptación.</FieldNote>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--c-border)] p-5">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Crear colegio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Popover (detalle contextual al click)
 * ════════════════════════════════════════════════════════════════ */

export function PopoverDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] px-3 py-1 text-[length:var(--t-label)] font-semibold leading-none tracking-[var(--ls-label)] transition-shadow hover:shadow-[shadow:var(--ring-focus)]"
        style={{ color: "var(--b-paso-en_progreso)", backgroundColor: "var(--b-paso-en_progreso-bg)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--b-paso-en_progreso)" }} />
        C2 · Immigration Letter
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="cerrar popover"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="dialog"
            className="absolute left-0 top-full z-50 mt-2 w-72 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-2)] animate-[studio-pop_.18s_ease-out]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-[family-name:var(--font-display)] font-bold text-[var(--c-ink)]">
                Immigration Letter
              </p>
              <Badge fg="var(--b-paso-en_progreso)" bg="var(--b-paso-en_progreso-bg)" dot>
                En progreso
              </Badge>
            </div>
            <dl className="mt-3 space-y-1.5 text-[length:var(--t-small)]">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--c-ink-muted)]">Alumno</dt>
                <dd className="font-semibold text-[var(--c-ink)]">Catalina Álvarez</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--c-ink-muted)]">Depende de</dt>
                <dd className="font-semibold text-[var(--c-ink)]">B1 · Plan de cuotas ✓</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--c-ink-muted)]">Último cambio</dt>
                <dd className="font-[family-name:var(--font-mono)] text-[var(--c-ink)]">09/06 14:10</dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-2 border-t border-[var(--c-border)] pt-3">
              <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
                Abrir paso
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Bottom sheet (mobile-first)
 * ════════════════════════════════════════════════════════════════ */

const SHEET_ACTIONS = [
  { icon: "👁️", label: "Ver ficha completa" },
  { icon: "✈️", label: "Asignar a un viaje" },
  { icon: "📄", label: "Subir documento" },
  { icon: "📨", label: "Reenviar invitación a la familia" },
] as const;

export function BottomSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Acciones del alumno ↑
      </Button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="acciones del alumno">
          <button
            type="button"
            aria-label="cerrar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px] animate-[studio-fade_.2s_ease-out]"
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[var(--r-xl)] bg-[var(--c-surface)] p-5 pb-7 shadow-[shadow:var(--shadow-3)] animate-[studio-slide-up_.3s_cubic-bezier(.2,.9,.3,1)]">
            <span className="mx-auto block h-1.5 w-10 rounded-[var(--r-pill)] bg-[var(--c-border-strong)]" aria-hidden />
            <div className="mt-4 flex items-center gap-3">
              <Avatar name="Catalina Álvarez" />
              <div>
                <p className="font-[family-name:var(--font-display)] font-bold text-[var(--c-ink)]">
                  Catalina Álvarez
                </p>
                <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                  UK-2026-JUL-LONDON · 8/11 pasos
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-1">
              {SHEET_ACTIONS.map((a) => (
                <li key={a.label}>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex min-h-[var(--tap)] w-full items-center gap-3 rounded-[var(--r-md)] px-3 text-left font-medium text-[var(--c-ink)] transition-colors hover:bg-[var(--c-brand-50)] hover:text-[var(--c-brand)]"
                  >
                    <span aria-hidden>{a.icon}</span> {a.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-[var(--c-border)] pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex min-h-[var(--tap)] w-full items-center justify-center rounded-[var(--r-md)] font-semibold text-[var(--c-danger)] transition-colors hover:bg-[var(--c-danger-bg)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
