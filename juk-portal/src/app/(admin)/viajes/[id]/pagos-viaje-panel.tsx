"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Badge,
  EmptyState,
  LinkButton,
  MoraBadge,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
} from "@/components/ui";
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
          <Select
            value={orden}
            aria-label="Ordenar los pagos del viaje"
            onChange={(e) => setOrden(e.target.value as OrdenResumen)}
          >
            {ORDEN_RESUMEN.map((o) => (
              <option key={o} value={o}>
                Ordenar por {ORDEN_RESUMEN_LABELS[o].toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState compact className="mt-5" title="El viaje no tiene alumnos asignados.">
          Asigná alumnos desde la sección “Alumnos asignados” y su plan de pagos aparece acá.
        </EmptyState>
      ) : (
        <div className="mt-4">
          <TableWrap>
            <Table responsive>
              <THead>
                <TR>
                  <TH>Alumno</TH>
                  <TH>Cuotas</TH>
                  <TH>Abonado</TH>
                  <TH>Saldo</TH>
                  <TH>Mora</TH>
                  <TH className="w-[112px]">
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {ordenadas.map((r) => (
                  <TR key={r.asignacionId}>
                    <TD label="Alumno">
                      <Link
                        href={`/alumnos/${r.alumnoDni}`}
                        className="font-semibold text-[var(--c-ink)] hover:text-[var(--c-brand)] hover:underline"
                      >
                        {r.apellido}, {r.nombre}
                      </Link>
                    </TD>
                    {r.tienePlan ? (
                      <>
                        <TD label="Cuotas">
                          <span className="tabular-nums text-[var(--c-ink-muted)]">
                            {r.cuotasPagadas} / {r.cuotasTotales}
                          </span>
                        </TD>
                        <TD label="Abonado">
                          <span className="font-mono text-[length:var(--t-mono)] tabular-nums text-[var(--c-ink)]">
                            {formatMonto(r.abonado, r.moneda as Moneda)}
                          </span>
                        </TD>
                        <TD label="Saldo">
                          <span className="font-mono text-[length:var(--t-mono)] font-semibold tabular-nums text-[var(--c-ink)]">
                            {r.saldo > 0 ? formatMonto(r.saldo, r.moneda as Moneda) : "—"}
                          </span>
                        </TD>
                        <TD label="Mora">
                          {r.maxDiasMora > 0 ? (
                            <MoraBadge days={r.maxDiasMora} />
                          ) : r.saldo === 0 ? (
                            <Badge tone="success">Saldado</Badge>
                          ) : (
                            <Badge tone="neutral">Al día</Badge>
                          )}
                        </TD>
                      </>
                    ) : (
                      <TD label="Plan" colSpan={4}>
                        <span className="text-[var(--c-ink-subtle)]">Sin plan de cuotas</span>
                      </TD>
                    )}
                    <TD className="max-sm:justify-end">
                      <div className="flex justify-end">
                        <LinkButton variant="ghost" size="sm" href={`/alumnos/${r.alumnoDni}`}>
                          Ver pagos
                        </LinkButton>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </div>
      )}
    </section>
  );
}
