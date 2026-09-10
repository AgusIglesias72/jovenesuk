"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Badge,
  Button,
  EmptyState,
  SectionTitle,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TableWrap,
  TR,
  useConfirm,
  useToast,
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
  const confirm = useConfirm();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [sel, setSel] = useState("");

  function asignar() {
    if (!sel) return;
    startTransition(async () => {
      let r = await asignarGroupLeaderAction(viajeId, sel);
      // Police check no aprobado o por vencer: advertencia confirmable.
      if (!r.ok && r.requiereConfirmacion) {
        const { confirmado } = await confirm({
          titulo: "Atención",
          detalle: r.error,
          tone: "warning",
          confirmLabel: "Asignar igual",
        });
        if (confirmado) r = await asignarGroupLeaderAction(viajeId, sel, { confirmar: true });
      }
      if (r.ok) {
        setSel("");
        toast.success("Group Leader asignado");
        router.refresh();
      } else if (!r.requiereConfirmacion) {
        toast.error(r.error);
      }
    });
  }

  async function quitar(groupLeaderId: string) {
    const { confirmado } = await confirm({
      titulo: "¿Quitar al Group Leader del viaje?",
      detalle: "El paso Police Checks del viaje se recalcula con los GLs restantes.",
      tone: "danger",
      confirmLabel: "Sí, quitar",
    });
    if (!confirmado) return;
    startTransition(async () => {
      const r = await quitarGroupLeaderAction(viajeId, groupLeaderId);
      if (r.ok) {
        toast.success("Group Leader quitado del viaje");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function marcarPrincipal(groupLeaderId: string) {
    startTransition(async () => {
      const r = await marcarPrincipalAction(viajeId, groupLeaderId);
      if (r.ok) {
        toast.success("Group Leader principal actualizado");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <section className="mt-10">
      <SectionTitle className="mb-3">Group Leaders del viaje</SectionTitle>

      {viajeCancelado ? (
        <p className="mb-4 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          El viaje está cancelado: no se pueden asignar Group Leaders.
        </p>
      ) : (
        <div className="mb-4 flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-72">
            <Select
              searchable
              value={sel}
              aria-label="Group Leader a asignar"
              onChange={(e) => setSel(e.target.value)}
              disabled={isPending}
            >
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
          <Button type="button" onClick={asignar} disabled={isPending || !sel} className="w-full sm:w-auto">
            Asignar
          </Button>
        </div>
      )}

      {asignados.length === 0 ? (
        <EmptyState compact title="Todavía no hay Group Leaders asignados.">
          El paso “Police Checks” del viaje se calcula sobre los GLs de esta lista.
        </EmptyState>
      ) : (
        <TableWrap>
          <Table responsive>
            <THead>
              <TR>
                <TH>Group Leader</TH>
                <TH>Police check</TH>
                <TH>Rol</TH>
                <TH className="w-[104px]">
                  <span className="sr-only">Acciones</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {asignados.map((g) => (
                <TR key={g.groupLeaderId}>
                  <TD label="Group Leader">
                    <span className="font-semibold text-[var(--c-ink)]">
                      {g.apellido}, {g.nombre}
                    </span>
                  </TD>
                  <TD label="Police check">
                    <Badge tone={POLICE_TONE[g.policeCheckEstado]}>
                      {POLICE_CHECK_ESTADO_LABELS[g.policeCheckEstado]}
                    </Badge>
                  </TD>
                  <TD label="Rol">
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
                  <TD className="max-sm:justify-end">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => quitar(g.groupLeaderId)}
                      >
                        Quitar
                      </Button>
                    </div>
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
