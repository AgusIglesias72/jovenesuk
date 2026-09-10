"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Badge,
  Button,
  DateCell,
  DateInput,
  Field,
  Input,
  MoraBadge,
  Select,
  SectionTitle,
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
import {
  MONEDAS,
  diasDeMora,
  estaVencida,
  formatMonto,
  proximaCuotaPendiente,
  totalPagado,
  totalPlan,
  type CuotaLike,
  type Moneda,
} from "@/lib/domain/cuotas";
import { aplicaUltimoPagoPresencial, type ViajeOrigen } from "@/lib/domain/viajes";
import { formatFecha } from "@/lib/utils/date";

import {
  confirmarUltimoPagoPresencialAction,
  crearPlanCuotasAction,
  registrarPagoCuotaAction,
} from "./cuotas-actions";

export type CuotaView = CuotaLike & {
  id: string;
  moneda: Moneda;
  observaciones: string | null;
};

function BadgeCuota({ cuota, hoy }: { cuota: CuotaView; hoy: Date }) {
  if (cuota.estado === "pagada") return <Badge tone="success">Pagada</Badge>;
  if (estaVencida(cuota, hoy)) return <MoraBadge days={diasDeMora(cuota, hoy)} />;
  return <Badge tone="neutral">Pendiente</Badge>;
}

