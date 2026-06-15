import { formatFecha } from "@/lib/utils/date";

import { cargarAlumnoFamilia, asignacionesActivas } from "../_data";
import { FamiliaPageHeader, SeccionTitulo } from "../../_ui";
import { ReportarDato } from "./reportar-dato";

export const metadata = { title: "Mis datos · JUK" };

export default async function DatosPage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const activas = await asignacionesActivas(alumno.id);

  // UK exige el pasaporte válido hasta el fin del viaje (no 6 meses extra).
  const finMasLejano = activas.reduce<Date | null>(
    (max, a) => (!max || a.fechaFin > max ? a.fechaFin : max),
    null
  );
  const pasaporteVenceAntes =
    finMasLejano !== null && alumno.fechaVencimientoPasaporte < finMasLejano;

  return (
    <div className="space-y-6">
      <FamiliaPageHeader
        title="Mis datos"
        subtitle="Estos son los datos que tenemos del alumno. Si ves algo incorrecto, escribinos y lo corregimos."
      />

      {pasaporteVenceAntes && (
        <div
          role="status"
          className="rounded-[var(--r-lg)] border border-[var(--c-danger)] bg-[var(--c-danger-bg)] px-4 py-3 text-[length:var(--t-small)] font-medium text-[var(--c-danger)]"
        >
          El pasaporte vence antes de que termine el viaje. El Reino Unido exige que esté vigente
          hasta el último día. Escribinos para renovarlo a tiempo.
        </div>
      )}

      <Bloque titulo="Datos del alumno">
        <Dato label="Nombre y apellido" valor={`${alumno.nombre} ${alumno.apellido}`} />
        <Dato label="DNI" valor={alumno.dni} mono />
        <Dato label="Fecha de nacimiento" valor={formatFecha(alumno.fechaNacimiento)} />
        <Dato label="Pasaporte" valor={alumno.numeroPasaporte} mono />
        <Dato label="Vence el pasaporte" valor={formatFecha(alumno.fechaVencimientoPasaporte)} />
        {alumno.emailAlumno && <Dato label="Email" valor={alumno.emailAlumno} />}
        {alumno.telefonoAlumno && <Dato label="Teléfono" valor={alumno.telefonoAlumno} />}
        {alumno.alergiasSalud && (
          <Dato label="Salud / alergias" valor={alumno.alergiasSalud} alerta />
        )}
      </Bloque>

      <Bloque titulo="Tutor / responsable">
        <Dato label="Nombre" valor={alumno.tutor1Nombre} />
        <Dato label="Email" valor={alumno.tutor1Email} />
        <Dato label="Celular" valor={alumno.tutor1Celular} />
        {alumno.tutor2Nombre && <Dato label="Segundo tutor" valor={alumno.tutor2Nombre} />}
      </Bloque>

      <ReportarDato alumnoDni={alumno.dni} />
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <SeccionTitulo titulo={titulo} />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)] sm:grid-cols-3">
        {children}
      </dl>
    </section>
  );
}

function Dato({
  label,
  valor,
  mono,
  alerta,
}: {
  label: string;
  valor: string;
  mono?: boolean;
  alerta?: boolean;
}) {
  return (
    <div>
      <dt className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-[length:var(--t-body)] ${mono ? "font-mono" : ""} ${
          alerta ? "text-[var(--c-danger)]" : "text-[var(--c-ink)]"
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
