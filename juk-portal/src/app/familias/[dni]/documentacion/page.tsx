import { listPasosByAsignacion } from "@/lib/db/queries/pasos-alumno";
import { type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import { PASO_CODIGOS, type PasoCodigo } from "@/lib/domain/pasos";

import { cargarAlumnoFamilia, asignacionesActivas } from "../_data";
import { EstadoVacio } from "../../_ui";
import { DocumentacionPasos } from "./paso-familia";

export const metadata = { title: "Documentación · JUK" };

function ordenarPasos(pasos: PasoAlumno[]): PasoAlumno[] {
  const orden = new Map<PasoCodigo, number>(PASO_CODIGOS.map((c, i) => [c, i]));
  return [...pasos].sort(
    (a, b) => (orden.get(a.codigo as PasoCodigo) ?? 99) - (orden.get(b.codigo as PasoCodigo) ?? 99)
  );
}

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
        Acá ves el estado de cada trámite del viaje. Subí los documentos que te pidamos y reportá el
        avance de los que dependen de vos. Te avisamos por email cuando alguno necesite tu acción.
      </p>
      {viajes.map(({ a, pasos }) => (
        <DocumentacionPasos key={a.asignacionId} titulo={a.viajeNombre} pasos={pasos} />
      ))}
    </div>
  );
}
