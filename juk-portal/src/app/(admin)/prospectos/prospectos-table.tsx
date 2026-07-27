import Link from "next/link";

import { Badge, Table, TBody, TD, TH, THead, TableWrap, TR } from "@/components/ui";
import { PAIS_LABELS } from "@/lib/domain/colegios";
import { PROSPECTO_ESTADO_LABELS, PROSPECTO_ESTADO_TONE } from "@/lib/domain/prospectos";
import type { Prospecto } from "@/lib/db/schema/prospectos";
import { formatFecha } from "@/lib/utils/date";

function ubicacion(p: Prospecto): string | null {
  const partes = [p.ciudad, p.pais ? PAIS_LABELS[p.pais] : null].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

export function ProspectosTable({ prospectos }: { prospectos: Prospecto[] }) {
  if (prospectos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-700">No hay prospectos que coincidan.</p>
        <p className="mt-1 text-sm text-gray-500">
          Probá ajustar los filtros o sumá uno nuevo con “+ Nuevo prospecto”.
        </p>
      </div>
    );
  }

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR>
            <TH>Colegio</TH>
            <TH>Estado</TH>
            <TH>Contacto</TH>
            <TH>Próxima acción</TH>
            <TH className="w-[72px]" />
          </TR>
        </THead>
        <TBody>
          {prospectos.map((p) => {
            const lugar = ubicacion(p);
            const primerEmail = p.emails[0] ?? null;
            return (
              <TR key={p.id}>
                <TD>
                  <span className="font-semibold text-juk-navy-950">{p.nombre}</span>
                  {lugar ? (
                    <span className="mt-0.5 block text-xs text-gray-500">{lugar}</span>
                  ) : null}
                </TD>
                <TD>
                  <Badge tone={PROSPECTO_ESTADO_TONE[p.estado]}>
                    {PROSPECTO_ESTADO_LABELS[p.estado]}
                  </Badge>
                </TD>
                <TD>
                  {p.contactoNombre || primerEmail ? (
                    <>
                      {p.contactoNombre ? (
                        <span className="text-gray-700">{p.contactoNombre}</span>
                      ) : null}
                      {primerEmail ? (
                        <span className="mt-0.5 block text-xs text-gray-500">{primerEmail}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TD>
                <TD>
                  <span className="text-gray-700">
                    {p.proximaAccionAt ? formatFecha(p.proximaAccionAt) : "—"}
                  </span>
                </TD>
                <TD>
                  <Link
                    href={`/prospectos/${p.id}`}
                    className="text-sm font-semibold text-juk-navy-700 hover:text-juk-navy-900"
                  >
                    Ver
                  </Link>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrap>
  );
}
