import { listCuotasByAsignacion } from "@/lib/db/queries/cuotas";
import { estaVencida } from "@/lib/domain/cuotas";

import { cargarAlumnoFamilia, asignacionesActivas } from "../_data";
import { EstadoVacio, PagosResumen, SeccionTitulo } from "../../_ui";

export const metadata = { title: "Pagos · JUK" };

export default async function PagosPage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const activas = await asignacionesActivas(alumno.id);

  if (activas.length === 0) {
    return <EstadoVacio>Vas a ver el plan de pagos cuando estés asignado a un viaje.</EstadoVacio>;
  }

  const viajes = await Promise.all(
    activas.map(async (a) => ({ a, cuotas: await listCuotasByAsignacion(a.asignacionId) }))
  );

  const hoy = new Date();
  const hayVencidas = viajes.some((v) => v.cuotas.some((c) => estaVencida(c, hoy)));

  return (
    <div className="space-y-8">
      {hayVencidas && (
        <div
          role="status"
          className="rounded-[var(--r-lg)] border border-[var(--c-danger)] bg-[var(--c-danger-bg)] px-4 py-3 text-[length:var(--t-small)] font-medium text-[var(--c-danger)]"
        >
          Tenés una cuota vencida. Regularizá tu situación para asegurar el viaje.
        </div>
      )}
      <p className="text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Estado de cada cuota. Los pagos se registran cuando los confirmamos; este panel es
        informativo (no se paga desde acá).
      </p>
      {viajes.map(({ a, cuotas }) => (
        <section key={a.asignacionId} className="space-y-3">
          <SeccionTitulo titulo={a.viajeNombre} />
          <PagosResumen cuotas={cuotas} />
        </section>
      ))}
    </div>
  );
}
