import {
  buttonClasses,
  DateCell,
  EmptyState,
  LinkButton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
} from "@/components/ui";
import {
  CUANDO_LABELS,
  DESTINO_LABELS,
  MODALIDAD_LABELS,
  PARA_QUIEN_LABELS,
} from "@/lib/domain/leads";
import { formatFecha } from "@/lib/utils/date";
import type { Consulta } from "@/lib/db/schema/leads";

import { EstadoSelect } from "./estado-select";

const linkClass =
  "break-all font-medium text-[var(--c-brand)] underline decoration-[var(--c-brand-300)] underline-offset-2 hover:decoration-[var(--c-brand)]";

/**
 * Los teléfonos llegan como los escribió la persona ("11 5555-1234", "+54 9 11…").
 * wa.me solo acepta dígitos con código de país, así que normalizamos: sacamos
 * todo lo que no sea dígito, el 0 de larga distancia y el 15 de celular viejo, y
 * anteponemos 54 cuando el número no lo trae.
 */
function whatsappUrl(telefono: string): string | null {
  let digitos = telefono.replace(/\D/g, "");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (digitos.length < 8) return null;
  if (digitos.startsWith("54")) return `https://wa.me/${digitos}`;
  if (digitos.startsWith("0")) digitos = digitos.slice(1);
  return `https://wa.me/54${digitos}`;
}

function asuntoRespuesta(c: Consulta): string {
  return encodeURIComponent(`Tu consulta a Jóvenes en UK — ${c.nombre} ${c.apellido}`);
}

export function ConsultasTable({
  consultas,
  hayFiltros = false,
}: {
  consultas: Consulta[];
  hayFiltros?: boolean;
}) {
  if (consultas.length === 0) {
    return (
      <EmptyState
        icon="📬"
        title={hayFiltros ? "Sin resultados para estos filtros" : "Todavía no hay consultas"}
        action={
          hayFiltros ? (
            <LinkButton variant="secondary" href="/consultas">
              Limpiar filtros
            </LinkButton>
          ) : undefined
        }
      >
        {hayFiltros
          ? "Probá con menos filtros o buscá por nombre, email o institución."
          : "Cuando alguien complete el formulario de la web, la consulta cae acá."}
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Persona</TH>
            <TH>Consulta</TH>
            <TH>Recibida</TH>
            <TH className="w-[176px]">Estado</TH>
            <TH className="w-[128px]">
              <span className="sr-only">Responder</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {consultas.map((c) => {
            const wa = whatsappUrl(c.telefono);
            return (
              <TR key={c.id} hoverable={false}>
                <TD label="Persona">
                  <span className="block font-semibold text-[var(--c-ink)]">
                    {c.apellido}, {c.nombre}
                  </span>
                  <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                    {PARA_QUIEN_LABELS[c.paraQuien]}
                    {c.institucion ? ` · ${c.institucion}` : ""}
                  </span>
                  <a href={`mailto:${c.email}`} className={`${linkClass} mt-1 block`}>
                    {c.email}
                  </a>
                  <span className="block font-mono text-[length:var(--t-mono)] text-[var(--c-ink-muted)]">
                    {c.telefono}
                  </span>
                </TD>
                <TD label="Consulta">
                  <span className="block text-[var(--c-ink)]">{MODALIDAD_LABELS[c.modalidad]}</span>
                  <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                    {c.destino ? `${DESTINO_LABELS[c.destino]} · ` : ""}
                    {CUANDO_LABELS[c.cuando]}
                  </span>
                  {c.mensaje ? (
                    <details className="group mt-1 max-sm:text-left">
                      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <span className="line-clamp-2 text-[length:var(--t-small)] leading-[var(--lh-snug)] text-[var(--c-ink-muted)] group-open:hidden">
                          {c.mensaje}
                        </span>
                        <span className="mt-0.5 inline-block text-[length:var(--t-label)] font-semibold text-[var(--c-brand)] underline underline-offset-2">
                          <span className="group-open:hidden">Ver mensaje completo</span>
                          <span className="hidden group-open:inline">Ocultar mensaje</span>
                        </span>
                      </summary>
                      <p className="mt-1 whitespace-pre-wrap text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink)]">
                        {c.mensaje}
                      </p>
                    </details>
                  ) : (
                    <span className="block text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
                      Sin mensaje
                    </span>
                  )}
                </TD>
                <TD label="Recibida">
                  <DateCell date={formatFecha(c.creadoEl)} />
                </TD>
                <TD label="Estado">
                  <EstadoSelect id={c.id} estado={c.estado} />
                </TD>
                <TD className="max-sm:justify-end">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <a
                      href={`mailto:${c.email}?subject=${asuntoRespuesta(c)}`}
                      className={buttonClasses("ghost", "sm")}
                    >
                      Responder
                    </a>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonClasses("ghost", "sm")}
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrap>
  );
}
