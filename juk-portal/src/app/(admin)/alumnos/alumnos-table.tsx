import Link from "next/link";

import { Badge, Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui";
import { ALUMNO_ESTADO_LABELS, ALUMNO_ESTADO_TONE } from "@/lib/domain/alumnos";
import { formatFecha } from "@/lib/utils/date";
import { formatearDni } from "@/lib/utils/dni";
import type { Alumno } from "@/lib/db/schema/alumnos";

export function AlumnosTable({ alumnos }: { alumnos: Alumno[] }) {
  if (alumnos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-700">No hay alumnos que coincidan.</p>
        <p className="mt-1 text-sm text-gray-500">
          Probá ajustar los filtros o creá uno nuevo con “+ Nuevo alumno”.
        </p>
      </div>
    );
  }

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR>
            <TH>Alumno</TH>
            <TH>DNI</TH>
            <TH>Pasaporte vto.</TH>
            <TH>Estado</TH>
            <TH className="w-[88px]" />
          </TR>
        </THead>
        <TBody>
          {alumnos.map((a) => (
            <TR key={a.id}>
              <TD>
                <div className="font-semibold text-juk-navy-950">
                  {a.apellido}, {a.nombre}
                </div>
                <div className="font-mono text-xs text-gray-500">{a.numeroPasaporte}</div>
              </TD>
              <TD>
                <span className="font-mono text-xs text-gray-700 tabular-nums">{formatearDni(a.dni)}</span>
              </TD>
              <TD>
                <span className="font-mono text-xs text-gray-700 tabular-nums">
                  {formatFecha(a.fechaVencimientoPasaporte)}
                </span>
              </TD>
              <TD>
                <Badge tone={ALUMNO_ESTADO_TONE[a.estado]}>
                  {ALUMNO_ESTADO_LABELS[a.estado]}
                </Badge>
              </TD>
              <TD>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/alumnos/${a.dni}`}
                    className="text-sm font-semibold text-juk-navy-700 hover:text-juk-navy-900"
                  >
                    Ver
                  </Link>
                  <Link
                    href={`/alumnos/${a.dni}/editar`}
                    className="text-sm font-medium text-[var(--c-ink-subtle)] hover:text-juk-navy-900"
                  >
                    Editar
                  </Link>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableWrap>
  );
}
