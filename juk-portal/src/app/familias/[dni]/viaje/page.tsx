import { listRepresentantesDeFamilia, listViajesDeFamilia } from "@/lib/db/queries/familias";
import { PAIS_LABELS, TIPO_ALOJAMIENTO_LABELS } from "@/lib/domain/colegios";
import { agruparPor } from "@/lib/utils/agrupar";

import { cargarAlumnoFamilia } from "../_data";
import { EstadoVacio, FamiliaPageHeader, SeccionTitulo, ViajeHeader } from "../../_ui";

export const metadata = { title: "Mi viaje · JUK" };

export default async function ViajePage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);

  // Los dos selects dependen solo del alumno, así que salen juntos: el viaje ya
  // trae su colegio destino por join y el representante se resuelve agrupando.
  const [viajes, representantes] = await Promise.all([
    listViajesDeFamilia(alumno.id),
    listRepresentantesDeFamilia(alumno.id),
  ]);

  if (viajes.length === 0) {
    return (
      <div className="space-y-6">
        <FamiliaPageHeader title="Viaje" />
        <EstadoVacio>Vas a ver los detalles cuando estés asignado a un viaje.</EstadoVacio>
      </div>
    );
  }

  const principalPorViaje = agruparPor(representantes, (r) => r.viajeId);

  return (
    <div className="space-y-6">
      <FamiliaPageHeader
        title="Viaje"
        subtitle="Toda la info de tu viaje. El itinerario oficial lo publicamos más cerca de la salida."
      />
      <div className="space-y-8">
        {viajes.map((v) => {
          const principal = principalPorViaje.get(v.viajeId)?.[0] ?? null;
          return (
            <section key={v.asignacionId} className="space-y-4">
              <ViajeHeader
                nombre={v.viajeNombre}
                codigo={v.viajeCodigo}
                fechaInicio={v.fechaInicio}
                fechaFin={v.fechaFin}
              />

              <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Dato label="Destino" valor={v.colegioNombre ?? "—"} />
                  <Dato label="País" valor={PAIS_LABELS[v.paisDestino]} />
                  <Dato label="Ciudad" valor={v.colegioCiudad ?? "—"} />
                  <Dato label="Curso" valor={v.curso} />
                  <Dato
                    label="Alojamiento"
                    valor={TIPO_ALOJAMIENTO_LABELS[v.tipoAlojamientoSolicitado]}
                  />
                  <Dato
                    label="Representante"
                    valor={principal ? `${principal.nombre} ${principal.apellido}` : "A confirmar"}
                  />
                </dl>
              </div>

              <div className="space-y-2">
                <SeccionTitulo titulo="Itinerario" />
                <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface)] p-6 text-center">
                  <p className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
                    Próximamente
                  </p>
                  <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                    Cuando publiquemos el itinerario oficial del viaje, lo vas a ver acá y te
                    avisamos por email.
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[length:var(--t-body)] text-[var(--c-ink)]">{valor}</dd>
    </div>
  );
}
