import Link from "next/link";

import { listPasosByAsignaciones } from "@/lib/db/queries/pasos-alumno";
import { formatMonto, saldoPendiente, type Moneda } from "@/lib/domain/cuotas";
import { agruparPor } from "@/lib/utils/agrupar";

import { asignacionesActivas, cargarAlumnoFamilia, cuotasActivas } from "./_data";
import {
  completitud,
  EstadoVacio,
  FamiliaPageHeader,
  ProgresoBarra,
  ViajeHeader,
} from "../_ui";

export const metadata = { title: "Resumen · JUK" };

export default async function ResumenPage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const activas = await asignacionesActivas(alumno.id);

  if (activas.length === 0) {
    return (
      <div className="space-y-6">
        <FamiliaPageHeader title="Resumen" />
        <EstadoVacio>
          Todavía no estás asignado a un viaje. Te avisamos cuando se confirme.
        </EstadoVacio>
      </div>
    );
  }

  const base = `/familias/${dni}`;

  // Las cuotas ya las pidió el layout para el aviso global: `cuotasActivas`
  // está memoizada por request, así que acá no hay round-trip extra.
  const [todosLosPasos, todasLasCuotas] = await Promise.all([
    listPasosByAsignaciones(activas.map((a) => a.asignacionId)),
    cuotasActivas(alumno.id),
  ]);
  const pasosPorAsignacion = agruparPor(todosLosPasos, (p) => p.asignacionId);
  const cuotasPorAsignacion = agruparPor(todasLasCuotas, (c) => c.asignacionId);

  const viajes = activas.map((a) => {
    const pasos = pasosPorAsignacion.get(a.asignacionId) ?? [];
    const cuotas = cuotasPorAsignacion.get(a.asignacionId) ?? [];
    return {
      a,
      doc: completitud(pasos),
      docAccion: pasos.filter((p) => p.estado === "vencido").length,
      saldo: saldoPendiente(cuotas),
      tieneCuotas: cuotas.length > 0,
      moneda: (cuotas[0]?.moneda ?? "USD") as Moneda,
    };
  });

  // Las cuotas vencidas no se repiten acá: el shell ya muestra el aviso en
  // todas las pantallas, con el link a Pagos.
  const totalDocAccion = viajes.reduce((acc, v) => acc + v.docAccion, 0);
  const hayAlertas = totalDocAccion > 0;

  return (
    <div className="space-y-6">
      <FamiliaPageHeader
        title="Resumen"
        subtitle={`Seguí acá cómo va el viaje de ${alumno.nombre}.`}
      />

      {hayAlertas && (
        <section
          aria-label="Necesita tu atención"
          className="space-y-2 rounded-[var(--r-lg)] border border-[var(--c-danger)] bg-[var(--c-danger-bg)] p-4"
        >
          <p className="text-[length:var(--t-small)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-danger)]">
            Necesita tu atención
          </p>
          <ul className="space-y-1.5">
            <li>
              <Link
                href={`${base}/documentacion`}
                className="text-[length:var(--t-small)] font-semibold text-[var(--c-danger)] underline-offset-2 hover:underline"
              >
                {totalDocAccion === 1
                  ? "1 trámite requiere tu acción"
                  : `${totalDocAccion} trámites requieren tu acción`}{" "}
                →
              </Link>
            </li>
          </ul>
        </section>
      )}

      {viajes.map(({ a, doc, saldo, tieneCuotas, moneda }) => (
        <section key={a.asignacionId} className="space-y-4">
          <ViajeHeader
            nombre={a.viajeNombre}
            codigo={a.viajeCodigo}
            fechaInicio={a.fechaInicio}
            fechaFin={a.fechaFin}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <ResumenCard
              href={`${base}/documentacion`}
              titulo="Documentación"
              valor={doc.total > 0 ? `${doc.listos} de ${doc.total}` : "Sin trámites por ahora"}
              sub="trámites listos"
              progreso={doc.total > 0 ? { valor: doc.listos, total: doc.total } : undefined}
            />
            <ResumenCard
              href={`${base}/pagos`}
              titulo="Pagos"
              valor={tieneCuotas ? formatMonto(saldo, moneda) : "—"}
              sub={tieneCuotas ? (saldo > 0 ? "saldo pendiente" : "todo al día") : "sin plan cargado"}
              alerta={saldo > 0}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <AccesoRapido href={`${base}/viaje`} icon="✈️" label="Ver detalles del viaje" />
            <AccesoRapido href={`${base}/datos`} icon="🪪" label="Mis datos" />
          </div>
        </section>
      ))}
    </div>
  );
}

function ResumenCard({
  href,
  titulo,
  valor,
  sub,
  alerta,
  progreso,
}: {
  href: string;
  titulo: string;
  valor: string;
  sub: string;
  alerta?: boolean;
  progreso?: { valor: number; total: number };
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)] transition-colors hover:border-[var(--c-ink-subtle)]"
    >
      <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {titulo}
      </p>
      <p
        className={`mt-1 font-display text-2xl font-extrabold tabular-nums ${
          alerta ? "text-[var(--c-danger)]" : "text-[var(--c-ink)]"
        }`}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{sub}</p>
      {progreso && (
        <div className="mt-3">
          <ProgresoBarra
            valor={progreso.valor}
            total={progreso.total}
            tone={progreso.total > 0 && progreso.valor === progreso.total ? "success" : "brand"}
          />
        </div>
      )}
    </Link>
  );
}

function AccesoRapido({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[var(--tap)] items-center gap-2 rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] px-4 text-[length:var(--t-small)] font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)]"
    >
      <span aria-hidden>{icon}</span> {label}
    </Link>
  );
}
