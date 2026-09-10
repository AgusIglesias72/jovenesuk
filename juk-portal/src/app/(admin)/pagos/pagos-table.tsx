"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Badge,
  Button,
  DateCell,
  EmptyState,
  LinkButton,
  MoraBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
} from "@/components/ui";
import { formatMonto, type Moneda } from "@/lib/domain/cuotas";
import { formatFecha } from "@/lib/utils/date";

import { registrarPagoDesdePagosAction } from "./actions";
import { RegistrarPagoDialog } from "./registrar-pago-dialog";

export type PagoRow = {
  id: string;
  numero: number;
  esUltimaCuota: number;
  monto: string;
  moneda: string;
  estadoEfectivo: "pagada" | "vencida" | "pendiente";
  diasMora: number;
  canal: "agencia" | "presencial";
  fechaVencimiento: Date;
  fechaPagoEfectivo: Date | null;
  /** Opcional hasta que `listCuotasGlobal` la seleccione. */
  observaciones?: string | null;
  alumnoId: string;
  alumnoDni: string;
  alumnoNombre: string;
  alumnoApellido: string;
  viajeId: string;
  viajeCodigo: string;
};

const CANAL_LABELS = { agencia: "Vía agencia", presencial: "Presencial JUK" } as const;

export function PagosTable({
  rows,
  hayFiltros = false,
}: {
  rows: PagoRow[];
  hayFiltros?: boolean;
}) {
  const [pagando, setPagando] = useState<PagoRow | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="💸"
        title={hayFiltros ? "Sin resultados para estos filtros" : "Todavía no hay cuotas"}
        action={
          hayFiltros ? (
            <LinkButton variant="secondary" href="/pagos">
              Limpiar filtros
            </LinkButton>
          ) : undefined
        }
      >
        Los planes de cuotas se crean desde la ficha del alumno.
      </EmptyState>
    );
  }

  return (
    <>
      <TableWrap>
        <Table responsive className="sm:min-w-[680px]">
          <THead>
            <TR>
              <TH>Alumno</TH>
              <TH>Viaje</TH>
              <TH>Monto</TH>
              <TH>Vencimiento</TH>
              <TH>Estado</TH>
              <TH className="w-[168px]">
                <span className="sr-only">Acciones</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD label="Alumno">
                  <Link
                    href={`/alumnos/${r.alumnoDni}`}
                    className="font-semibold text-[var(--c-ink)] hover:text-[var(--c-brand)] hover:underline"
                  >
                    {r.alumnoApellido}, {r.alumnoNombre}
                  </Link>
                </TD>
                <TD label="Viaje">
                  <Link
                    href={`/viajes/${r.viajeCodigo}`}
                    className="font-mono text-[length:var(--t-mono)] font-bold text-[var(--c-brand)] hover:underline"
                  >
                    {r.viajeCodigo}
                  </Link>
                </TD>
                <TD label="Monto">
                  <span className="block font-mono text-[length:var(--t-mono)] font-semibold tabular-nums text-[var(--c-ink)]">
                    {formatMonto(r.monto, r.moneda as Moneda)}
                  </span>
                  <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                    cuota {r.numero}
                    {r.esUltimaCuota === 1 && (
                      <span className="ml-1 text-[var(--c-ink-subtle)]">(última)</span>
                    )}
                  </span>
                </TD>
                <TD label="Vencimiento">
                  <DateCell date={formatFecha(r.fechaVencimiento)} />
                  <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                    {CANAL_LABELS[r.canal]}
                  </span>
                </TD>
                <TD label="Estado">
                  {r.estadoEfectivo === "pagada" ? (
                    <>
                      <Badge tone="success">Pagada</Badge>
                      {r.fechaPagoEfectivo && (
                        <span className="block text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
                          el {formatFecha(r.fechaPagoEfectivo)}
                        </span>
                      )}
                      {r.observaciones && (
                        <span className="block max-w-[28ch] truncate text-[length:var(--t-label)] text-[var(--c-ink-muted)]" title={r.observaciones}>
                          {r.observaciones}
                        </span>
                      )}
                    </>
                  ) : r.estadoEfectivo === "vencida" ? (
                    <MoraBadge days={r.diasMora} />
                  ) : (
                    <Badge tone="neutral">Pendiente</Badge>
                  )}
                </TD>
                <TD className="max-sm:justify-end">
                  <div className="flex justify-end">
                    {r.estadoEfectivo !== "pagada" && (
                      <Button variant="secondary" size="sm" onClick={() => setPagando(r)}>
                        Registrar pago
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      {pagando && (
        <RegistrarPagoDialog
          key={pagando.id}
          titulo="Registrar pago"
          detalle={`${pagando.alumnoApellido}, ${pagando.alumnoNombre} · ${pagando.viajeCodigo} — cuota ${pagando.numero} de ${formatMonto(pagando.monto, pagando.moneda as Moneda)}.`}
          registrar={(datos, opts) =>
            registrarPagoDesdePagosAction({ cuotaId: pagando.id, ...datos }, opts)
          }
          onCerrar={() => setPagando(null)}
        />
      )}
    </>
  );
}
