import { getSession } from "@/lib/auth/helpers";
import { Alert, PageHeader, StatCard, TripCard } from "@/components/ui";
import { getDashboardStats, getProximosViajes } from "@/lib/db/queries/dashboard";
import { formatFecha } from "@/lib/utils/date";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  const firstName = session?.user.name.split(" ")[0] ?? "ahí";

  const [stats, proximos] = await Promise.all([
    getDashboardStats(),
    getProximosViajes(),
  ]);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={<>Buen día, {firstName}.</>} />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Alumnos" value={stats.alumnos} />
        <StatCard label="Viajes confirmados" value={stats.viajesConfirmados} />
        <StatCard label="Viajando ahora" value={stats.viajando} />
        <StatCard label="Inscripción abierta" value={stats.inscripcionAbierta} />
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-600 mb-3">
          Alertas críticas
        </h2>
        <Alert level="info" title="Sin alertas por ahora">
          El cálculo automático de alertas (pasaportes, mora, ETA) se activa más adelante.
        </Alert>
      </section>

      <section>
        <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-600 mb-3">
          Viajes próximos
        </h2>
        {proximos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm font-medium text-gray-700">Todavía no hay viajes cargados.</p>
            <p className="mt-1 text-sm text-gray-500">
              Creá el primero desde la sección Viajes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {proximos.map((v) => (
              <TripCard
                key={v.id}
                code={v.codigo}
                name={v.nombre}
                state={v.estado}
                dates={`${formatFecha(v.fechaInicio)} – ${formatFecha(v.fechaFin)}`}
                school={v.colegioDestinoNombre ?? "—"}
                enrolled={0}
                capacity={v.capacidadMaxima}
                progressMode="minimum"
                progressPct={0}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
