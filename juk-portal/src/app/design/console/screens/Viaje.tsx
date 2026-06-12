"use client";

import { useState } from "react";

import { Badge, Button, Card, CardHeader, Eyebrow, Field, Input, Mono, Select, Textarea } from "../ui";
import { IconCheck, IconExternal, IconPlus, IconUsers } from "../icons";

const DATA = [
  { label: "Estado", value: <Badge token="inscripcion_abierta">Inscripción abierta</Badge> },
  { label: "Fechas", value: (
    <span className="flex items-center gap-[var(--s-2)]">
      <Mono>04/07/2026</Mono>
      <span className="text-[var(--c-ink-4)]">→</span>
      <Mono>25/07/2026</Mono>
    </span>
  ) },
  { label: "Destino", value: "London School of English · Reino Unido" },
  { label: "Curso", value: "General English" },
  { label: "Origen", value: "Representante independiente" },
  { label: "Group Leaders", value: <Mono>2</Mono> },
  { label: "Cupo", value: <Mono>0/24</Mono> },
  { label: "Cupo mínimo", value: <Mono>5</Mono> },
];

const LEADERS = [
  { nom: "Sofía Méndez", rol: "Principal", police: "aprobado", policeLabel: "Aprobado", vto: "18/05/2027" },
  { nom: "Diego Pereyra", rol: "Acompañante", police: "en_tramite", policeLabel: "En trámite", vto: "—" },
];

type Step = {
  n: string;
  key: string;
  label: string;
  estado: string;
  estadoLabel: string;
  note?: string;
};

const STEPS: Step[] = [
  { n: "01", key: "pasajes", label: "Pasajes", estado: "en_progreso", estadoLabel: "En progreso" },
  { n: "02", key: "excursiones", label: "Excursiones", estado: "pendiente", estadoLabel: "Pendiente" },
  { n: "03", key: "transfers", label: "Transfers", estado: "bloqueado", estadoLabel: "Bloqueado", note: "Requiere Pasajes" },
  { n: "04", key: "tarjetas", label: "Tarjetas de transporte", estado: "pendiente", estadoLabel: "Pendiente" },
  { n: "05", key: "police", label: "Police Checks", estado: "completado", estadoLabel: "Completo" },
];

