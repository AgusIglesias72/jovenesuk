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
import type { GroupLeaderDeViaje } from "@/lib/db/queries/pasos-viaje";
import { POLICE_CHECK_ESTADO_LABELS, type PoliceCheckEstado } from "@/lib/domain/pasos-viaje";

import {
  asignarGroupLeaderAction,
  marcarPrincipalAction,
  quitarGroupLeaderAction,
} from "./group-leaders-actions";

type Elegible = { id: string; nombre: string; apellido: string };

const POLICE_TONE: Record<PoliceCheckEstado, "neutral" | "info" | "success" | "danger"> = {
  pendiente: "neutral",
  en_tramite: "info",
  aprobado: "success",
  vencido: "danger",
};

export function GroupLeadersPanel({
  viajeId,
  asignados,
  elegibles,
  viajeCancelado,
}: {
  viajeId: string;
  asignados: GroupLeaderDeViaje[];
  elegibles: Elegible[];
  viajeCancelado: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState("");

  function asignar() {
    if (!sel) return;
    startTransition(async () => {
      setError(null);
      const r = await asignarGroupLeaderAction(viajeId, sel);
      if (r.ok) {
        setSel("");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function quitar(groupLeaderId: string) {
    if (!window.confirm("¿Quitar este Group Leader del viaje? El paso Police Checks se recalcula.")) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const r = await quitarGroupLeaderAction(viajeId, groupLeaderId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  function marcarPrincipal(groupLeaderId: string) {
    startTransition(async () => {
      setError(null);
      const r = await marcarPrincipalAction(viajeId, groupLeaderId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
        Group Leaders del viaje
      </h2>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {viajeCancelado ? (
        <p className="mb-4 text-sm text-gray-500">
          El viaje está cancelado: no se pueden asignar Group Leaders.
        </p>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-72">
            <Select value={sel} onChange={(e) => setSel(e.target.value)} disabled={isPending}>
              <option value="">
                {elegibles.length === 0
                  ? "No hay Group Leaders disponibles"
                  : "Elegí un Group Leader…"}
              </option>
              {elegibles.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.apellido}, {g.nombre}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" onClick={asignar} disabled={isPending || !sel}>
            Asignar
          </Button>
        </div>
      )}

      {asignados.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-700">
            Todavía no hay Group Leaders asignados.
          </p>
        </div>
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Group Leader</TH>
                <TH>Police check</TH>
                <TH>Principal</TH>
                <TH className="w-[88px]" />
              </TR>
            </THead>
            <TBody>
              {asignados.map((g) => (
                <TR key={g.groupLeaderId}>
                  <TD>
                    <div className="font-semibold text-juk-navy-950">
                      {g.apellido}, {g.nombre}
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={POLICE_TONE[g.policeCheckEstado]}>
                      {POLICE_CHECK_ESTADO_LABELS[g.policeCheckEstado]}
                    </Badge>
                  </TD>
                  <TD>
                    {g.esPrincipal ? (
                      <Badge tone="success">Principal</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => marcarPrincipal(g.groupLeaderId)}
                      >
                        Marcar principal
                      </Button>
                    )}
                  </TD>
                  <TD>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => quitar(g.groupLeaderId)}
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
