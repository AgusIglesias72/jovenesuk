"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Badge,
  Button,
  Field,
  Input,
  Textarea,
  useToast,
} from "@/components/ui";
import type {
  Prospecto,
  ProspectoComunicacion,
} from "@/lib/db/schema/prospectos";
import {
  COMUNICACION_ESTADO_LABELS,
  PROSPECTO_ESTADO_LABELS,
  TIPO_COMUNICACION_LABELS,
  type ProspectoEstado,
} from "@/lib/domain/prospectos";
import { formatFecha } from "@/lib/utils/date";

import { agregarNotaAction, enviarOutreachAction } from "../actions";

type TipoComunicacion = ProspectoComunicacion["tipo"];
type EstadoComunicacion = NonNullable<ProspectoComunicacion["estado"]>;

const TIPO_ICONO: Record<TipoComunicacion, string> = {
  email: "✉️",
  nota: "📝",
  llamada: "📞",
  reunion: "🤝",
  cambio_estado: "🔀",
  conversion: "🎉",
};

const ESTADO_EMAIL_TONE: Record<
  EstadoComunicacion,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  pendiente: "neutral",
  enviado: "info",
  entregado: "success",
  abierto: "success",
  click: "success",
  rebotado: "danger",
  spam: "danger",
  fallido: "danger",
};

function esEstadoProspecto(v: unknown): v is ProspectoEstado {
  return typeof v === "string" && v in PROSPECTO_ESTADO_LABELS;
}

function resumenCambioEstado(meta: ProspectoComunicacion["meta"]): string | null {
  if (!meta) return null;
  const anterior = meta.estadoAnterior;
  const nuevo = meta.estadoNuevo;
  if (!esEstadoProspecto(anterior) || !esEstadoProspecto(nuevo)) return null;
  return `${PROSPECTO_ESTADO_LABELS[anterior]} → ${PROSPECTO_ESTADO_LABELS[nuevo]}`;
}

export function ComunicacionesPanel({
  prospecto,
  comunicaciones,
}: {
  prospecto: Prospecto;
  comunicaciones: ProspectoComunicacion[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [enviando, startEnviar] = useTransition();
  const [guardandoNota, startNota] = useTransition();

  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [nota, setNota] = useState("");
  const [emailErrors, setEmailErrors] =
    useState<Record<string, string[] | undefined>>();
  const [notaError, setNotaError] = useState<string>();

  const sinEmail = prospecto.emails.length === 0;
  const outreachBloqueado = !prospecto.suscritoOutreach || sinEmail;

  function enviarMail(e: React.FormEvent) {
    e.preventDefault();
    setEmailErrors(undefined);
    startEnviar(async () => {
      const r = await enviarOutreachAction({
        prospectoId: prospecto.id,
        asunto,
        mensaje,
      });
      if (r.ok) {
        toast.success(`Correo enviado a ${r.data.destinatario ?? "el prospecto"}.`);
        setAsunto("");
        setMensaje("");
        router.refresh();
      } else {
        setEmailErrors(r.fieldErrors);
        toast.error(r.error);
      }
    });
  }

  function guardarNota(e: React.FormEvent) {
    e.preventDefault();
    setNotaError(undefined);
    startNota(async () => {
      const r = await agregarNotaAction({ prospectoId: prospecto.id, texto: nota });
      if (r.ok) {
        toast.success("Nota agregada.");
        setNota("");
        router.refresh();
      } else {
        setNotaError(r.fieldErrors?.texto?.[0] ?? r.error);
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
        <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
          Enviar correo
        </h2>

        {outreachBloqueado ? (
          <p className="mt-2 rounded-[var(--r-md)] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface-3)] px-4 py-3 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            {sinEmail
              ? "El prospecto no tiene ningún email cargado. Agregá uno desde Editar para poder enviar outreach."
              : "El prospecto se dio de baja de los correos: no se le puede enviar outreach."}
          </p>
        ) : (
          <form onSubmit={enviarMail} className="mt-4 flex flex-col gap-4">
            <Field label="Asunto" error={emailErrors?.asunto?.[0]}>
              <Input
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Presentamos Jóvenes en UK"
                invalid={Boolean(emailErrors?.asunto)}
                disabled={enviando}
              />
            </Field>
            <Field label="Mensaje" error={emailErrors?.mensaje?.[0]}>
              <Textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Hola, somos Jóvenes en UK…"
                rows={5}
                invalid={Boolean(emailErrors?.mensaje)}
                disabled={enviando}
              />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                Se enviará a{" "}
                <span className="font-mono text-[length:var(--t-mono)]">
                  {prospecto.emails[0]}
                </span>
              </span>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Enviando…" : "Enviar correo"}
              </Button>
            </div>
          </form>
        )}

        <form
          onSubmit={guardarNota}
          className="mt-5 border-t border-[var(--c-border)] pt-5"
        >
          <Field label="Agregar nota interna" error={notaError}>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Llamé al director, quedó en responder la semana que viene…"
              rows={2}
              invalid={Boolean(notaError)}
              disabled={guardandoNota}
            />
          </Field>
          <div className="mt-3 flex justify-end">
            <Button type="submit" variant="secondary" disabled={guardandoNota}>
              {guardandoNota ? "Guardando…" : "Agregar nota"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]">
        <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
          Historial
        </h2>

        {comunicaciones.length === 0 ? (
          <p className="mt-4 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            Todavía no hay comunicaciones registradas.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col">
            {comunicaciones.map((c, i) => {
              const cambio = resumenCambioEstado(c.meta);
              const esUltima = i === comunicaciones.length - 1;
              return (
                <li key={c.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-pill)] bg-[var(--c-surface-2)] text-base"
                      aria-hidden
                    >
                      {TIPO_ICONO[c.tipo]}
                    </span>
                    {!esUltima && (
                      <span className="my-1 w-px flex-1 bg-[var(--c-border)]" aria-hidden />
                    )}
                  </div>

                  <div className={esUltima ? "pb-0" : "pb-5"}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
                        {TIPO_COMUNICACION_LABELS[c.tipo]}
                      </span>
                      {c.estado && (
                        <Badge tone={ESTADO_EMAIL_TONE[c.estado]}>
                          {COMUNICACION_ESTADO_LABELS[c.estado]}
                        </Badge>
                      )}
                      <span className="text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
                        {formatFecha(new Date(c.createdAt))}
                      </span>
                    </div>

                    {c.asunto && (
                      <p className="mt-1 text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
                        {c.asunto}
                      </p>
                    )}
                    {cambio && (
                      <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                        {cambio}
                      </p>
                    )}
                    {c.cuerpo && (
                      <p className="mt-1 whitespace-pre-wrap text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
                        {c.cuerpo}
                      </p>
                    )}
                    {c.destinatario && (
                      <p className="mt-1 font-mono text-[length:var(--t-mono)] text-[var(--c-ink-subtle)]">
                        {c.destinatario}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
