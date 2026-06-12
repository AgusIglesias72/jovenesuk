"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Badge,
  Button,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
} from "@/components/ui";
import { ASIGNACION_ESTADO_LABELS, ASIGNACION_ESTADO_TONE } from "@/lib/domain/asignaciones";
import { formatFecha } from "@/lib/utils/date";
import type { AlumnoAsignado } from "@/lib/db/queries/asignaciones";

import { asignarAlumnoAction, desasignarAlumnoAction } from "./actions";

type Elegible = { id: string; nombre: string; apellido: string };

export function AsignacionesPanel({
  viajeId,
  asignados,
  elegibles,
  cupoMax,
  cupoUsado,
  viajeCancelado,
}: {
  viajeId: string;
  asignados: AlumnoAsignado[];
  elegibles: Elegible[];
  cupoMax: number;
  cupoUsado: number;
  viajeCancelado: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState("");

  const sinCupo = cupoUsado >= cupoMax;

  function asignar() {
    if (!sel) return;
    startTransition(async () => {
      setError(null);
      let r = await asignarAlumnoAction(viajeId, sel);
      // Advertencias no bloqueantes (sobre-cupo, pasaporte): confirmación explícita.
      if (!r.ok && r.requiereConfirmacion && window.confirm(r.error)) {
        r = await asignarAlumnoAction(viajeId, sel, { confirmar: true });
      }
      if (r.ok) {
        setSel("");
        router.refresh();
      } else if (!r.requiereConfirmacion) {
        setError(r.error);
      }
    });
  }

  function quitar(asignacionId: string, nombre: string) {
    if (!window.confirm(`¿Quitar a ${nombre} del viaje? Su tablero de seguimiento queda asociado a la asignación cancelada.`)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      let r = await desasignarAlumnoAction(asignacionId, viajeId);
      // Baja extraordinaria (viaje en curso/finalizado): segunda confirmación.
      if (!r.ok && r.requiereConfirmacion && window.confirm(r.error)) {
        r = await desasignarAlumnoAction(asignacionId, viajeId, { confirmar: true });
      }
      if (r.ok) router.refresh();
      else if (!r.requiereConfirmacion) setError(r.error);
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
          Alumnos asignados
        </h2>
        <span className="font-mono text-sm tabular-nums text-gray-600">
          {cupoUsado} / {cupoMax} cupos
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {viajeCancelado ? (
        <p className="mb-4 text-sm text-gray-500">El viaje está cancelado: no se pueden asignar alumnos.</p>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-72">
            <Select value={sel} onChange={(e) => setSel(e.target.value)} disabled={isPending}>
              <option value="">
                {elegibles.length === 0 ? "No hay alumnos disponibles" : "Elegí un alumno…"}
              </option>
              {elegibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.apellido}, {a.nombre}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" onClick={asignar} disabled={isPending || !sel}>
            Asignar
          </Button>
          {sinCupo && (
            <span className="text-sm text-amber-700">
              Cupo completo: asignar más requiere confirmación explícita.
            </span>
          )}
        </div>
      )}

      {asignados.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-700">Todavía no hay alumnos asignados.</p>
        </div>
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Alumno</TH>
                <TH>Pasaporte vto.</TH>
                <TH>Estado</TH>
                <TH className="w-[88px]" />
              </TR>
            </THead>
            <TBody>
              {asignados.map((a) => (
                <TR key={a.asignacionId}>
                  <TD>
                    <a
                      href={`/alumnos/${a.alumno.id}`}
                      className="font-semibold text-juk-navy-950 hover:text-[var(--c-brand)] hover:underline"
                    >
                      {a.alumno.apellido}, {a.alumno.nombre}
                    </a>
                    <div className="font-mono text-xs text-gray-500">{a.alumno.numeroPasaporte}</div>
                  </TD>
                  <TD>
                    <span className="font-mono text-xs text-gray-700 tabular-nums">
                      {formatFecha(a.alumno.fechaVencimientoPasaporte)}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={ASIGNACION_ESTADO_TONE[a.estado]}>
                      {ASIGNACION_ESTADO_LABELS[a.estado]}
                    </Badge>
                  </TD>
                  <TD>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => quitar(a.asignacionId, `${a.alumno.apellido}, ${a.alumno.nombre}`)}
                    >
                      Quitar
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </section>
  );
}
