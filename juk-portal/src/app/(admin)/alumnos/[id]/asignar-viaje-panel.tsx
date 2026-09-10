"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Button,
  LinkButton,
  SectionTitle,
  Select,
  TripBadge,
  useConfirm,
  useToast,
} from "@/components/ui";
import { asignarAlumnoAction } from "@/lib/actions/asignaciones";
import type { ViajeAsignable } from "@/lib/db/queries/asignaciones";

import { cupoCompleto, etiquetaViajeAsignable, rangoFechas, textoCupos } from "./asignar-viaje";

export function AsignarViajePanel({
  alumnoId,
  viajes,
  tieneViaje,
}: {
  alumnoId: string;
  viajes: ViajeAsignable[];
  /** Con tableros ya visibles el panel pasa a segundo plano: cambia el copy, no el flujo. */
  tieneViaje: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [sel, setSel] = useState("");

  const elegido = viajes.find((v) => v.id === sel);
  const sinViajes = viajes.length === 0;

  function asignar() {
    if (!elegido) return;
    const { id: viajeId, codigo } = elegido;
    startTransition(async () => {
      let r = await asignarAlumnoAction(viajeId, alumnoId);
      // Mismo contrato que el roster del viaje: sobre-cupo y pasaporte advierten, no bloquean.
      if (!r.ok && r.requiereConfirmacion) {
        const { confirmado } = await confirm({
          titulo: "Atención",
          detalle: r.error,
          tone: "warning",
          confirmLabel: "Asignar igual",
        });
        if (confirmado) r = await asignarAlumnoAction(viajeId, alumnoId, { confirmar: true });
      }
      if (r.ok) {
        setSel("");
        toast.success(`Alumno asignado a ${codigo}`);
        router.refresh();
      } else if (!r.requiereConfirmacion) {
        toast.error(r.error);
      }
    });
  }

  return (
    <section
      data-asignar-viaje
      className="mt-8 rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]"
    >
      <SectionTitle>{tieneViaje ? "Asignar a otro viaje" : "Asignar a un viaje"}</SectionTitle>
      <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        {tieneViaje
          ? "Se le crea un tablero de seguimiento nuevo para ese viaje."
          : "Todavía no tiene viaje. Elegilo acá y se le crea el tablero de seguimiento al instante."}
      </p>

      {sinViajes ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            No hay viajes con inscripción abierta o confirmados en los que no esté ya inscripto.
          </p>
          <LinkButton href="/viajes" variant="secondary" className="w-full sm:w-auto">
            Ver viajes
          </LinkButton>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-md sm:flex-1">
              <Select
                searchable
                value={sel}
                aria-label="Viaje a asignar"
                onChange={(e) => setSel(e.target.value)}
                disabled={isPending}
              >
                <option value="">Elegí un viaje…</option>
                {viajes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {etiquetaViajeAsignable(v)}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              onClick={asignar}
              disabled={isPending || !elegido}
              className="w-full sm:w-auto"
            >
              {isPending ? "Asignando…" : "Asignar"}
            </Button>
          </div>

          {elegido && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--t-small)]">
              <span className="font-semibold text-[var(--c-ink)]">{elegido.nombre}</span>
              <TripBadge state={elegido.estado} />
              <span className="text-[var(--c-ink-muted)]">{rangoFechas(elegido)}</span>
              <span className="font-mono tabular-nums text-[var(--c-ink-muted)]">
                {textoCupos(elegido)}
              </span>
              {cupoCompleto(elegido) && (
                <span className="basis-full text-[var(--c-warning)]">
                  Cupo completo: asignarlo requiere confirmación explícita.
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