function ResumenCard({
  label,
  valor,
  sub,
  tone,
}: {
  label: string;
  valor: string;
  sub?: string;
  tone?: "success" | "berry";
}) {
  const color =
    tone === "success"
      ? "text-[var(--c-success)]"
      : tone === "berry"
        ? "text-[var(--c-berry)]"
        : "text-[var(--c-ink)]";
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-soft)]">
      <div className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-extrabold tabular-nums ${color}`}>{valor}</div>
      {sub && <div className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{sub}</div>}
    </div>
  );
}

export function CuotasPanel({
  alumnoId,
  asignacionId,
  origenViaje,
  cuotas,
}: {
  alumnoId: string;
  asignacionId: string;
  origenViaje: ViajeOrigen;
  cuotas: CuotaView[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [isPending, startTransition] = useTransition();
  const [plan, setPlan] = useState({ cantidadCuotas: "5", montoPorCuota: "", moneda: "USD", primerVencimiento: "" });

  const hoy = new Date();
  const moneda = cuotas[0]?.moneda ?? (plan.moneda as Moneda);
  const fe = (k: string) => fieldErrors[k]?.[0];

  function crearPlan(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setFieldErrors({});
      try {
        const r = await crearPlanCuotasAction({ asignacionId, ...plan });
        if (r.ok) {
          toast.success("Plan de cuotas creado");
          router.refresh();
        } else {
          toast.error(r.error);
          if (r.fieldErrors) setFieldErrors(r.fieldErrors);
        }
      } catch {
        toast.error("No pudimos crear el plan. Reintentá en unos segundos.");
      }
    });
  }

  function pagar(cuotaId: string) {
    startTransition(async () => {
      try {
        let r = await registrarPagoCuotaAction({ cuotaId });
        // Pago fuera de orden (cuotas anteriores impagas): confirmable.
        if (!r.ok && r.requiereConfirmacion) {
          const { confirmado } = await confirm({
            titulo: "Pago fuera de orden",
            detalle: r.error,
            tone: "warning",
            confirmLabel: "Registrar igual",
          });
          if (!confirmado) return;
          r = await registrarPagoCuotaAction({ cuotaId }, { confirmar: true });
        }
        if (r.ok) {
          toast.success("Pago registrado");
          router.refresh();
        } else toast.error(r.error);
      } catch {
        toast.error("No pudimos registrar el pago. Reintentá en unos segundos.");
      }
    });
  }

  async function confirmarB2() {
    const { confirmado } = await confirm({
      titulo: "¿Confirmar el pago presencial?",
      detalle: `La última cuota (n° ${ultima?.numero}) queda marcada como pagada, cobrada presencialmente en JUK.`,
      tone: "brand",
      confirmLabel: "Sí, confirmar pago",
    });
    if (!confirmado) return;
    startTransition(async () => {
      try {
        const r = await confirmarUltimoPagoPresencialAction(asignacionId);
        if (r.ok) {
          toast.success("Pago presencial confirmado");
          router.refresh();
        } else toast.error(r.error);
      } catch {
        toast.error("No pudimos confirmar el pago presencial. Reintentá en unos segundos.");
      }
    });
  }

  const proxima = proximaCuotaPendiente(cuotas);
  const vencidas = cuotas.filter((c) => estaVencida(c, hoy));
  const ultima = cuotas.find((c) => c.esUltimaCuota === 1);
  const b2Aplica = aplicaUltimoPagoPresencial(origenViaje);
  const b2Pendiente = b2Aplica && !!ultima && ultima.estado !== "pagada";

  return (
    <section className="mt-6" data-cuotas-panel>
      <SectionTitle as="h3" className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--r-xs)] bg-[var(--c-honey-soft)] font-mono text-[length:var(--t-label)] font-bold text-[var(--c-warning)]"
        >
          $
        </span>
        Plan de cuotas (B1{b2Aplica ? " / B2" : ""})
      </SectionTitle>

      {cuotas.length === 0 ? (
        <form
          onSubmit={crearPlan}
          className="rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] p-5"
        >
          <p className="mb-4 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            Sin plan de pagos todavía. Definí las cuotas mensuales acordadas
            {b2Aplica ? " — la última se cobra presencial en JUK (B2)." : " — todas van vía agencia."}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Cuotas" required error={fe("cantidadCuotas")}>
              <Input
                type="number"
                min={1}
                max={24}
                value={plan.cantidadCuotas}
                invalid={!!fe("cantidadCuotas")}
                onChange={(e) => setPlan((p) => ({ ...p, cantidadCuotas: e.target.value }))}
              />
            </Field>
            <Field label="Monto por cuota" required error={fe("montoPorCuota")}>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={plan.montoPorCuota}
                invalid={!!fe("montoPorCuota")}
                onChange={(e) => setPlan((p) => ({ ...p, montoPorCuota: e.target.value }))}
                placeholder="750"
              />
            </Field>
            <Field label="Moneda" required>
              <Select
                value={plan.moneda}
                onChange={(e) => setPlan((p) => ({ ...p, moneda: e.target.value }))}
              >
                {MONEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Primer vencimiento" required error={fe("primerVencimiento")}>
              <DateInput
                value={plan.primerVencimiento}
                invalid={!!fe("primerVencimiento")}
                onChange={(e) => setPlan((p) => ({ ...p, primerVencimiento: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Creando…" : "Crear plan de cuotas"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResumenCard
              label="Total del plan"
              valor={formatMonto(totalPlan(cuotas), moneda)}
              sub={`${cuotas.length} cuotas mensuales`}
            />
            <ResumenCard
              label="Pagado"
              valor={formatMonto(totalPagado(cuotas), moneda)}
              sub={`${cuotas.filter((c) => c.estado === "pagada").length} cuotas acreditadas`}
              tone="success"
            />
            <ResumenCard
              label="Próximo vencimiento"
              valor={proxima ? formatFecha(proxima.fechaVencimiento) : "—"}
              sub={proxima ? `cuota ${proxima.numero} · ${formatMonto(Number(proxima.monto), moneda)}` : "Plan saldado"}
            />
            <ResumenCard
              label="Vencidas"
              valor={String(vencidas.length)}
              sub={
                vencidas[0]
                  ? `cuota ${vencidas[0].numero} · hace ${diasDeMora(vencidas[0], hoy)} días`
                  : "Sin mora"
              }
              tone={vencidas.length ? "berry" : undefined}
            />
          </div>

          {b2Pendiente && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--c-honey)] bg-[var(--c-honey-soft)] px-4 py-3">
              <p className="text-[length:var(--t-small)] font-medium text-[var(--c-ink)]">
                <strong>B2:</strong> la última cuota (n° {ultima?.numero}) se cobra{" "}
                <strong>presencialmente en JUK</strong>.
              </p>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={confirmarB2}
                className="w-full sm:w-auto"
              >
                Confirmar pago presencial
              </Button>
            </div>
          )}

          <TableWrap>
            <Table responsive className="sm:min-w-[600px]">
              <THead>
                <TR>
                  <TH>N°</TH>
                  <TH>Vence</TH>
                  <TH>Monto</TH>
                  <TH>Canal</TH>
                  <TH>Estado</TH>
                  <TH className="w-[168px]">
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {cuotas.map((c) => (
                  <TR key={c.id}>
                    <TD label="N°">
                      <span className="font-mono font-bold tabular-nums text-[var(--c-ink)]">
                        {c.numero}
                      </span>
                      {c.esUltimaCuota === 1 && (
                        <span className="ml-1.5 text-[length:var(--t-label)] font-bold uppercase text-[var(--c-warning)]">
                          última
                        </span>
                      )}
                    </TD>
                    <TD label="Vence">
                      <DateCell date={formatFecha(c.fechaVencimiento)} />
                    </TD>
                    <TD label="Monto">
                      <span className="font-mono tabular-nums text-[var(--c-ink)]">
                        {formatMonto(Number(c.monto), c.moneda)}
                      </span>
                    </TD>
                    <TD label="Canal">
                      <span className="text-[var(--c-ink-muted)]">
                        {c.canal === "presencial" ? "Presencial JUK" : "Vía agencia"}
                      </span>
                    </TD>
                    <TD label="Estado">
                      <BadgeCuota cuota={c} hoy={hoy} />
                      {c.estado === "pagada" && c.fechaPagoEfectivo && (
                        <span className="block text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
                          el {formatFecha(c.fechaPagoEfectivo)}
                        </span>
                      )}
                    </TD>
                    <TD className="max-sm:justify-end">
                      <div className="flex justify-end">
                        {c.estado !== "pagada" &&
                          !(c.esUltimaCuota === 1 && c.canal === "presencial") && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isPending}
                              onClick={() => pagar(c.id)}
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
        </>
      )}
    </section>
  );
}
