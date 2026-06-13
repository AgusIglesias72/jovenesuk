import { PageHeader, Pagination, StatCard } from "@/components/ui";
import { listCuotasGlobal, viajesConCuotas } from "@/lib/db/queries/pagos";
import { paginar } from "@/lib/utils/paginate";
import {
  diasDeMora,
  estadoEfectivoCuota,
  formatMonto,
  MONEDAS,
  type Moneda,
} from "@/lib/domain/cuotas";

import { PagosFilters } from "./pagos-filters";
import { PagosTable, type PagoRow } from "./pagos-table";

export const metadata = { title: "Pagos" };

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; viaje?: string; moneda?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const moneda = MONEDAS.includes(sp.moneda as Moneda) ? (sp.moneda as Moneda) : undefined;

  const [cuotas, viajes] = await Promise.all([
    listCuotasGlobal({ viajeId: sp.viaje, moneda }),
    viajesConCuotas(),
  ]);

  const hoy = new Date();
  const todas: PagoRow[] = cuotas.map((c) => ({
    id: c.id,
    numero: c.numero,
    esUltimaCuota: c.esUltimaCuota,
    monto: c.monto,
    moneda: c.moneda,
    estadoEfectivo: estadoEfectivoCuota(c, hoy),
    diasMora: diasDeMora(c, hoy),
    canal: c.canal,
    fechaVencimiento: c.fechaVencimiento,
    fechaPagoEfectivo: c.fechaPagoEfectivo,
    alumnoId: c.alumnoId,
    alumnoDni: c.alumnoDni,
    alumnoNombre: c.alumnoNombre,
    alumnoApellido: c.alumnoApellido,
    viajeId: c.viajeId,
    viajeCodigo: c.viajeCodigo,
  }));

  const filtradas =
    sp.estado === "pagada" || sp.estado === "vencida" || sp.estado === "pendiente"
      ? todas.filter((r) => r.estadoEfectivo === sp.estado)
      : todas;
  const { items: rows, total, page, pages } = paginar(filtradas, sp.page);

  // Resumen por moneda sobre el universo filtrado por viaje/moneda (no por estado).
  const resumen = MONEDAS.map((m) => {
    const deMoneda = todas.filter((r) => r.moneda === m);
    if (deMoneda.length === 0) return null;
    const sum = (fn: (r: PagoRow) => boolean) =>
      deMoneda.filter(fn).reduce((acc, r) => acc + Number(r.monto), 0);
    return {
      moneda: m,
      cobrado: sum((r) => r.estadoEfectivo === "pagada"),
      pendiente: sum((r) => r.estadoEfectivo !== "pagada"),
      enMora: sum((r) => r.estadoEfectivo === "vencida"),
    };
  }).filter((r) => r !== null);

  const cuotasEnMora = todas.filter((r) => r.estadoEfectivo === "vencida").length;

  return (
    <>
      <PageHeader
        title="Pagos"
        subtitle="Todas las cuotas de los viajes activos, con su mora al día de hoy."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resumen.map((r) => (
          <StatCard
            key={r.moneda}
            label={`Pendiente ${r.moneda}`}
            value={formatMonto(r.pendiente, r.moneda)}
            delta={`Cobrado: ${formatMonto(r.cobrado, r.moneda)}${
              r.enMora > 0 ? ` · En mora: ${formatMonto(r.enMora, r.moneda)}` : ""
            }`}
            deltaTone={r.enMora > 0 ? "down" : "neutral"}
          />
        ))}
        <StatCard
          label="Cuotas en mora"
          value={cuotasEnMora}
          tone={cuotasEnMora > 0 ? "critical" : "neutral"}
          delta={cuotasEnMora > 0 ? "Vencidas sin pago registrado" : "Todo al día"}
          deltaTone={cuotasEnMora > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="mb-4">
        <PagosFilters viajes={viajes} />
      </div>

      <PagosTable rows={rows} />
      <Pagination total={total} page={page} pages={pages} />
    </>
  );
}
