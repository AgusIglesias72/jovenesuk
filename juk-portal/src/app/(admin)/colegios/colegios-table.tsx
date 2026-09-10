import {
  Badge,
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
  ESTADO_COLEGIO_LABELS,
  PAIS_LABELS,
  TIPO_COLEGIO_LABELS,
} from "@/lib/domain/colegios";
import type { Colegio } from "@/lib/db/schema/colegios";

export function ColegiosTable({
  colegios,
  hayFiltros = false,
}: {
  colegios: Colegio[];
  hayFiltros?: boolean;
}) {
  if (colegios.length === 0) {
    return (
      <EmptyState
        icon="🏫"
        title={hayFiltros ? "Sin resultados para estos filtros" : "Todavía no hay colegios"}
        action={
          hayFiltros ? (
            <LinkButton variant="secondary" href="/colegios">
              Limpiar filtros
            </LinkButton>
          ) : (
            <LinkButton href="/colegios/nuevo">+ Nuevo colegio</LinkButton>
          )
        }
      >
        {hayFiltros
          ? "Probá con menos filtros o buscá por nombre o ciudad."
          : "Acá viven los colegios de origen (los que mandan alumnos) y los de destino."}
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Nombre</TH>
            <TH>Tipo</TH>
            <TH>Ubicación</TH>
            <TH>Estado</TH>
            <TH className="w-[104px]">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {colegios.map((c) => (
            <TR key={c.id}>
              <TD label="Nombre">
                <span className="font-semibold text-[var(--c-ink)]">{c.nombre}</span>
              </TD>
              <TD label="Tipo">
                <Badge tone={c.tipo === "destino" ? "brand" : "info"}>
                  {TIPO_COLEGIO_LABELS[c.tipo]}
                </Badge>
              </TD>
              <TD label="Ubicación">
                <span className="text-[var(--c-ink-muted)]">
                  {PAIS_LABELS[c.pais]} · {c.ciudad}
                </span>
              </TD>
              <TD label="Estado">
                <Badge tone={c.estado === "activo" ? "success" : "neutral"}>
                  {ESTADO_COLEGIO_LABELS[c.estado]}
                </Badge>
              </TD>
              <TD className="max-sm:justify-end">
                <div className="flex justify-end">
                  <LinkButton variant="ghost" size="sm" href={`/colegios/${c.id}/editar`}>
                    Editar
                  </LinkButton>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableWrap>
  );
}
