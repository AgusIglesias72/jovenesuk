import { notFound } from "next/navigation";

import { Badge, LinkButton, PageHeader } from "@/components/ui";
import { getComunicaciones, getProspectoById } from "@/lib/db/queries/prospectos";
import { listUsuarios } from "@/lib/db/queries/usuarios";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import {
  PROSPECTO_ESTADO_LABELS,
  PROSPECTO_ESTADO_TONE,
} from "@/lib/domain/prospectos";
import { formatFecha } from "@/lib/utils/date";

import { ComunicacionesPanel } from "./comunicaciones-panel";
import { ConvertirButton } from "./convertir-button";

export const metadata = { title: "Prospecto" };

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[length:var(--t-body)] text-[var(--c-ink)]">{children}</dd>
    </div>
  );
}

const linkClass =
  "text-[var(--c-brand)] underline decoration-[var(--c-brand-300)] underline-offset-2 hover:decoration-[var(--c-brand)]";

export default async function ProspectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prospecto = await getProspectoById(id);
  if (!prospecto) notFound();

  const [comunicaciones, usuarios] = await Promise.all([
    getComunicaciones(prospecto.id),
    listUsuarios(),
  ]);

  const responsable = prospecto.responsableId
    ? usuarios.find((u) => u.id === prospecto.responsableId)
    : undefined;

  const ubicacion = [
    prospecto.ciudad,
    prospecto.pais ? PAIS_LABELS[prospecto.pais] : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={prospecto.nombre}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Badge tone={PROSPECTO_ESTADO_TONE[prospecto.estado]}>
              {PROSPECTO_ESTADO_LABELS[prospecto.estado]}
            </Badge>
            {ubicacion && <span>{ubicacion}</span>}
          </span>
        }
        actions={
          <>
            <LinkButton href={`/prospectos/${prospecto.id}/editar`} variant="secondary">
              Editar
            </LinkButton>
            <ConvertirButton
              prospectoId={prospecto.id}
              yaConvertido={prospecto.estado === "ganado" && Boolean(prospecto.colegioId)}
              colegioId={prospecto.colegioId}
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
          {prospecto.imagenUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prospecto.imagenUrl}
              alt={prospecto.nombre}
              className="mb-5 aspect-video w-full rounded-[var(--r-md)] border border-[var(--c-border)] object-cover"
            />
          )}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {ubicacion && <Dato label="Ubicación">{ubicacion}</Dato>}

            {prospecto.contactoNombre && (
              <Dato label="Contacto">
                {prospecto.contactoNombre}
                {prospecto.contactoCargo && (
                  <span className="text-[var(--c-ink-muted)]"> · {prospecto.contactoCargo}</span>
                )}
              </Dato>
            )}

            {prospecto.emails.length > 0 && (
              <Dato label="Emails">
                <ul className="flex flex-col gap-0.5">
                  {prospecto.emails.map((email) => (
                    <li key={email}>
                      <a href={`mailto:${email}`} className={linkClass}>
                        {email}
                      </a>
                    </li>
                  ))}
                </ul>
              </Dato>
            )}

            {prospecto.telefonos.length > 0 && (
              <Dato label="Teléfonos">
                <ul className="flex flex-col gap-0.5">
                  {prospecto.telefonos.map((tel) => (
                    <li key={tel} className="font-mono text-[length:var(--t-mono)]">
                      {tel}
                    </li>
                  ))}
                </ul>
              </Dato>
            )}

            {prospecto.sitioWeb && (
              <Dato label="Sitio web">
                <a
                  href={prospecto.sitioWeb}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  {prospecto.sitioWeb}
                </a>
              </Dato>
            )}

            {prospecto.ubicacionUrl && (
              <Dato label="Mapa">
                <a
                  href={prospecto.ubicacionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  Ver en Google Maps
                </a>
              </Dato>
            )}

            {prospecto.fuente && <Dato label="Fuente">{prospecto.fuente}</Dato>}

            <Dato label="Responsable">
              {responsable?.name ?? (
                <span className="text-[var(--c-ink-subtle)]">Sin asignar</span>
              )}
            </Dato>

            {prospecto.proximaAccionAt && (
              <Dato label="Próxima acción">{formatFecha(prospecto.proximaAccionAt)}</Dato>
            )}

            {prospecto.estado === "perdido" && prospecto.motivoPerdida && (
              <Dato label="Motivo de pérdida">
                <span className="text-[var(--c-danger)]">{prospecto.motivoPerdida}</span>
              </Dato>
            )}
          </dl>

          {prospecto.notas && (
            <div className="mt-5 border-t border-[var(--c-border)] pt-4">
              <dt className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                Notas
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)]">
                {prospecto.notas}
              </dd>
            </div>
          )}
        </section>

        <ComunicacionesPanel prospecto={prospecto} comunicaciones={comunicaciones} />
      </div>
    </>
  );
}
