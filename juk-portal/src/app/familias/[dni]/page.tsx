import Link from "next/link";

import { listCuotasByAsignacion } from "@/lib/db/queries/cuotas";
import { listPasosByAsignacion } from "@/lib/db/queries/pasos-alumno";
import { formatMonto, saldoPendiente, type Moneda } from "@/lib/domain/cuotas";

import { asignacionesActivas, cargarAlumnoFamilia } from "./_data";
import { completitud, EstadoVacio, ViajeHeader } from "../_ui";

export const metadata = { title: "Mi viaje · JUK" };

export default async function ResumenPage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const activas = await asignacionesActivas(alumno.id);

  if (activas.length === 0) {
    return <EstadoVacio>Todavía no estás asignado a un viaje. Te avisamos cuando se confirme.</EstadoVacio>;
  }

  const viajes = await Promise.all(
    activas.map(async (a) => {
      const [pasos, cuotas] = await Promise.all([
        listPasosByAsignacion(a.asignacionId),
        listCuotasByAsignacion(a.asignacionId),
      ]);
      const doc = completitud(pasos);
      const moneda = (cuotas[0]?.moneda ?? "USD") as Moneda;
      return { a, doc, saldo: saldoPendiente(cuotas), tieneCuotas: cuotas.length > 0, moneda };
    })
  );

  const base = `/familias/${dni}`;

  return (
    <div className="space-y-6">
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
              valor={`${doc.listos} de ${doc.total}`}
              sub="trámites listos"
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
}: {
  href: string;
  titulo: string;
  valor: string;
  sub: string;
  alerta?: boolean;
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
