import { LinkButton, PageHeader } from "@/components/ui";

import { ImportClient } from "./import-client";

const HEADERS_SOPORTADOS = [
  { header: "nombre", detalle: "obligatorio — nombre del colegio o institución" },
  { header: "email / emails", detalle: "uno o varios, separados por ; o ," },
  { header: "telefono / telefonos", detalle: "uno o varios, separados por ; o ," },
  { header: "ciudad", detalle: "ciudad del colegio" },
  { header: "pais", detalle: "Reino Unido, Irlanda, Canadá, Malta, Australia, Argentina u Otro" },
  { header: "sitio_web", detalle: "URL del sitio" },
  { header: "ubicacion", detalle: "link de Google Maps" },
  { header: "contacto", detalle: "nombre de la persona de contacto" },
  { header: "cargo", detalle: "cargo del contacto" },
  { header: "fuente", detalle: "cómo llegó el prospecto" },
  { header: "notas", detalle: "notas libres" },
];

export default function ImportarProspectosPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Importar prospectos"
        subtitle="Pegá filas de una planilla o subí un CSV. La primera fila tiene que ser el encabezado."
        actions={
          <LinkButton href="/prospectos" variant="secondary">
            Volver
          </LinkButton>
        }
      />

      <section className="mb-6 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5">
        <h2 className="mb-1 text-[length:var(--t-body)] font-semibold text-[var(--c-ink)]">
          Encabezados soportados
        </h2>
        <p className="mb-4 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
          El nombre de las columnas no distingue mayúsculas ni acentos. Solo{" "}
          <code className="rounded bg-[var(--c-surface-2)] px-1">nombre</code> es obligatorio; el
          resto es opcional y las columnas desconocidas se ignoran.
        </p>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {HEADERS_SOPORTADOS.map(({ header, detalle }) => (
            <li key={header} className="text-[length:var(--t-small)]">
              <code className="rounded bg-[var(--c-surface-2)] px-1 font-medium text-[var(--c-ink)]">
                {header}
              </code>{" "}
              <span className="text-[var(--c-ink-subtle)]">— {detalle}</span>
            </li>
          ))}
        </ul>
      </section>

      <ImportClient />
    </div>
  );
}
