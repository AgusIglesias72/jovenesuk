import { buttonClasses } from "@/components/ui/button";
import { EMAIL, PHONE_DISPLAY, mailConAsunto, whatsappConMensaje } from "@/lib/contact";
import { listRepresentantesDeFamilia } from "@/lib/db/queries/familias";
import { agruparPor } from "@/lib/utils/agrupar";

import { asignacionesActivas, cargarAlumnoFamilia } from "../_data";
import { FamiliaPageHeader, SeccionTitulo } from "../../_ui";
import { FAQ_FAMILIAS } from "./faq";

export const metadata = { title: "Ayuda · JUK" };

/**
 * Ayuda y contacto (PRD 04 · Módulo 10): canales reales de JUK con el mensaje
 * pre-armado, quién acompaña al grupo y preguntas frecuentes por tema. Sin
 * "tickets" ni "helpdesk": una familia con una duda y dónde resolverla.
 */
export default async function AyudaPage({ params }: { params: Promise<{ dni: string }> }) {
  const { dni } = await params;
  const { alumno } = await cargarAlumnoFamilia(dni);
  const [activas, representantes] = await Promise.all([
    asignacionesActivas(alumno.id),
    listRepresentantesDeFamilia(alumno.id),
  ]);

  const nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;
  const whatsapp = whatsappConMensaje(`Hola, les escribo por ${nombreCompleto}.`);
  const mail = mailConAsunto(`Consulta por ${nombreCompleto}`);

  // El principal de cada viaje es la primera fila de su grupo (mismo criterio que Viaje).
  const principalPorViaje = agruparPor(representantes, (r) => r.viajeId);
  const acompanantes = activas.flatMap((a) => {
    const principal = principalPorViaje.get(a.viajeId)?.[0];
    return principal
      ? [{ asignacionId: a.asignacionId, viaje: a.viajeNombre, nombre: `${principal.nombre} ${principal.apellido}` }]
      : [];
  });

  return (
    <div className="space-y-8">
      <FamiliaPageHeader
        title="Ayuda"
        subtitle="¿Tenés una duda o algo no te cierra? Escribinos por donde te quede más cómodo: del otro lado hay una persona del equipo."
      />

      <section aria-label="Canales de contacto" className="grid gap-3 sm:grid-cols-2">
        <Canal
          titulo="WhatsApp"
          detalle={PHONE_DISPLAY}
          texto="Lo más rápido para dudas del día a día."
          href={whatsapp}
          cta="Escribinos por WhatsApp"
          destacado
        />
        <Canal
          titulo="Email"
          detalle={EMAIL}
          texto="Para consultas con más detalle o si querés mandarnos un archivo."
          href={mail}
          cta="Mandanos un email"
        />
      </section>

      {acompanantes.length > 0 && (
        <section className="space-y-2">
          <SeccionTitulo titulo="Durante el viaje" />
          <div className="space-y-2 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)]">
            {acompanantes.map((a) => (
              <p
                key={a.asignacionId}
                className="text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]"
              >
                <span className="font-semibold text-[var(--c-ink)]">{a.nombre}</span> acompaña al grupo de{" "}
                <span className="font-semibold text-[var(--c-ink)]">{a.viaje}</span> como representante de JUK.
              </p>
            ))}
            <p className="text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
              Si necesitás comunicarte mientras están de viaje, escribinos por WhatsApp.
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="faq-titulo" className="space-y-5">
        <h2
          id="faq-titulo"
          className="font-display text-[length:var(--t-h3)] font-bold leading-[var(--lh-tight)] text-[var(--c-ink)]"
        >
          Preguntas frecuentes
        </h2>
        {FAQ_FAMILIAS.map((tema) => (
          <div key={tema.tema} className="space-y-2">
            <SeccionTitulo titulo={tema.tema} />
            <div className="divide-y divide-[var(--c-border)] rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[shadow:var(--shadow-1)]">
              {tema.preguntas.map((q) => (
                <details key={q.pregunta} className="group px-4">
                  <summary className="flex min-h-[var(--tap)] cursor-pointer list-none items-center justify-between gap-3 py-2 text-[length:var(--t-body)] font-semibold text-[var(--c-ink)] [&::-webkit-details-marker]:hidden">
                    <span>{q.pregunta}</span>
                    <span
                      className="shrink-0 text-[length:var(--t-h3)] leading-none text-[var(--c-ink-subtle)] transition-transform group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-4 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                    {q.respuesta}
                  </p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[var(--r-lg)] border border-dashed border-[var(--c-border-strong)] p-5 text-center">
        <p className="font-display text-[length:var(--t-body)] font-bold text-[var(--c-ink)]">
          ¿No encontraste lo que buscabas?
        </p>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Escribinos y lo vemos juntos.
        </p>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("secondary", "lg", "mt-4 w-full sm:w-auto")}
        >
          Hablar con el equipo
        </a>
      </section>
    </div>
  );
}

function Canal({
  titulo,
  detalle,
  texto,
  href,
  cta,
  destacado,
}: {
  titulo: string;
  detalle: string;
  texto: string;
  href: string;
  cta: string;
  destacado?: boolean;
}) {
  const externo = href.startsWith("http");
  return (
    <div className="flex flex-col rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-[shadow:var(--shadow-1)]">
      <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {titulo}
      </p>
      <p className="mt-1 break-words font-display text-[length:var(--t-body)] font-bold text-[var(--c-ink)]">
        {detalle}
      </p>
      <p className="mt-1 flex-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{texto}</p>
      <a
        href={href}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={buttonClasses(destacado ? "primary" : "secondary", "lg", "mt-4 w-full")}
      >
        {cta}
      </a>
    </div>
  );
}