function DataGrid() {
  return (
    <Card>
      <CardHeader title="Datos del viaje" meta="8 campos" />
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-[var(--r-lg)] bg-[var(--c-border)] lg:grid-cols-4">
        {DATA.map((d) => (
          <div key={d.label} className="flex flex-col gap-[var(--s-2)] bg-[var(--c-surface)] px-[var(--s-4)] py-[var(--s-4)]">
            <dt>
              <Eyebrow>{d.label}</Eyebrow>
            </dt>
            <dd className="text-[length:var(--t-base)] font-[number:var(--fw-medium)] leading-[var(--lh-snug)] text-[var(--c-ink)]">
              {d.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function AsignadosPanel() {
  return (
    <Card>
      <CardHeader
        title="Alumnos asignados"
        meta="0 de 24"
        action={
          <span className="flex items-center gap-[var(--s-2)]">
            <div className="w-[200px]">
              <Select aria-label="Seleccionar alumno" defaultValue="">
                <option value="" disabled>
                  Elegí un alumno…
                </option>
                <option>Acosta, Martina</option>
                <option>Benítez, Joaquín</option>
                <option>Castro, Valentina</option>
              </Select>
            </div>
            <Button variant="primary" size="sm">
              <IconPlus className="size-[14px]" />
              Asignar
            </Button>
          </span>
        }
      />
      <div className="flex flex-col items-center justify-center gap-[var(--s-3)] px-[var(--s-5)] py-[var(--s-10)] text-center">
        <span className="grid size-[40px] place-items-center rounded-[var(--r-full)] bg-[var(--c-surface-3)] text-[var(--c-ink-4)]">
          <IconUsers className="size-[18px]" />
        </span>
        <p className="text-[length:var(--t-base)] font-[number:var(--fw-medium)] text-[var(--c-ink-2)]">
          Todavía no hay alumnos asignados
        </p>
        <p className="max-w-[320px] text-[length:var(--t-sm)] text-[var(--c-ink-3)]">
          Asigná alumnos desde el selector de arriba. El cupo se actualiza en tiempo real.
        </p>
      </div>
    </Card>
  );
}

function LeadersPanel() {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Group Leaders del viaje" meta="2 asignados" />
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--c-border)] bg-[var(--c-surface-2)]">
            {["Group Leader", "Police check", "Vence", ""].map((h, i) => (
              <th
                key={h || "x"}
                className={`px-[var(--s-5)] py-[var(--s-2)] text-[length:var(--t-2xs)] font-[number:var(--fw-semibold)] uppercase tracking-[var(--ls-caps)] text-[var(--c-ink-3)] ${i === 3 ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LEADERS.map((l) => (
            <tr key={l.nom} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-surface-3)]">
              <td className="px-[var(--s-5)] py-[var(--s-3)]">
                <span className="flex items-center gap-[var(--s-2)]">
                  <span className="text-[length:var(--t-base)] font-[number:var(--fw-medium)] text-[var(--c-ink)]">{l.nom}</span>
                  {l.rol === "Principal" && (
                    <span className="rounded-[var(--r-xs)] border border-[var(--c-brand-soft)] bg-[var(--c-brand-soft)] px-[var(--s-2)] py-px text-[length:var(--t-2xs)] font-[number:var(--fw-semibold)] uppercase tracking-[var(--ls-wide)] text-[var(--c-brand-soft-ink)]">
                      Principal
                    </span>
                  )}
                </span>
              </td>
              <td className="px-[var(--s-5)] py-[var(--s-3)]">
                <Badge token={l.police}>{l.policeLabel}</Badge>
              </td>
              <td className="px-[var(--s-5)] py-[var(--s-3)]">
                <Mono className="text-[length:var(--t-sm)] text-[var(--c-ink-2)]">{l.vto}</Mono>
              </td>
              <td className="px-[var(--s-5)] py-[var(--s-3)] text-right">
                <button className="text-[length:var(--t-sm)] font-[number:var(--fw-medium)] text-[var(--c-brand)] hover:text-[var(--c-brand-hover)]">
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function StepEditor() {
  return (
    <div className="border-t border-[var(--c-border)] bg-[var(--c-surface-2)] p-[var(--s-5)]">
      <div className="mb-[var(--s-4)] flex items-center justify-between">
        <div className="flex items-center gap-[var(--s-3)]">
          <Mono className="text-[length:var(--t-sm)] font-[number:var(--fw-semibold)] text-[var(--c-brand)]">01</Mono>
          <h4 className="text-[length:var(--t-md)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Pasajes
          </h4>
          <Badge token="en_progreso">En progreso</Badge>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-[var(--s-4)] sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Sub-estado" htmlFor="s-sub">
          <Select id="s-sub" defaultValue="reservado">
            <option value="cotizando">Cotizando</option>
            <option value="reservado">Reservado · sin emitir</option>
            <option value="emitido">Emitido</option>
          </Select>
        </Field>
        <Field label="Aerolínea" htmlFor="s-aero">
          <Input id="s-aero" defaultValue="British Airways" placeholder="Aerolínea" />
        </Field>
        <Field label="N° de vuelo" htmlFor="s-vuelo">
          <Input id="s-vuelo" mono defaultValue="BA246" placeholder="XX000" />
        </Field>
        <Field label="E-ticket URL" htmlFor="s-eticket" hint="Link al PDF o portal de la aerolínea." className="sm:col-span-2">
          <div className="relative">
            <Input id="s-eticket" mono className="pr-[36px]" placeholder="https://…" defaultValue="https://book.ba.com/eticket/JK29F1" />
            <IconExternal className="pointer-events-none absolute right-[var(--s-3)] top-1/2 size-[14px] -translate-y-1/2 text-[var(--c-ink-4)]" />
          </div>
        </Field>
        <Field label="Fecha de ida" htmlFor="s-ida">
          <Input id="s-ida" mono defaultValue="04/07/2026" placeholder="DD/MM/AAAA" />
        </Field>
        <Field label="Fecha de vuelta" htmlFor="s-vuelta">
          <Input id="s-vuelta" mono defaultValue="25/07/2026" placeholder="DD/MM/AAAA" />
        </Field>
        <Field label="Hora estimada de salida" htmlFor="s-hora">
          <Input id="s-hora" mono defaultValue="21:40" placeholder="00:00" />
        </Field>
        <Field label="Notas" htmlFor="s-notas" className="sm:col-span-2 lg:col-span-3">
          <Textarea id="s-notas" placeholder="Detalles de escalas, equipaje, requerimientos especiales…" defaultValue="Escala en Madrid (1h 50m). Equipaje 23kg incluido." />
        </Field>
      </div>
      <div className="mt-[var(--s-5)] flex items-center justify-between border-t border-[var(--c-border)] pt-[var(--s-4)]">
        <span className="flex items-center gap-[var(--s-2)] text-[length:var(--t-xs)] text-[var(--c-ink-3)]">
          <IconCheck className="size-[14px] text-[var(--c-success)]" />
          Última edición hace 2 días por Agustín
        </span>
        <div className="flex gap-[var(--s-2)]">
          <Button variant="ghost" size="md">
            Marcar como completo
          </Button>
          <Button variant="primary" size="md">
            Guardar datos
          </Button>
        </div>
      </div>
    </div>
  );
}

function SeguimientoPanel() {
  const [active, setActive] = useState("pasajes");
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Seguimiento del viaje · M7" meta="1 de 5 completados" />
      <div className="grid grid-cols-2 gap-px bg-[var(--c-border)] sm:grid-cols-3 lg:grid-cols-5">
        {STEPS.map((s) => {
          const isActive = s.key === active;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`relative flex flex-col gap-[var(--s-3)] bg-[var(--c-surface)] p-[var(--s-4)] text-left transition-colors hover:bg-[var(--c-surface-3)] ${
                isActive ? "bg-[var(--c-surface)]" : ""
              }`}
            >
              {isActive && (
                <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-[var(--c-brand)]" />
              )}
              <div className="flex items-center justify-between">
                <Mono
                  className={`text-[length:var(--t-md)] font-[number:var(--fw-semibold)] ${isActive ? "text-[var(--c-brand)]" : "text-[var(--c-ink-4)]"}`}
                >
                  {s.n}
                </Mono>
                <span
                  aria-hidden
                  className="size-[8px] rounded-full"
                  style={{ backgroundColor: `var(--badge-${s.estado}-dot)` }}
                />
              </div>
              <div className="flex flex-col gap-[var(--s-2)]">
                <span className="text-[length:var(--t-sm)] font-[number:var(--fw-medium)] leading-[var(--lh-snug)] text-[var(--c-ink)]">
                  {s.label}
                </span>
                <Badge token={s.estado}>{s.estadoLabel}</Badge>
                {s.note && (
                  <span className="text-[length:var(--t-2xs)] font-[number:var(--fw-medium)] text-[var(--c-danger-ink)]">
                    {s.note}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <StepEditor />
    </Card>
  );
}

export function Viaje() {
  return (
    <section id="viaje" className="scroll-mt-[120px]">
      <div className="mb-[var(--s-4)] flex items-center gap-[var(--s-2)]">
        <Eyebrow>Detalle de viaje</Eyebrow>
        <span className="h-px flex-1 bg-[var(--c-border)]" />
      </div>

      {/* header del viaje */}
      <div className="flex flex-wrap items-start justify-between gap-[var(--s-4)]">
        <div>
          <div className="flex items-center gap-[var(--s-3)]">
            <h2 className="font-[var(--font-display)] text-[length:var(--t-2xl)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Londres en Julio · Campus
            </h2>
          </div>
          <Mono className="mt-[var(--s-2)] inline-block rounded-[var(--r-sm)] bg-[var(--c-surface-3)] px-[var(--s-2)] py-px text-[length:var(--t-sm)] font-[number:var(--fw-medium)] text-[var(--c-ink-2)]">
            UK-2026-JUL-LONDON
          </Mono>
        </div>
        <Button variant="secondary" size="md">
          Editar viaje
        </Button>
      </div>

      <div className="mt-[var(--s-5)] flex flex-col gap-[var(--s-5)]">
        <DataGrid />
        <div className="grid grid-cols-1 gap-[var(--s-5)] xl:grid-cols-2">
          <AsignadosPanel />
          <LeadersPanel />
        </div>
        <SeguimientoPanel />
      </div>
    </section>
  );
}
