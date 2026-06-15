/*
 * Sección "Pagos & cuotas" de la dirección STUDIO: el plan de cuotas (B1)
 * y el último pago presencial (B2) según el PRD. La moneda definitiva está
 * gated por CRIT-05 — acá se muestra GBP (convención del portal).
 */
import {
  Alert,
  Badge,
  Button,
  Card,
  Progress,
  Screen,
  ScreenHeading,
  SectionTitle,
  cn,
} from "./primitives";

type EstadoCuota = "pagada" | "pendiente" | "vencida";

const CUOTA_BADGE: Record<EstadoCuota, { label: string; fg: string; bg: string }> = {
  pagada: { label: "Pagada", fg: "var(--c-success)", bg: "var(--c-success-bg)" },
  pendiente: { label: "Pendiente", fg: "var(--c-neutral)", bg: "var(--c-neutral-bg)" },
  vencida: { label: "Vencida", fg: "var(--c-berry)", bg: "var(--c-berry-soft)" },
};

const CUOTAS: {
  n: number;
  vence: string;
  monto: string;
  medio: string;
  estado: EstadoCuota;
  pagadaEl?: string;
}[] = [
  { n: 1, vence: "10/03/2026", monto: "£750,00", medio: "Transferencia", estado: "pagada", pagadaEl: "08/03" },
  { n: 2, vence: "10/04/2026", monto: "£750,00", medio: "Transferencia", estado: "pagada", pagadaEl: "10/04" },
  { n: 3, vence: "10/05/2026", monto: "£750,00", medio: "Tarjeta", estado: "pagada", pagadaEl: "09/05" },
  { n: 4, vence: "10/06/2026", monto: "£750,00", medio: "Transferencia", estado: "vencida" },
  { n: 5, vence: "10/07/2026", monto: "£750,00", medio: "A definir", estado: "pendiente" },
  { n: 6, vence: "10/08/2026", monto: "£750,00", medio: "A definir", estado: "pendiente" },
];

const RESUMEN = [
  { label: "Total del plan", valor: "£4.500", sub: "6 cuotas mensuales" },
  { label: "Pagado", valor: "£2.250", sub: "3 cuotas acreditadas", tone: "var(--c-success)" },
  { label: "Próximo vencimiento", valor: "10/07", sub: "cuota 5 · £750" },
  { label: "Vencidas", valor: "1", sub: "cuota 4 · hace 2 días", tone: "var(--c-berry)" },
];

export function PagosScreen({ n = "05" }: { n?: string }) {
  return (
    <Screen id="pagos">
      <ScreenHeading
        n={n}
        title="Pagos & cuotas"
        sub="El plan de cuotas del alumno (paso B1 del M6) y el último pago presencial (B2)."
      />

      {/* header del plan */}
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-accent-600)]">
            Plan de cuotas · B1
          </p>
          <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
            Catalina Álvarez · <span className="font-[family-name:var(--font-mono)] text-[var(--c-brand)]">UK-2026-JUL-LONDON</span>
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Badge fg="var(--b-paso-en_progreso)" bg="var(--b-paso-en_progreso-bg)" dot>
            En progreso
          </Badge>
          <Button variant="accent" size="sm">
            Registrar pago
          </Button>
        </div>
      </Card>

      {/* resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {RESUMEN.map((r) => (
          <Card key={r.label} className="p-4">
            <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              {r.label}
            </p>
            <p
              className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold leading-none tracking-[var(--ls-tight)]"
              style={{ color: r.tone ?? "var(--c-ink)" }}
            >
              {r.valor}
            </p>
            <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{r.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Progress label="Avance del plan" value={50} warm />
      </div>

      {/* tabla de cuotas */}
      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[var(--c-surface-2)] text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
                <th className="px-5 py-3 font-bold">Cuota</th>
                <th className="px-5 py-3 font-bold">Vencimiento</th>
                <th className="px-5 py-3 font-bold">Monto</th>
                <th className="hidden px-5 py-3 font-bold sm:table-cell">Medio</th>
                <th className="px-5 py-3 font-bold">Estado</th>
                <th className="px-5 py-3 text-right font-bold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {CUOTAS.map((c, i) => {
                const b = CUOTA_BADGE[c.estado];
                return (
                  <tr
                    key={c.n}
                    className={cn(
                      i % 2 ? "bg-[var(--c-surface-3)]" : "bg-[var(--c-surface)]",
                      c.estado === "vencida" && "!bg-[var(--c-berry-soft)]/40",
                    )}
                  >
                    <td className="px-5 py-3">
                      <span className="grid h-8 w-8 place-items-center rounded-[var(--r-pill)] bg-[var(--c-surface-2)] font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
                        {c.n}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink)]">{c.vence}</p>
                      {c.pagadaEl && (
                        <p className="text-[11px] text-[var(--c-ink-subtle)]">acreditada el {c.pagadaEl}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
                      {c.monto}
                    </td>
                    <td className="hidden px-5 py-3 text-[length:var(--t-small)] text-[var(--c-ink-muted)] sm:table-cell">
                      {c.medio}
                    </td>
                    <td className="px-5 py-3">
                      <Badge fg={b.fg} bg={b.bg} dot>
                        {b.label}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.estado === "pagada" ? (
                        <Button variant="ghost" size="sm">
                          Comprobante
                        </Button>
                      ) : (
                        <Button variant={c.estado === "vencida" ? "primary" : "outline"} size="sm">
                          Registrar pago
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* B2 + recordatorios */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle kicker="Paso B2">Último pago presencial</SectionTitle>
          <div className="mt-3 flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--r-lg)] bg-[var(--c-honey-soft)] text-xl" aria-hidden>
              🤝
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                Se cobra en persona antes de la salida. Aplica solo cuando el alumno llegó por un{" "}
                <span className="font-semibold text-[var(--c-ink)]">representante independiente</span> —
                con colegio cliente o venta directa queda N/A automático.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Badge fg="var(--b-paso-pendiente)" bg="var(--b-paso-pendiente-bg)" dot>
                  Pendiente
                </Badge>
                <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink)]">
                  £350,00
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Alert
            tone="warning"
            title="Cuota 4 vencida hace 2 días"
            action={
              <Button variant="outline" size="sm">
                Avisar a la familia
              </Button>
            }
          >
            El recordatorio automático ya salió el 10/06. Segundo aviso programado para el 17/06.
          </Alert>
          <Alert tone="info" title="Moneda del plan: GBP">
            La definición multi-moneda (CRIT-05) sigue abierta en OPEN_DECISIONS — este diseño asume
            GBP para montos del viaje, como el resto del portal.
          </Alert>
        </div>
      </div>
    </Screen>
  );
}
