import { getColegioById } from "@/lib/db/queries/colegios";
import { listGroupLeadersDeViaje } from "@/lib/db/queries/pasos-viaje";
import { getViajeById } from "@/lib/db/queries/viajes";
import { PAIS_LABELS, TIPO_ALOJAMIENTO_LABELS } from "@/lib/domain/colegios";

import { cargarAlumnoFamilia, asignacionesActivas } from "../_data";
import { EstadoVacio, FamiliaPageHeader, SeccionTitulo, ViajeHeader } from "../../_ui";

export const metadata = { title: "Mi viaje · JUK" };

export default async function ViajePage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const activas = await asignacionesActivas(alumno.id);

  if (activas.length === 0) {
    return (
      <div className="space-y-6">
        <FamiliaPageHeader title="Viaje" />
        <EstadoVacio>Vas a ver los detalles cuando estés asignado a un viaje.</EstadoVacio>
      </div>
    );
  }

  const viajes = await Promise.all(
    activas.map(async (a) => {
      const viaje = await getViajeById(a.viajeId);
      const [colegio, gls] = await Promise.all([
        viaje ? getColegioById(viaje.colegioDestinoId) : Promise.resolve(null),
        listGroupLeadersDeViaje(a.viajeId),
      ]);
      const principal = gls.find((g) => g.esPrincipal) ?? gls[0] ?? null;
      return { a, viaje, colegio, principal };
    })
  );

  return (
    <div className="space-y-6">
      <FamiliaPageHeader
        title="Viaje"
        subtitle="Toda la info de tu viaje. El itinerario oficial lo publicamos más cerca de la salida."
      />
      <div className="space-y-8">
        {viajes.map(({ a, viaje, colegio, principal }) => (
        <section key={a.asignacionId} className="space-y-4">
          <ViajeHeader
            nombre={a.viajeNombre}
            codigo={a.viajeCodigo}
            fechaInicio={a.fechaInicio}
            fechaFin={a.fechaFin}
          />

          <div className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Dato label="Destino" valor={colegio?.nombre ?? "—"} />
              <Dato label="País" valor={viaje ? PAIS_LABELS[viaje.paisDestino] : "—"} />
              <Dato label="Ciudad" valor={colegio?.ciudad ?? "—"} />
              <Dato label="Curso" valor={viaje?.curso ?? "—"} />
              <Dato
                label="Alojamiento"
                valor={viaje ? TIPO_ALOJAMIENTO_LABELS[viaje.tipoAlojamientoSolicitado] : "—"}
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
                Cuando publiquemos el itinerario oficial del viaje, lo vas a ver acá y te avisamos
                por email.
              </p>
            </div>
          </div>
        </section>
        ))}
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
      <dd className="mt-0.5 text-[length:var(--t-body)] text-[var(--c-ink)]">{valor}</dd>
    </div>
  );
}
