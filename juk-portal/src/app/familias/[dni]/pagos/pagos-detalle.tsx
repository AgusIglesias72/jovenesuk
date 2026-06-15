"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { type Cuota } from "@/lib/db/schema/cuotas";
import {
  estadoEfectivoCuota,
  estaVencida,
  formatMonto,
  proximaCuotaPendiente,
  resumenPlan,
  type Moneda,
} from "@/lib/domain/cuotas";
import { formatFecha } from "@/lib/utils/date";

import { ProgresoBarra } from "../../_ui";

/**
 * Detalle de pagos del Portal de Familias. Por cada viaje muestra el resumen del
 * plan (cuotas, pagado, saldo, progreso), un filtro de cuotas (todas / pendientes
 * / pagadas / vencidas) y el detalle de cada cuota al expandirla (vencimiento,
 * fecha de pago, canal y comprobante/observación). Sólo lectura: los pagos los
 * registra JUK.
 */

type ViajePlan = {
  asignacionId: string;
  viajeNombre: string;
  viajeCodigo: string;
  cuotas: Cuota[];
};

type Tone = "neutral" | "info" | "success" | "danger";

const FILTROS = [
  { key: "todas", label: "Todas" },
  { key: "pendientes", label: "Pendientes" },
  { key: "vencidas", label: "Vencidas" },
  { key: "pagadas", label: "Pagadas" },
] as const;

type Filtro = (typeof FILTROS)[number]["key"];

const ESTADO_CUOTA: Record<"pagada" | "vencida" | "pendiente", { label: string; tone: Tone }> = {
  pagada: { label: "Pagada", tone: "success" },
  vencida: { label: "Vencida", tone: "danger" },
  pendiente: { label: "Pendiente", tone: "neutral" },
};

const CANAL_LABEL: Record<Cuota["canal"], string> = {
  agencia: "Vía agencia",
  presencial: "Pago presencial",
};

export function PagosDetalle({ viajes }: { viajes: ViajePlan[] }) {
  const [activo, setActivo] = useState(0);
  const viaje = viajes[activo] ?? viajes[0]!;

  return (
    <div className="space-y-5">
      {viajes.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Viajes">
          {viajes.map((v, i) => {
            const sel = i === activo;
            return (
              <button
                key={v.asignacionId}
                type="button"
                role="tab"
                aria-selected={sel}
                onClick={() => setActivo(i)}
                className={`rounded-[var(--r-pill)] border px-4 py-2 text-[length:var(--t-small)] font-semibold transition-colors ${
                  sel
                    ? "border-[var(--c-brand)] bg-[var(--c-brand)] text-[var(--c-ink-onbrand)]"
                    : "border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink)] hover:border-[var(--c-brand-300)]"
                }`}
              >
                {v.viajeNombre}
              </button>
            );
          })}
        </div>
      )}

      <PlanDeViaje key={viaje.asignacionId} cuotas={viaje.cuotas} />
    </div>
  );
}

