"use client";

import { useState, useTransition } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import type { MailSettings } from "@/lib/domain/configuracion";

import { enviarMailPruebaAction, guardarMailsAction } from "./actions";
import { MAIL_TEMPLATES, type MailTemplateKey } from "./mail-templates-meta";

type FieldErrors = Record<string, string[] | undefined>;

export function MailsForm({
  initial,
  emailUsuario,
}: {
  initial: MailSettings;
  emailUsuario: string;
}) {
  const [values, setValues] = useState<MailSettings>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [mensaje, setMensaje] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [template, setTemplate] = useState<MailTemplateKey>("welcome");
  const [destinatario, setDestinatario] = useState(emailUsuario);
  const [pruebaMensaje, setPruebaMensaje] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const [enviandoPrueba, startPrueba] = useTransition();

  const fe = (k: keyof MailSettings) => fieldErrors[k]?.[0];

  function set(k: keyof MailSettings, v: string) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  function guardar() {
    setMensaje(null);
    setFieldErrors({});
    startTransition(async () => {
      try {
        const res = await guardarMailsAction(values);
        if (res.ok) setMensaje({ tono: "ok", texto: "Configuración guardada." });
        else {
          setFieldErrors(res.fieldErrors ?? {});
          setMensaje({ tono: "error", texto: res.error });
        }
      } catch {
        setMensaje({ tono: "error", texto: "No pudimos guardar. Probá de nuevo." });
      }
    });
  }

  function enviarPrueba() {
    setPruebaMensaje(null);
    startPrueba(async () => {
      try {
        const res = await enviarMailPruebaAction({ template, to: destinatario });
        if (res.ok)
          setPruebaMensaje({ tono: "ok", texto: `Prueba enviada a ${destinatario}.` });
        else setPruebaMensaje({ tono: "error", texto: res.error });
      } catch {
        setPruebaMensaje({ tono: "error", texto: "No pudimos enviar la prueba." });
      }
    });
  }

  const cardClass =
    "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={cardClass} data-config-mails>
        <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
          Remitentes
        </h2>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Los automáticos (recordatorios, contraseñas) salen sin respuesta esperada; las
          comunicaciones (credenciales, cancelaciones) pueden responderse.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <Field label="Nombre del remitente" required error={fe("nombreRemitente")}>
            <Input
              value={values.nombreRemitente}
              invalid={!!fe("nombreRemitente")}
              onChange={(e) => set("nombreRemitente", e.target.value)}
            />
          </Field>
          <Field
            label="Remitente de automáticos"
            required
            help="Recordatorios, reset de contraseña, avisos."
            error={fe("remitenteAutomaticos")}
          >
            <Input
              type="email"
              value={values.remitenteAutomaticos}
              invalid={!!fe("remitenteAutomaticos")}
              onChange={(e) => set("remitenteAutomaticos", e.target.value)}
            />
          </Field>
          <Field
            label="Remitente de comunicaciones"
            required
            help="Credenciales de acceso, cancelaciones de viaje."
            error={fe("remitenteComunicaciones")}
          >
            <Input
              type="email"
              value={values.remitenteComunicaciones}
              invalid={!!fe("remitenteComunicaciones")}
              onChange={(e) => set("remitenteComunicaciones", e.target.value)}
            />
          </Field>
          <Field label="Responder a (reply-to)" required error={fe("replyTo")}>
            <Input
              type="email"
              value={values.replyTo}
              invalid={!!fe("replyTo")}
              onChange={(e) => set("replyTo", e.target.value)}
            />
          </Field>
        </div>

        {mensaje && (
          <p
            role={mensaje.tono === "error" ? "alert" : "status"}
            className={
              mensaje.tono === "ok"
                ? "mt-4 text-[length:var(--t-small)] font-medium text-[var(--c-success)]"
                : "mt-4 text-[length:var(--t-small)] font-medium text-[var(--c-danger)]"
            }
          >
            {mensaje.texto}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={guardar} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </section>

      <section className={cardClass} data-config-prueba>
        <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
          Enviar mail de prueba
        </h2>
        <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
          Manda el template elegido con datos de ejemplo (asunto con [PRUEBA]) usando los
          remitentes guardados.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <Field label="Template">
            <Select
              value={template}
              onChange={(e) => setTemplate(e.target.value as MailTemplateKey)}
            >
              {MAIL_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} · {t.tipo === "automatico" ? "automático" : "comunicación"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Enviar a" help="Por defecto, tu email.">
            <Input
              type="email"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
            />
          </Field>
        </div>

        {pruebaMensaje && (
          <p
            role={pruebaMensaje.tono === "error" ? "alert" : "status"}
            className={
              pruebaMensaje.tono === "ok"
                ? "mt-4 text-[length:var(--t-small)] font-medium text-[var(--c-success)]"
                : "mt-4 text-[length:var(--t-small)] font-medium text-[var(--c-danger)]"
            }
          >
            {pruebaMensaje.texto}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={enviarPrueba} disabled={enviandoPrueba}>
            {enviandoPrueba ? "Enviando…" : "Enviar prueba"}
          </Button>
        </div>
      </section>
    </div>
  );
}
