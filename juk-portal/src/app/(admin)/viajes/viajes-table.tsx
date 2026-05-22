import Link from "next/link";

import { formatFecha } from "@/lib/utils/date";
import {
  CodeCell,
  DateCell,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
  TripBadge,
} from "@/components/ui";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import type { ViajeListItem } from "@/lib/db/queries/viajes";

function rango(inicio: Date, fin: Date) {
  return `${formatFecha(inicio)} – ${formatFecha(fin)}`;
}

export function ViajesTable({ viajes }: { viajes: ViajeListItem[] }) {
  if (viajes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-700">No hay viajes que coincidan.</p>
        <p className="mt-1 text-sm text-gray-500">
          Probá ajustar los filtros o creá uno nuevo con “+ Nuevo viaje”.
        </p>
      </div>
    );
  }

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR>
            <TH>Código</TH>
            <TH>Viaje</TH>
            <TH>Fechas</TH>
            <TH>Estado</TH>
            <TH numeric>Cupo máx.</TH>
            <TH className="w-[88px]" />
          </TR>
        </THead>
        <TBody>
          {viajes.map((v) => (
            <TR key={v.id}>
              <TD>
                <CodeCell code={v.codigo} />
              </TD>
              <TD>
                <div className="font-semibold text-juk-navy-950">{v.nombre}</div>
                <div className="text-xs text-gray-500">
                  {v.colegioDestinoNombre ?? "—"} · {PAIS_LABELS[v.paisDestino]}
                </div>
              </TD>
              <TD>
                <DateCell date={rango(v.fechaInicio, v.fechaFin)} />
              </TD>
              <TD>
                <TripBadge state={v.estado} />
              </TD>
              <TD numeric>{v.capacidadMaxima}</TD>
              <TD>
                <Link
                  href={`/viajes/${v.id}/editar`}
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
