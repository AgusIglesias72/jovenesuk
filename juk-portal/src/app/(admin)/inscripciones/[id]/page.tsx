import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert, Badge, PageHeader, SectionTitle } from "@/components/ui";
import { getInscripcionByNumero } from "@/lib/db/queries/inscripciones";
import {
  INSCRIPCION_ESTADO_LABELS,
  INSCRIPCION_ESTADO_TONE,
  NIVEL_LABELS,
  VARIANTE_LABELS,
} from "@/lib/domain/inscripciones/labels";
import { esCampoSensible } from "@/lib/domain/inscripciones/niveles";
import {
  codigoInscripcion,
  parsearCodigoInscripcion,
} from "@/lib/domain/inscripciones/schema";
import { formatFecha } from "@/lib/utils/date";
import { formatearDni } from "@/lib/utils/dni";

import { ProcesarPanel } from "./procesar-panel";

/**
 * El detalle de una ficha. Es el ÚNICO lugar donde se ve completa: la bandeja
 * enmascara el DNI y los mails solo llevan Nivel 1. Acá se ve todo porque es el
 * back-office con sesión, y porque sin los datos de salud y de pasaporte el
 * equipo no puede decidir qué hacer con la ficha.
 *
 * La URL es el código público INS-000123, no el uuid: es lo que la familia
 * tiene a mano y lo que se puede dictar por teléfono.
 */

export const metadata = { title: "Inscripción" };

const linkClass =
  "text-[var(--c-brand)] underline decoration-[var(--c-brand-300)] underline-offset-2 hover:decoration-[var(--c-brand)]";

const panelClass =
  "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]";

/**
 * Las fechas de la ficha se guardan como string ISO (lo que tipeó la familia,
 * sin husos de por medio). `formatFecha` lee los componentes UTC y
 * `new Date("2011-04-04")` se parsea como medianoche UTC: no se corre el día.
 */
function fechaDeLaFicha(iso: string): string {
  return formatFecha(new Date(iso));
}

function Dato({
  label,
  campo,
  children,
}: {
  label: string;
  /** Clave del schema: si es Nivel 2, el rótulo lleva el candado. */
  campo?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
        {campo && esCampoSensible(campo) && (
          <span className="ml-1" aria-hidden>
            🔒
          </span>
        )}
      </dt>
      <dd className="mt-0.5 text-[length:var(--t-body)] text-[var(--c-ink)]">{children}</dd>
    </div>
  );
}

function SinDato({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--c-ink-subtle)]">{children}</span>;
}

