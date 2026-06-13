"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge, Button, MoraBadge, useConfirm, useToast } from "@/components/ui";
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

export function PagosTable({ rows }: { rows: PagoRow[] }) {
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
      <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] p-10 text-center">
        <p className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
          No hay cuotas para estos filtros
        </p>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Los planes de cuotas se crean desde la ficha del alumno.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)]">
      <table className="w-full text-[length:var(--t-small)]">
        <thead>
          <tr className="border-b border-[var(--c-border)] text-left">
            {["Alumno", "Viaje", "Cuota", "Monto", "Vencimiento", "Estado", "Canal", ""].map(
              (h, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--c-border)]">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-[var(--c-surface-2)]">
              <td className="px-5 py-3">
                <Link
                  href={`/alumnos/${r.alumnoDni}`}
                  className="font-semibold text-[var(--c-ink)] hover:text-[var(--c-brand)] hover:underline"
                >
                  {r.alumnoApellido}, {r.alumnoNombre}
                </Link>
              </td>
              <td className="px-5 py-3">
                <Link
                  href={`/viajes/${r.viajeCodigo}`}
                  className="font-mono text-[length:var(--t-mono)] font-bold text-[var(--c-brand)] hover:underline"
                >
                  {r.viajeCodigo}
                </Link>
              </td>
              <td className="px-5 py-3 text-[var(--c-ink-muted)]">
                {r.numero}
                {r.esUltimaCuota === 1 && (
                  <span className="ml-1 text-[var(--c-ink-subtle)]">(última)</span>
                )}
              </td>
              <td className="px-5 py-3 font-mono text-[length:var(--t-mono)] font-semibold text-[var(--c-ink)]">
                {formatMonto(r.monto, r.moneda as Moneda)}
              </td>
              <td className="px-5 py-3 text-[var(--c-ink-muted)]">
                {formatFecha(r.fechaVencimiento)}
              </td>
              <td className="px-5 py-3">
                {r.estadoEfectivo === "pagada" ? (
                  <Badge tone="success">Pagada</Badge>
                ) : r.estadoEfectivo === "vencida" ? (
                  <MoraBadge days={r.diasMora} />
                ) : (
                  <Badge tone="neutral">Pendiente</Badge>
                )}
              </td>
              <td className="px-5 py-3 text-[var(--c-ink-muted)]">{CANAL_LABELS[r.canal]}</td>
              <td className="px-5 py-3 text-right">
                {r.estadoEfectivo !== "pagada" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => registrarPago(r)}
                  >
                    Registrar pago
                  </Button>
                ) : (
                  <span className="text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
                    {r.fechaPagoEfectivo ? formatFecha(r.fechaPagoEfectivo) : "—"}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
