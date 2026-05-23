import Link from "next/link";

import { Badge, Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui";
import {
  POLICE_CHECK_ESTADO_LABELS,
  POLICE_CHECK_TONE,
} from "@/lib/domain/group-leaders";
import { formatFecha } from "@/lib/utils/date";
import type { GroupLeader } from "@/lib/db/schema/grupos-leaders";

export function GroupLeadersTable({ groupLeaders }: { groupLeaders: GroupLeader[] }) {
  if (groupLeaders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-700">No hay group leaders que coincidan.</p>
        <p className="mt-1 text-sm text-gray-500">
          Probá ajustar los filtros o creá uno nuevo con “+ Nuevo group leader”.
        </p>
      </div>
    );
  }

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR>
            <TH>Group Leader</TH>
            <TH>Documento</TH>
            <TH>Police check</TH>
            <TH>Vencimiento</TH>
            <TH className="w-[88px]" />
          </TR>
        </THead>
        <TBody>
          {groupLeaders.map((gl) => (
            <TR key={gl.id}>
              <TD>
                <div className="font-semibold text-juk-navy-950">
                  {gl.apellido}, {gl.nombre}
                </div>
                <div className="text-xs text-gray-500">{gl.email}</div>
              </TD>
              <TD>
                <span className="font-mono text-xs text-gray-700 tabular-nums">
                  {gl.documento ?? "—"}
                </span>
              </TD>
              <TD>
                <Badge tone={POLICE_CHECK_TONE[gl.policeCheckEstado]}>
                  {POLICE_CHECK_ESTADO_LABELS[gl.policeCheckEstado]}
                </Badge>
              </TD>
              <TD>
                <span className="font-mono text-xs text-gray-700 tabular-nums">
                  {gl.policeCheckFechaVencimiento
                    ? formatFecha(gl.policeCheckFechaVencimiento)
                    : "—"}
                </span>
              </TD>
              <TD>
                <Link
                  href={`/group-leaders/${gl.id}/editar`}
                  className="text-sm font-semibold text-juk-navy-700 hover:text-juk-navy-900"
                >
                  Editar
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableWrap>
  );
}
