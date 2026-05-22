import { getSession } from "@/lib/auth/helpers";
import {
  PageHeader,
  StatCard,
  Alert,
  TripCard,
  Button,
} from "@/components/ui";

export const metadata = { title: "Dashboard" };

/**
 * Dashboard — landing page for admin_juk users.
 *
 * Reference: docs/04-screen-archetypes.md · Archetype A
 *
 * Sections (top to bottom):
 *   1. PageHeader: "Dashboard" + alert count summary
 *   2. Stat grid: alumnos activos / viajes confirmados / viajando ahora / pagos en mora
 *   3. Alertas críticas card (top 3-5)
 *   4. Viajes próximos (90 días) grid
 *
 * NOTE: data shown below is MOCK. Fase 6 replaces with real queries from
 * lib/db/queries/dashboard.ts.
 */
export default async function DashboardPage() {
  const session = await getSession();
  const firstName = session?.user.name.split(" ")[0] ?? "ahí";

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          <>
            Buen día, {firstName}. Hay <strong>4 alertas críticas</strong> esperando.
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="sm">
              Exportar resumen
            </Button>
          </>
        }
      />

      {/* Stat grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Alumnos activos" value="62" delta="↑ 14 vs 2025" deltaTone="up" />
        <StatCard label="Viajes confirmados" value="4" delta="2 próximos" deltaTone="neutral" />
        <StatCard label="Viajando ahora" value="18" delta="London Campus · Cambridge" deltaTone="neutral" />
        <StatCard label="Pagos en mora" value="5" tone="critical" delta="3 con +7 días" deltaTone="down" />
      </section>

      {/* Alertas críticas */}
      <section className="mb-8">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-600 mb-3">
          Alertas críticas (4)
        </h2>
        <div className="flex flex-col gap-3">
          <Alert level="critical" title="ETA rechazado · Joaquín Pérez">
            Viaje en 47 días. Contactar a la familia hoy.
          </Alert>
          <Alert level="warning" title="3 alumnos con mora +7 días">
            Total adeudado: £ 2,340. Ver panel de pagos.
          </Alert>
          <Alert level="info" title="Parental Consent del London School">
            Tiene 11 meses sin actualizar. Verificar con el colegio si hay nueva versión.
          </Alert>
        </div>
      </section>

      {/* Viajes próximos */}
      <section>
        <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-600 mb-3">
          Viajes próximos (90 días)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TripCard
            code="UK-2026-JUL-LONDON"
            name="Londres en Julio · Campus"
            state="confirmado"
            dates="04 jul – 25 jul"
            school="London School of English"
            enrolled={18}
            capacity={24}
            progressMode="completion"
            progressPct={78}
          />
          <TripCard
            code="UK-2026-JUL-CAMBRIDGE"
            name="Cambridge en Julio · Campus"
            state="confirmado"
            dates="06 jul – 27 jul"
            school="Newnham College"
            enrolled={9}
            capacity={12}
            progressMode="completion"
            progressPct={62}
          />
          <TripCard
            code="UK-2027-FEB-CAMBRIDGE"
            name="Cambridge en Febrero"
            state="inscripcion_abierta"
            dates="02 feb – 21 feb '27"
            school="Studio Cambridge"
            enrolled={3}
            capacity={5}
            progressMode="minimum"
            progressPct={60}
          />
        </div>
      </section>
    </>
  );
}
