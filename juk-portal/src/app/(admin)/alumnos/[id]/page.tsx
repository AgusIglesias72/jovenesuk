import Link from "next/link";
import { notFound } from "next/navigation";

import { LinkButton, PageHeader, TripBadge } from "@/components/ui";
import { getAlumnoByDni } from "@/lib/db/queries/alumnos";
import { listAsignacionesByAlumno } from "@/lib/db/queries/asignaciones";
import { listCuotasByAsignacion } from "@/lib/db/queries/cuotas";
import { listPasosByAsignacion } from "@/lib/db/queries/pasos-alumno";
import { ALUMNO_ESTADO_LABELS } from "@/lib/domain/alumnos";
import type { Moneda } from "@/lib/domain/cuotas";
import type { PasoCodigo, PasoEstado } from "@/lib/domain/pasos";
import type { ViajeOrigen } from "@/lib/domain/viajes";
import { formatFecha } from "@/lib/utils/date";

import { AccesoFamilia } from "./acceso-familia";
import { CuotasPanel, type CuotaView } from "./cuotas-panel";
import { TableroM6, type PasoView } from "./tablero-m6";

export const metadata = { title: "Alumno" };

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[length:var(--t-body)] text-[var(--c-ink)]">{value}</dd>
    </div>
  );
}

export default async function AlumnoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const alumno = await getAlumnoByDni(id);
  if (!alumno) notFound();

  const asignacionesAlumno = await listAsignacionesByAlumno(alumno.id);
  const activas = asignacionesAlumno.filter((a) => a.estado === "activa");

  const tableros = await Promise.all(
    activas.map(async (a) => ({
      asignacion: a,
      pasos: (await listPasosByAsignacion(a.asignacionId)).map(
        (p): PasoView => ({
          id: p.id,
          codigo: p.codigo as PasoCodigo,
          estado: p.estado as PasoEstado,
          metadata: p.metadata,
          notas: p.notas,
          fechaCompletado: p.fechaCompletado,
        })
      ),
      cuotas: (await listCuotasByAsignacion(a.asignacionId)).map(
        (c): CuotaView => ({
          id: c.id,
          numero: c.numero,
          esUltimaCuota: c.esUltimaCuota,
          monto: c.monto,
          moneda: c.moneda as Moneda,
          estado: c.estado,
          canal: c.canal,
          fechaVencimiento: c.fechaVencimiento,
          fechaPagoEfectivo: c.fechaPagoEfectivo,
          observaciones: c.observaciones,
        })
      ),
    }))
  );

  return (
    <>
      <PageHeader
        title={`${alumno.apellido}, ${alumno.nombre}`}
        subtitle={`${ALUMNO_ESTADO_LABELS[alumno.estado]} · DNI ${alumno.dni}`}
        actions={
          <LinkButton href={`/alumnos/${alumno.dni}/editar`} variant="secondary">
            Editar datos
          </LinkButton>
        }
      />

      <section className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          <Dato label="Nacimiento" value={formatFecha(alumno.fechaNacimiento)} />
          <Dato
            label="Pasaporte"
            value={<span className="font-mono text-[length:var(--t-mono)]">{alumno.numeroPasaporte}</span>}
          />
          <Dato label="Vence" value={formatFecha(alumno.fechaVencimientoPasaporte)} />
          {alumno.pasaporteActualizadoAt && (
            <Dato
              label="Pasaporte actualizado"
              value={
                <span className="text-[var(--c-warning)]">
                  {formatFecha(alumno.pasaporteActualizadoAt)} — re-verificar Immigration Letter
                </span>
              }
            />
          )}
          <Dato label="Tutor 1" value={alumno.tutor1Nombre} />
          <Dato label="Email tutor" value={alumno.tutor1Email} />
          <Dato label="Celular tutor" value={alumno.tutor1Celular} />
          {alumno.emailAlumno && <Dato label="Email alumno" value={alumno.emailAlumno} />}
          {alumno.alergiasSalud && (
            <Dato
              label="Salud (confidencial)"
              value={<span className="text-[var(--c-danger)]">{alumno.alergiasSalud}</span>}
            />
          )}
        </dl>

        <AccesoFamilia
          alumnoId={alumno.id}
          tutorEmail={alumno.tutor1Email}
          enviadoAt={alumno.accesoFamiliaEnviadoAt}
        />
      </section>

      {tableros.length === 0 ? (
        <div className="mt-8 rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] bg-transparent p-10 text-center">
          <p className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
            Sin viaje asignado
          </p>
          <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            El tablero de seguimiento se crea al asignar el alumno a un viaje (desde el
            detalle del viaje).
          </p>
        </div>
      ) : (
        tableros.map(({ asignacion, pasos, cuotas }) => (
          <div key={asignacion.asignacionId}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`/viajes/${asignacion.viajeCodigo}`}
                className="font-mono text-[length:var(--t-small)] font-bold text-[var(--c-brand)] hover:underline"
              >
                {asignacion.viajeCodigo}
              </Link>
              <span className="text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
                {asignacion.viajeNombre}
              </span>
              <TripBadge state={asignacion.viajeEstado as Parameters<typeof TripBadge>[0]["state"]} />
              <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                {formatFecha(asignacion.fechaInicio)} – {formatFecha(asignacion.fechaFin)}
              </span>
            </div>
            <TableroM6
              alumnoId={alumno.id}
              pasos={pasos}
              titulo={asignacion.viajeCodigo}
            />
            <CuotasPanel
              alumnoId={alumno.id}
              asignacionId={asignacion.asignacionId}
              origenViaje={asignacion.viajeOrigen as ViajeOrigen}
              cuotas={cuotas}
            />
          </div>
        ))
      )}
    </>
  );
}
