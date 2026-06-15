import { Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui";
import {
  CUANDO_LABELS,
  DESTINO_LABELS,
  MODALIDAD_LABELS,
  PARA_QUIEN_LABELS,
} from "@/lib/domain/leads";
import { formatFecha } from "@/lib/utils/date";
import type { Consulta } from "@/lib/db/schema/leads";

import { EstadoSelect } from "./estado-select";

export function ConsultasTable({ consultas }: { consultas: Consulta[] }) {
  if (consultas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-700">No hay consultas que coincidan.</p>
        <p className="mt-1 text-sm text-gray-500">
          Cuando llegue una consulta desde la web, va a aparecer acá.
        </p>
      </div>
    );
  }

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR>
            <TH>Persona</TH>
            <TH>Contacto</TH>
            <TH>Interés</TH>
            <TH>Recibida</TH>
            <TH className="w-[160px]">Estado</TH>
          </TR>
        </THead>
        <TBody>
          {consultas.map((c) => (
            <TR key={c.id}>
              <TD>
                <span className="font-semibold text-juk-navy-950">
                  {c.apellido}, {c.nombre}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {PARA_QUIEN_LABELS[c.paraQuien]}
                  {c.institucion ? ` · ${c.institucion}` : ""}
                </span>
              </TD>
              <TD>
                <span className="block text-gray-700">{c.email}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{c.telefono}</span>
              </TD>
              <TD>
                <span className="block text-gray-700">{MODALIDAD_LABELS[c.modalidad]}</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {c.destino ? `${DESTINO_LABELS[c.destino]} · ` : ""}
                  {CUANDO_LABELS[c.cuando]}
                </span>
              </TD>
              <TD>
                <span className="text-gray-700">{formatFecha(c.creadoEl)}</span>
              </TD>
              <TD>
                <EstadoSelect id={c.id} estado={c.estado} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableWrap>
  );
}
