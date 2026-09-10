import { PageHeader, Pagination, StatCard } from "@/components/ui";
import {
  listCuotasGlobal,
  resumenPagosGlobal,
  viajesConCuotas,
  type EstadoEfectivo,
} from "@/lib/db/queries/pagos";
import { pagina } from "@/lib/utils/paginate";
import {
  diasDeMora,
  estadoEfectivoCuota,
  formatMonto,
  MONEDAS,
  type Moneda,
} from "@/lib/domain/cuotas";

const ESTADOS_EFECTIVOS: EstadoEfectivo[] = ["pagada", "vencida", "pendiente"];

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
  const estado = ESTADOS_EFECTIVOS.find((e) => e === sp.estado);
  const hoy = new Date();

  // El resumen se calcula sobre el universo filtrado por viaje/moneda (nunca
  // por estado): si dependiera de la página visible mostraría totales falsos.
  const [cuotas, resumenGlobal, viajes] = await Promise.all([
    listCuotasGlobal({ viajeId: sp.viaje, moneda, estado }, pagina(sp.page), hoy),
    resumenPagosGlobal({ viajeId: sp.viaje, moneda }, hoy),
    viajesConCuotas(),
  ]);

  const rows: PagoRow[] = cuotas.items.map((c) => ({
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

  const { porMoneda: resumen, cuotasEnMora } = resumenGlobal;

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

      <PagosTable rows={rows} hayFiltros={Boolean(sp.viaje || moneda || estado)} />
      <Pagination total={cuotas.total} page={cuotas.page} pages={cuotas.pages} />
    </>
  );
}
