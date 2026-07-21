"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge, MoraBadge, Select } from "@/components/ui";
import {
  formatMonto,
  ordenarResumenes,
  ORDEN_RESUMEN,
  ORDEN_RESUMEN_LABELS,
  type Moneda,
  type OrdenResumen,
} from "@/lib/domain/cuotas";

export type PagoAlumnoRow = {
  asignacionId: string;
  alumnoId: string;
  alumnoDni: string;
  nombre: string;
  apellido: string;
  moneda: string | null;
  tienePlan: boolean;
  cuotasPagadas: number;
  cuotasTotales: number;
  abonado: number;
  saldo: number;
  maxDiasMora: number;
};

/** US-24: pagos por alumno del viaje — pagas/total, abonado, saldo, mora. */
export function PagosViajePanel({ rows }: { rows: PagoAlumnoRow[] }) {
  const [orden, setOrden] = useState<OrdenResumen>("mora");
  const ordenadas = ordenarResumenes(rows, orden);

  return (
    <section
      data-pagos-viaje
      className="mt-8 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
            Pagos del viaje
          </h2>
          <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            Estado del plan de cuotas de cada alumno. El plan se gestiona desde la ficha.
          </p>
        </div>
        <div className="w-full sm:w-52">
          <Select value={orden} onChange={(e) => setOrden(e.target.value as OrdenResumen)}>
            {ORDEN_RESUMEN.map((o) => (
              <option key={o} value={o}>
                Ordenar por {ORDEN_RESUMEN_LABELS[o].toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          El viaje no tiene alumnos asignados.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[length:var(--t-small)]">
            <thead>
              <tr className="border-b border-[var(--c-border)] text-left">
                {["Alumno", "Cuotas", "Abonado", "Saldo", "Mora"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {ordenadas.map((r) => (
                <tr key={r.asignacionId} className="hover:bg-[var(--c-surface-2)]">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/alumnos/${r.alumnoDni}`}
                      className="font-semibold text-[var(--c-ink)] hover:text-[var(--c-brand)] hover:underline"
                    >
                      {r.apellido}, {r.nombre}
                    </Link>
                  </td>
                  {r.tienePlan ? (
                    <>
                      <td className="px-3 py-2.5 text-[var(--c-ink-muted)]">
                        {r.cuotasPagadas} / {r.cuotasTotales}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[length:var(--t-mono)] text-[var(--c-ink)]">
                        {formatMonto(r.abonado, r.moneda as Moneda)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[length:var(--t-mono)] font-semibold text-[var(--c-ink)]">
                        {r.saldo > 0 ? formatMonto(r.saldo, r.moneda as Moneda) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.maxDiasMora > 0 ? (
                          <MoraBadge days={r.maxDiasMora} />
                        ) : r.saldo === 0 ? (
                          <Badge tone="success">Saldado</Badge>
                        ) : (
                          <Badge tone="neutral">Al día</Badge>
                        )}
                      </td>
                    </>
                  ) : (
                    <td colSpan={4} className="px-3 py-2.5 text-[var(--c-ink-subtle)]">
                      Sin plan de cuotas
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
