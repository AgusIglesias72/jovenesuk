"use client";

import { useState, useTransition } from "react";

import { Button, Field, Input, Select, useToast } from "@/components/ui";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
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
  const toast = useToast();
  const [values, setValues] = useState<MailSettings>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [template, setTemplate] = useState<MailTemplateKey>("welcome");
  const [destinatario, setDestinatario] = useState(emailUsuario);
  const [enviandoPrueba, startPrueba] = useTransition();

  useUnsavedChanges(dirty);

  const fe = (k: keyof MailSettings) => fieldErrors[k]?.[0];

  function set(k: keyof MailSettings, v: string) {
    setValues((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }

  function guardar() {
    setFieldErrors({});
    startTransition(async () => {
      try {
        const res = await guardarMailsAction(values);
        if (res.ok) {
          setDirty(false);
          toast.success("Configuración guardada.");
        } else {
          setFieldErrors(res.fieldErrors ?? {});
          toast.error(res.error);
        }
      } catch {
        toast.error("No pudimos guardar. Probá de nuevo.");
      }
    });
  }

  function enviarPrueba() {
    startPrueba(async () => {
      try {
        const res = await enviarMailPruebaAction({ template, to: destinatario });
        if (res.ok) toast.success(`Prueba enviada a ${destinatario}.`);
        else toast.error(res.error);
      } catch {
        toast.error("No pudimos enviar la prueba.");
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

        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={enviarPrueba} disabled={enviandoPrueba}>
            {enviandoPrueba ? "Enviando…" : "Enviar prueba"}
          </Button>
        </div>
      </section>
    </div>
  );
}
