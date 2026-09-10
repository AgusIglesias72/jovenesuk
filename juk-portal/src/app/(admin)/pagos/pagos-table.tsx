"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

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
  useConfirm,
  useToast,
} from "@/components/ui";
import { formatMonto, type Moneda } from "@/lib/domain/cuotas";
import { formatFecha } from "@/lib/utils/date";

import { registrarPagoDesdePagosAction } from "./actions";

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
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  async function registrarPago(row: PagoRow) {
    const { confirmado } = await confirm({
      titulo: "¿Registrar el pago?",
      detalle: `${row.alumnoApellido}, ${row.alumnoNombre} — cuota ${row.numero} de ${formatMonto(row.monto, row.moneda as Moneda)}. Queda asentada como pagada hoy.`,
      tone: "brand",
      confirmLabel: "Registrar pago",
    });
    if (!confirmado) return;
    startTransition(async () => {
      try {
        let res = await registrarPagoDesdePagosAction({ cuotaId: row.id });
        // Pago fuera de orden (cuotas anteriores impagas): confirmable.
        if (!res.ok && res.requiereConfirmacion) {
          const { confirmado: igual } = await confirm({
            titulo: "Pago fuera de orden",
            detalle: res.error,
            tone: "warning",
            confirmLabel: "Registrar igual",
          });
          if (!igual) return;
          res = await registrarPagoDesdePagosAction({ cuotaId: row.id }, { confirmar: true });
        }
        if (!res.ok) {
          toast.error(res.error);
        } else {
          toast.success("Pago registrado");
          router.refresh();
        }
      } catch {
        toast.error("No pudimos registrar el pago. Probá de nuevo.");
      }
    });
  }

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
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => registrarPago(r)}
                    >
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
  );
}
