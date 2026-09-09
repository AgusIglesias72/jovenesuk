import { listPasosByAsignaciones } from "@/lib/db/queries/pasos-alumno";
import { type PasoAlumno } from "@/lib/db/schema/pasos-alumno";
import { PASO_CODIGOS, type PasoCodigo } from "@/lib/domain/pasos";
import { agruparPor } from "@/lib/utils/agrupar";

import { cargarAlumnoFamilia, asignacionesActivas } from "../_data";
import { EstadoVacio, FamiliaPageHeader } from "../../_ui";
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
    return (
      <div className="space-y-6">
        <FamiliaPageHeader title="Documentación" />
        <EstadoVacio>Vas a ver la documentación cuando estés asignado a un viaje.</EstadoVacio>
      </div>
    );
  }

  const todosLosPasos = await listPasosByAsignaciones(activas.map((a) => a.asignacionId));
  const pasosPorAsignacion = agruparPor(todosLosPasos, (p) => p.asignacionId);
  const viajes = activas.map((a) => ({
    a,
    pasos: ordenarPasos(pasosPorAsignacion.get(a.asignacionId) ?? []),
  }));

  return (
    <div className="space-y-6">
      <FamiliaPageHeader
        title="Documentación"
        subtitle="Subí los documentos que te pidamos y reportá el avance de los que dependen de vos. Te avisamos por email cuando alguno necesite tu acción."
      />
      <div className="space-y-8">
        {viajes.map(({ a, pasos }) => (
          <DocumentacionPasos key={a.asignacionId} titulo={a.viajeNombre} pasos={pasos} />
        ))}
      </div>
    </div>
  );
}
