import { listPasosByAsignacion } from "@/lib/db/queries/pasos-alumno";

import { cargarAlumnoFamilia, asignacionesActivas } from "../_data";
import {
  completitud,
  DocumentacionLista,
  EstadoVacio,
  ordenarPasos,
  SeccionTitulo,
  ViajeHeader,
} from "../../_ui";

export const metadata = { title: "Documentación · JUK" };

export default async function DocumentacionPage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const activas = await asignacionesActivas(alumno.id);

  if (activas.length === 0) {
    return <EstadoVacio>Vas a ver la documentación cuando estés asignado a un viaje.</EstadoVacio>;
  }

  const viajes = await Promise.all(
    activas.map(async (a) => ({
      a,
      pasos: ordenarPasos(await listPasosByAsignacion(a.asignacionId)),
    }))
  );

  return (
    <div className="space-y-8">
      <p className="text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Acá ves el estado de cada trámite del viaje. Te avisamos por email cuando alguno necesite
        tu acción.
      </p>
      {viajes.map(({ a, pasos }) => {
        const doc = completitud(pasos);
        return (
          <section key={a.asignacionId} className="space-y-3">
            <SeccionTitulo titulo={a.viajeNombre} extra={`${doc.listos} de ${doc.total} listos`} />
            <DocumentacionLista pasos={pasos} />
          </section>
        );
      })}
    </div>
  );
}
