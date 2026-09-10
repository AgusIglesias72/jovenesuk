import {
  Badge,
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
import { PAIS_LABELS } from "@/lib/domain/colegios";
import { PROSPECTO_ESTADO_LABELS, PROSPECTO_ESTADO_TONE } from "@/lib/domain/prospectos";
import type { Prospecto } from "@/lib/db/schema/prospectos";
import { formatFecha } from "@/lib/utils/date";

function ubicacion(p: Prospecto): string | null {
  const partes = [p.ciudad, p.pais ? PAIS_LABELS[p.pais] : null].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

export function ProspectosTable({
  prospectos,
  hayFiltros = false,
}: {
  prospectos: Prospecto[];
  hayFiltros?: boolean;
}) {
  if (prospectos.length === 0) {
    return (
      <EmptyState
        icon="🎯"
        title={hayFiltros ? "Sin resultados para estos filtros" : "Todavía no hay prospectos"}
        action={
          hayFiltros ? (
            <LinkButton variant="secondary" href="/prospectos?vista=tabla">
              Limpiar filtros
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/prospectos/nuevo">+ Nuevo prospecto</LinkButton>
              <LinkButton variant="secondary" href="/prospectos/importar">
                Importar
              </LinkButton>
            </>
          )
        }
      >
        {hayFiltros
          ? "Probá con menos filtros o buscá por nombre del colegio."
          : "Cargá los colegios a los que les querés escribir, o importalos desde un CSV."}
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Colegio</TH>
            <TH>Estado</TH>
            <TH>Contacto</TH>
            <TH>Próxima acción</TH>
            <TH className="w-[88px]">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {prospectos.map((p) => {
            const lugar = ubicacion(p);
            const primerEmail = p.emails[0] ?? null;
            return (
              <TR key={p.id}>
                <TD label="Colegio">
                  <span className="block font-semibold text-[var(--c-ink)]">{p.nombre}</span>
                  {lugar ? (
                    <span className="block text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                      {lugar}
                    </span>
                  ) : null}
                </TD>
                <TD label="Estado">
                  <Badge tone={PROSPECTO_ESTADO_TONE[p.estado]}>
                    {PROSPECTO_ESTADO_LABELS[p.estado]}
                  </Badge>
                </TD>
                <TD label="Contacto">
                  {p.contactoNombre || primerEmail ? (
                    <>
                      {p.contactoNombre ? (
                        <span className="block text-[var(--c-ink-muted)]">{p.contactoNombre}</span>
                      ) : null}
                      {primerEmail ? (
                        <span className="block break-all text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                          {primerEmail}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[var(--c-ink-subtle)]">—</span>
                  )}
                </TD>
                <TD label="Próxima acción">
                  <DateCell date={p.proximaAccionAt ? formatFecha(p.proximaAccionAt) : "—"} />
                </TD>
                <TD className="max-sm:justify-end">
                  <div className="flex justify-end">
                    <LinkButton variant="ghost" size="sm" href={`/prospectos/${p.id}`}>
                      Ver
                    </LinkButton>
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
