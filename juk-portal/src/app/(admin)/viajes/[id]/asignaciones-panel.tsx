"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import {
  Badge,
  Button,
  DateCell,
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
import { asignarAlumnoAction, desasignarAlumnoAction } from "@/lib/actions/asignaciones";
import { ASIGNACION_ESTADO_LABELS, ASIGNACION_ESTADO_TONE } from "@/lib/domain/asignaciones";
import { formatFecha } from "@/lib/utils/date";
import type { AlumnoAsignado } from "@/lib/db/queries/asignaciones";

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
  const confirm = useConfirm();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [sel, setSel] = useState("");
  const tituloId = useId();

  const sinCupo = cupoUsado >= cupoMax;

  function asignar() {
    if (!sel) return;
    startTransition(async () => {
      let r = await asignarAlumnoAction(viajeId, sel);
      // Advertencias no bloqueantes (sobre-cupo, pasaporte): confirmación explícita.
      if (!r.ok && r.requiereConfirmacion) {
        const { confirmado } = await confirm({
          titulo: "Atención",
          detalle: r.error,
          tone: "warning",
          confirmLabel: "Asignar igual",
        });
        if (confirmado) r = await asignarAlumnoAction(viajeId, sel, { confirmar: true });
      }
      if (r.ok) {
        setSel("");
        toast.success("Alumno asignado");
        router.refresh();
      } else if (!r.requiereConfirmacion) {
        toast.error(r.error);
      }
    });
  }

  async function quitar(asignacionId: string, nombre: string) {
    const { confirmado } = await confirm({
      titulo: `¿Quitar a ${nombre} del viaje?`,
      detalle:
        "Su tablero de seguimiento queda asociado a la asignación cancelada y el cupo se libera.",
      tone: "danger",
      confirmLabel: "Sí, quitar",
    });
    if (!confirmado) return;
    startTransition(async () => {
      let r = await desasignarAlumnoAction(asignacionId, viajeId);
      // Baja extraordinaria (viaje en curso/finalizado): segunda confirmación con motivo.
      if (!r.ok && r.requiereConfirmacion) {
        const { confirmado: extraordinaria, valor } = await confirm({
          titulo: "Baja extraordinaria",
          detalle: r.error,
          tone: "warning",
          confirmLabel: "Confirmar la baja",
          campo: { label: "Motivo (opcional)", placeholder: "Ej: regreso anticipado" },
        });
        if (extraordinaria) {
          r = await desasignarAlumnoAction(asignacionId, viajeId, {
            confirmar: true,
            motivo: valor || undefined,
          });
        }
      }
      if (r.ok) {
        toast.success("Alumno quitado del viaje");
        router.refresh();
      } else if (!r.requiereConfirmacion) {
        toast.error(r.error);
      }
    });
  }

  return (
    <section aria-labelledby={tituloId}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle id={tituloId}>Alumnos asignados</SectionTitle>
        <span className="font-mono text-[length:var(--t-small)] tabular-nums text-[var(--c-ink-muted)]">
          {cupoUsado} / {cupoMax} cupos
        </span>
      </div>

      {viajeCancelado ? (
        <p className="mb-4 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          El viaje está cancelado: no se pueden asignar alumnos.
        </p>
      ) : (
        <div className="mb-4 flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-72">
            <Select
              searchable
              value={sel}
              aria-label="Alumno a asignar"
              onChange={(e) => setSel(e.target.value)}
              disabled={isPending}
            >
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
          <Button type="button" onClick={asignar} disabled={isPending || !sel} className="w-full sm:w-auto">
            Asignar
          </Button>
          {sinCupo && (
            <span className="text-[length:var(--t-small)] text-[var(--c-warning)]">
              Cupo completo: asignar más requiere confirmación explícita.
            </span>
          )}
        </div>
      )}

      {asignados.length === 0 ? (
        <EmptyState compact title="Todavía no hay alumnos asignados.">
          Elegí un alumno de la lista de arriba y tocá “Asignar”: se le crea el tablero de
          seguimiento al instante.
        </EmptyState>
      ) : (
        <TableWrap>
          <Table responsive>
            <THead>
              <TR>
                <TH>Alumno</TH>
                <TH>Pasaporte vto.</TH>
                <TH>Estado</TH>
                <TH className="w-[104px]">
                  <span className="sr-only">Acciones</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {asignados.map((a) => (
                <TR key={a.asignacionId}>
                  <TD label="Alumno">
                    <Link
                      href={`/alumnos/${a.alumno.dni}`}
                      className="font-semibold text-[var(--c-ink)] hover:text-[var(--c-brand)] hover:underline"
                    >
                      {a.alumno.apellido}, {a.alumno.nombre}
                    </Link>
                    <span className="block font-mono text-[length:var(--t-mono)] text-[var(--c-ink-muted)]">
                      {a.alumno.numeroPasaporte}
                    </span>
                  </TD>
                  <TD label="Pasaporte vto.">
                    <DateCell date={formatFecha(a.alumno.fechaVencimientoPasaporte)} />
                  </TD>
                  <TD label="Estado">
                    <Badge tone={ASIGNACION_ESTADO_TONE[a.estado]}>
                      {ASIGNACION_ESTADO_LABELS[a.estado]}
                    </Badge>
                  </TD>
                  <TD className="max-sm:justify-end">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          quitar(a.asignacionId, `${a.alumno.apellido}, ${a.alumno.nombre}`)
                        }
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
