"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Field, Select, useConfirm, useToast } from "@/components/ui";
import type { ViajeOpcion } from "@/lib/db/queries/viajes";
import { VIGENCIA_DIAS } from "@/lib/domain/inscripciones/invitacion";

import { enviarInvitacionIndividualAction } from "../actions";

/**
 * La invitación de a una, desde la ficha del prospecto.
 *
 * Por debajo es el mismo camino que la campaña masiva (un lote de uno), así que
 * hereda el token hasheado, el vencimiento, la bitácora y el tracking del
 * webhook de Resend. Acá el mail sale en la misma llamada: es uno solo, no hay
 * nada que retomar.
 *
 * El diálogo de confirmación lleva solo texto —el viaje se elige ANTES, en el
 * campo de acá abajo— porque adentro del modal vive un trampa de foco y un
 * desplegable con popover propio no tiene por qué pelearse con ella.
 *
 * Quien se dio de baja no tiene botón: no hay forma de forzar el envío desde la
 * pantalla, y el servidor lo vuelve a chequear igual.
 */

const MOTIVO_BLOQUEO = {
  dado_de_baja: "Se dio de baja de los correos: no se le puede mandar la invitación.",
  sin_email: "No tiene ningún email cargado: agregá uno para poder invitarlo.",
} as const;

export type MotivoBloqueo = keyof typeof MOTIVO_BLOQUEO;

export function InvitarInscripcion({
  prospectoId,
  destinatario,
  bloqueo,
  viajes,
}: {
  prospectoId: string;
  /** La casilla real; la definitiva la deriva el servidor de la base. */
  destinatario: string | null;
  /** Por qué no se le puede escribir, si es que no se puede. */
  bloqueo: MotivoBloqueo | null;
  viajes: ViajeOpcion[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [enviando, startEnviar] = useTransition();
  const [viajeId, setViajeId] = useState("");

  async function invitar() {
    const viaje = viajes.find((v) => v.id === viajeId);
    const { confirmado } = await confirm({
      titulo: "¿Mandar la invitación al Application Form?",
      detalle: (
        <>
          Le llega a <span className="font-mono">{destinatario}</span> un link propio para completar
          la ficha{viaje ? ` de ${viaje.nombre}` : ""}. Vale {VIGENCIA_DIAS} días y se puede revocar
          desde Invitaciones.
        </>
      ),
      confirmLabel: "Mandar invitación",
      tone: "brand",
    });
    if (!confirmado) return;

    startEnviar(async () => {
      const r = await enviarInvitacionIndividualAction({
        prospectoId,
        viajeId: viajeId || undefined,
      });
      if (r.ok) {
        toast.success(`Invitación enviada a ${r.data.destinatario}.`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="mt-5 border-t border-[var(--c-border)] pt-4">
      <h2 className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        Invitar a inscribirse
      </h2>

      {bloqueo ? (
        <p className="mt-2 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          {MOTIVO_BLOQUEO[bloqueo]}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            Le manda el link al Application Form a{" "}
            <span className="break-all font-mono text-[length:var(--t-mono)]">{destinatario}</span>.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Viaje" className="min-w-0 flex-1">
              <Select
                value={viajeId}
                onChange={(e) => setViajeId(e.target.value)}
                searchable
                disabled={enviando}
              >
                <option value="">Sin viaje (invitación general)</option>
                {viajes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} · {v.codigo}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant="secondary"
              onClick={invitar}
              disabled={enviando}
              className="w-full sm:w-auto"
            >
              {enviando ? "Enviando…" : "Enviar invitación"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
