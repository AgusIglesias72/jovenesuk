import Link from "next/link";

import { Badge, Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui";
import {
  ESTADO_COLEGIO_LABELS,
  PAIS_LABELS,
  TIPO_COLEGIO_LABELS,
} from "@/lib/domain/colegios";
import type { Colegio } from "@/lib/db/schema/colegios";

export function ColegiosTable({ colegios }: { colegios: Colegio[] }) {
  if (colegios.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-700">No hay colegios que coincidan.</p>
        <p className="mt-1 text-sm text-gray-500">
          Probá ajustar los filtros o creá uno nuevo con “+ Nuevo colegio”.
        </p>
      </div>
    );
  }

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR>
            <TH>Nombre</TH>
            <TH>Tipo</TH>
            <TH>Ubicación</TH>
            <TH>Estado</TH>
            <TH className="w-[88px]" />
          </TR>
        </THead>
        <TBody>
          {colegios.map((c) => (
            <TR key={c.id}>
              <TD>
                <span className="font-semibold text-juk-navy-950">{c.nombre}</span>
              </TD>
              <TD>
                <Badge tone={c.tipo === "destino" ? "brand" : "info"}>
                  {TIPO_COLEGIO_LABELS[c.tipo]}
                </Badge>
              </TD>
              <TD>
                <span className="text-gray-700">
                  {PAIS_LABELS[c.pais]} · {c.ciudad}
                </span>
              </TD>
              <TD>
                <Badge tone={c.estado === "activo" ? "success" : "neutral"}>
                  {ESTADO_COLEGIO_LABELS[c.estado]}
                </Badge>
              </TD>
              <TD>
                <Link
                  href={`/colegios/${c.id}/editar`}
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