function Panel({
  id,
  titulo,
  children,
  className,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={className ?? panelClass}>
      <SectionTitle id={id}>{titulo}</SectionTitle>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function InscripcionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const numero = parsearCodigoInscripcion(id);
  if (numero === null) notFound();

  const inscripcion = await getInscripcionByNumero(numero);
  if (!inscripcion) notFound();

  const codigo = codigoInscripcion(inscripcion.numero);
  const vinoPorInvitacion = inscripcion.comunicacionId !== null;

  return (
    <>
      <PageHeader
        title={`${inscripcion.nombre} ${inscripcion.apellido}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone={INSCRIPCION_ESTADO_TONE[inscripcion.estado]}>
              {INSCRIPCION_ESTADO_LABELS[inscripcion.estado]}
            </Badge>
            <span className="font-mono text-[length:var(--t-mono)] font-bold text-[var(--c-brand)]">
              {codigo}
            </span>
            <span>Recibida el {formatFecha(inscripcion.createdAt)}</span>
          </span>
        }
      />

      {inscripcion.datosPurgadosEl && (
        <Alert
          level="warning"
          title={`Los datos personales se purgaron el ${formatFecha(inscripcion.datosPurgadosEl)}`}
          className="mb-6"
        >
          Lo que queda en pantalla es lo que sobrevivió a la retención: la ficha original ya no
          está completa.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel id="ficha-alumno" titulo="Ficha del alumno">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Dato label="Nombre" campo="nombre">
                {inscripcion.nombre}
              </Dato>
              <Dato label="Apellido" campo="apellido">
                {inscripcion.apellido}
              </Dato>
              <Dato label="DNI" campo="dni">
                <span className="font-mono text-[length:var(--t-mono)]">
                  {formatearDni(inscripcion.dni)}
                </span>
              </Dato>
              <Dato label="Fecha de nacimiento" campo="fechaNacimiento">
                {fechaDeLaFicha(inscripcion.fechaNacimiento)}
              </Dato>
              <Dato label="N° de pasaporte" campo="numeroPasaporte">
                <span className="font-mono text-[length:var(--t-mono)]">
                  {inscripcion.numeroPasaporte}
                </span>
              </Dato>
              <Dato label="Vencimiento del pasaporte" campo="fechaVencimientoPasaporte">
                {fechaDeLaFicha(inscripcion.fechaVencimientoPasaporte)}
              </Dato>
              <Dato label="Teléfono del alumno" campo="telefonoAlumno">
                {inscripcion.telefonoAlumno ?? <SinDato>No lo dejó</SinDato>}
              </Dato>
              <Dato label="Email del alumno" campo="emailAlumno">
                {inscripcion.emailAlumno ?? <SinDato>No lo dejó</SinDato>}
              </Dato>
            </dl>

            <p className="mt-5 border-t border-[var(--c-border)] pt-3 text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
              🔒 {NIVEL_LABELS.nivel2}. Se ven acá, con sesión; nunca en un mail ni en un aviso.
            </p>
          </Panel>

          <Panel id="adulto-responsable" titulo="Adulto responsable">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Dato label="Nombre" campo="tutor1Nombre">
                {inscripcion.tutor1Nombre}
              </Dato>
              <Dato label="Email" campo="tutor1Email">
                <a href={`mailto:${inscripcion.tutor1Email}`} className={`${linkClass} break-all`}>
                  {inscripcion.tutor1Email}
                </a>
              </Dato>
              <Dato label="Celular" campo="tutor1Celular">
                <span className="font-mono text-[length:var(--t-mono)]">
                  {inscripcion.tutor1Celular}
                </span>
              </Dato>
            </dl>
          </Panel>

          <Panel id="lo-que-conto" titulo="Lo que contó la familia">
            <dl className="flex flex-col gap-4">
              <Dato label="Alergias y datos de salud" campo="alergiasSalud">
                {inscripcion.alergiasSalud ? (
                  <span className="whitespace-pre-wrap">{inscripcion.alergiasSalud}</span>
                ) : (
                  <SinDato>Sin datos de salud declarados</SinDato>
                )}
              </Dato>
              <Dato label="Preferencias de alojamiento" campo="preferenciasAlojamiento">
                {inscripcion.preferenciasAlojamiento ? (
                  <span className="whitespace-pre-wrap">
                    {inscripcion.preferenciasAlojamiento}
                  </span>
                ) : (
                  <SinDato>Sin preferencias</SinDato>
                )}
              </Dato>
              <Dato label="Nivel de inglés (autoevaluación)" campo="nivelInglesAutoevaluacion">
                {inscripcion.nivelInglesAutoevaluacion ?? <SinDato>No lo completó</SinDato>}
              </Dato>
            </dl>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel id="estado-ficha" titulo="Estado">
            <dl className="flex flex-col gap-4">
              <Dato label="Estado">
                <Badge tone={INSCRIPCION_ESTADO_TONE[inscripcion.estado]}>
                  {INSCRIPCION_ESTADO_LABELS[inscripcion.estado]}
                </Badge>
              </Dato>
              <Dato label="Motivo">
                {inscripcion.motivo ?? (
                  <SinDato>Sin motivo registrado: la ficha no necesitó explicación.</SinDato>
                )}
              </Dato>
              <Dato label="Alumno">
                {inscripcion.alumnoId ? (
                  <Link href={`/alumnos/${inscripcion.dni}`} className={linkClass}>
                    Ver la ficha del alumno
                  </Link>
                ) : (
                  <SinDato>Todavía no se creó</SinDato>
                )}
              </Dato>
            </dl>

            <ProcesarPanel
              codigo={codigo}
              estado={inscripcion.estado}
              alumnoId={inscripcion.alumnoId}
              dni={inscripcion.dni}
              vinoPorInvitacion={vinoPorInvitacion}
            />
          </Panel>

          <Panel id="origen-campana" titulo="Origen y campaña">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Dato label="Cómo llegó">
                {vinoPorInvitacion ? (
                  "Por una invitación (link con token)"
                ) : (
                  <SinDato>Sin invitación: por eso queda para revisión</SinDato>
                )}
              </Dato>
              <Dato label="Viaje">
                {inscripcion.viajeCodigo ? (
                  <Link href={`/viajes/${inscripcion.viajeCodigo}`} className={linkClass}>
                    <span className="font-mono text-[length:var(--t-mono)] font-bold">
                      {inscripcion.viajeCodigo}
                    </span>
                    {inscripcion.viajeNombre && (
                      <span className="text-[var(--c-ink-muted)]"> · {inscripcion.viajeNombre}</span>
                    )}
                  </Link>
                ) : (
                  <SinDato>Sin viaje asociado</SinDato>
                )}
              </Dato>
              <Dato label="Variante del formulario">
                {VARIANTE_LABELS[inscripcion.variante]}
              </Dato>
              <Dato label="Fecha de carga">{formatFecha(inscripcion.createdAt)}</Dato>
            </dl>
          </Panel>

          <Panel id="consentimiento" titulo="Consentimiento">
            <dl className="flex flex-col gap-4">
              <Dato label="Versión aceptada">
                <Link href={`/privacidad/${inscripcion.consentimientoVersion}`} className={linkClass}>
                  Política de Privacidad {inscripcion.consentimientoVersion}
                </Link>
              </Dato>
              <Dato label="Aceptado el">{formatFecha(inscripcion.consentimientoEl)}</Dato>
              <Dato label="Huella del texto (sha256)">
                <span className="break-all font-mono text-[length:var(--t-mono)] text-[var(--c-ink-muted)]">
                  {inscripcion.consentimientoTextoHash}
                </span>
              </Dato>
            </dl>
            <p className="mt-4 text-[length:var(--t-label)] leading-[var(--lh-snug)] text-[var(--c-ink-subtle)]">
              La huella sella el texto EXACTO que se mostró: con la versión y la fecha alcanza para
              probar a qué aceptó esta familia, incluso años después.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
