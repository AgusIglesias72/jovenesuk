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
import {
  POLICE_CHECK_ESTADO_LABELS,
  POLICE_CHECK_TONE,
} from "@/lib/domain/group-leaders";
import { formatFecha } from "@/lib/utils/date";
import type { GroupLeader } from "@/lib/db/schema/grupos-leaders";

export function GroupLeadersTable({
  groupLeaders,
  hayFiltros = false,
}: {
  groupLeaders: GroupLeader[];
  hayFiltros?: boolean;
}) {
  if (groupLeaders.length === 0) {
    return (
      <EmptyState
        icon="🧑‍🏫"
        title={hayFiltros ? "Sin resultados para estos filtros" : "Todavía no hay group leaders"}
        action={
          hayFiltros ? (
            <LinkButton variant="secondary" href="/group-leaders">
              Limpiar filtros
            </LinkButton>
          ) : (
            <LinkButton href="/group-leaders/nuevo">+ Nuevo group leader</LinkButton>
          )
        }
      >
        {hayFiltros
          ? "Probá con menos filtros o buscá por apellido o email."
          : "Son los acompañantes del viaje: cada uno necesita su police check al día."}
      </EmptyState>
    );
  }

  return (
    <TableWrap>
      <Table responsive>
        <THead>
          <TR>
            <TH>Group Leader</TH>
            <TH>Documento</TH>
            <TH>Police check</TH>
            <TH>Vencimiento</TH>
            <TH className="w-[104px]">
              <span className="sr-only">Acciones</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {groupLeaders.map((gl) => (
            <TR key={gl.id}>
              <TD label="Group Leader">
                <span className="block font-semibold text-[var(--c-ink)]">
                  {gl.apellido}, {gl.nombre}
                </span>
                <span className="block break-all text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                  {gl.email}
                </span>
              </TD>
              <TD label="Documento">
                <span className="font-mono text-[length:var(--t-mono)] tabular-nums text-[var(--c-ink)]">
                  {gl.documento ?? "—"}
                </span>
              </TD>
              <TD label="Police check">
                <Badge tone={POLICE_CHECK_TONE[gl.policeCheckEstado]}>
                  {POLICE_CHECK_ESTADO_LABELS[gl.policeCheckEstado]}
                </Badge>
              </TD>
              <TD label="Vencimiento">
                <DateCell
                  date={
                    gl.policeCheckFechaVencimiento
                      ? formatFecha(gl.policeCheckFechaVencimiento)
                      : "—"
                  }
                />
              </TD>
              <TD className="max-sm:justify-end">
                <div className="flex justify-end">
                  <LinkButton variant="ghost" size="sm" href={`/group-leaders/${gl.id}/editar`}>
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