function PlanDeViaje({ cuotas }: { cuotas: Cuota[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const hoy = useMemo(() => new Date(), []);

  if (cuotas.length === 0) {
    return (
      <p className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 text-[length:var(--t-small)] text-[var(--c-ink-muted)] shadow-[shadow:var(--shadow-1)]">
        Todavía no hay un plan de pagos cargado. Te avisamos cuando esté listo.
      </p>
    );
  }

  const moneda = cuotas[0]!.moneda as Moneda;
  const resumen = resumenPlan(cuotas, hoy);
  const vencidas = cuotas.filter((c) => estaVencida(c, hoy)).length;
  const pendientes = resumen.cuotasTotales - resumen.cuotasPagadas - vencidas;
  const proxima = proximaCuotaPendiente(cuotas);

  const contadores: Record<Filtro, number> = {
    todas: cuotas.length,
    pendientes,
    vencidas,
    pagadas: resumen.cuotasPagadas,
  };

  const lista = cuotas.filter((c) => {
    const ef = estadoEfectivoCuota(c, hoy);
    if (filtro === "todas") return true;
    if (filtro === "pendientes") return ef === "pendiente";
    if (filtro === "vencidas") return ef === "vencida";
    return ef === "pagada";
  });

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric rotulo="Cuotas" valor={`${resumen.cuotasPagadas}/${resumen.cuotasTotales}`} sub="pagadas" />
          <Metric rotulo="Abonado" valor={formatMonto(resumen.abonado, moneda)} />
          <Metric
            rotulo="Saldo"
            valor={formatMonto(resumen.saldo, moneda)}
            tone={resumen.saldo > 0 ? "danger" : "success"}
          />
          <Metric
            rotulo="Vencidas"
            valor={String(vencidas)}
            tone={vencidas > 0 ? "danger" : "neutral"}
          />
        </div>

        <div className="mt-4 space-y-1.5">
          <ProgresoBarra
            valor={resumen.cuotasPagadas}
            total={resumen.cuotasTotales}
            tone={resumen.saldo === 0 ? "success" : "brand"}
          />
          <p className="text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
            {resumen.saldo === 0
              ? "Plan completo. ¡Gracias!"
              : proxima
                ? `Próxima cuota: n° ${proxima.numero} · vence ${formatFecha(proxima.fechaVencimiento)}`
                : "Sin cuotas pendientes."}
          </p>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar cuotas">
        {FILTROS.map((f) => {
          const sel = filtro === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={sel}
              onClick={() => setFiltro(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border px-3 py-1.5 text-[length:var(--t-small)] font-semibold transition-colors ${
                sel
                  ? "border-[var(--c-ink)] bg-[var(--c-ink)] text-[var(--c-surface)]"
                  : "border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink-muted)] hover:border-[var(--c-ink-subtle)]"
              }`}
            >
              {f.label}
              <span className={sel ? "opacity-80" : "opacity-60"}>{contadores[f.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <p className="rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface)] px-4 py-6 text-center text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          No hay cuotas en esta vista.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((cuota) => (
            <CuotaItem key={cuota.id} cuota={cuota} hoy={hoy} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CuotaItem({ cuota, hoy }: { cuota: Cuota; hoy: Date }) {
  const [abierto, setAbierto] = useState(false);
  const ef = estadoEfectivoCuota(cuota, hoy);
  const cfg = ESTADO_CUOTA[ef];

  return (
    <li className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)]">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--c-page)]"
      >
        <div className="min-w-0">
          <p className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
            Cuota {cuota.numero}
            {cuota.esUltimaCuota === 1 && (
              <span className="ml-2 align-middle text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                última
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            {formatMonto(cuota.monto, cuota.moneda)} · vence {formatFecha(cuota.fechaVencimiento)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={cfg.tone}>{cfg.label}</Badge>
          <span aria-hidden className="text-[var(--c-ink-subtle)]">
            {abierto ? "▴" : "▾"}
          </span>
        </div>
      </button>

      {abierto && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--c-border)] px-4 py-3 sm:grid-cols-3">
          <Detalle label="Monto" valor={formatMonto(cuota.monto, cuota.moneda)} />
          <Detalle label="Vencimiento" valor={formatFecha(cuota.fechaVencimiento)} />
          <Detalle label="Canal" valor={CANAL_LABEL[cuota.canal]} />
          <Detalle
            label="Comprobante"
            valor={
              cuota.fechaPagoEfectivo
                ? `Pago registrado el ${formatFecha(cuota.fechaPagoEfectivo)}`
                : "Sin registrar"
            }
            tone={cuota.fechaPagoEfectivo ? "success" : "muted"}
          />
          {cuota.observaciones && (
            <div className="col-span-full">
              <dt className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                Nota de JUK
              </dt>
              <dd className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink)]">
                {cuota.observaciones}
              </dd>
            </div>
          )}
        </dl>
      )}
    </li>
  );
}

function Metric({
  rotulo,
  valor,
  sub,
  tone = "neutral",
}: {
  rotulo: string;
  valor: string;
  sub?: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-[var(--c-danger)]"
      : tone === "success"
        ? "text-[var(--c-success)]"
        : "text-[var(--c-ink)]";
  return (
    <div>
      <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {rotulo}
      </p>
      <p className={`mt-1 font-display text-xl font-extrabold tabular-nums ${color}`}>{valor}</p>
      {sub && <p className="text-[length:var(--t-label)] text-[var(--c-ink-muted)]">{sub}</p>}
    </div>
  );
}

function Detalle({
  label,
  valor,
  tone = "ink",
}: {
  label: string;
  valor: string;
  tone?: "ink" | "muted" | "success";
}) {
  const color =
    tone === "success"
      ? "text-[var(--c-success)]"
      : tone === "muted"
        ? "text-[var(--c-ink-muted)]"
        : "text-[var(--c-ink)]";
  return (
    <div>
      <dt className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
      </dt>
      <dd className={`mt-0.5 text-[length:var(--t-small)] font-medium ${color}`}>{valor}</dd>
    </div>
  );
}
