"use client";

import { useState, useTransition } from "react";

import {
  Badge,
  Button,
  DateInput,
  Field,
  GlobeLoader,
  Input,
  ListPageSkeleton,
  MoraBadge,
  Select,
  useConfirm,
  useToast,
} from "@/components/ui";

import { enviarMailPruebaAction } from "../configuracion/actions";
import { MAIL_TEMPLATES, type MailTemplateKey } from "../configuracion/mail-templates-meta";

const CARD =
  "rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]";

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
        {titulo}
      </h2>
      <p className="mt-0.5 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{descripcion}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function TestsPlayground({ emailUsuario }: { emailUsuario: string }) {
  const toast = useToast();
  const confirm = useConfirm();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ToastsDemo toast={toast} />
      <ConfirmDemo confirm={confirm} toast={toast} />
      <EmailDemo emailUsuario={emailUsuario} toast={toast} />
      <ComponentesDemo />
      <LoaderDemo />
    </div>
  );
}

/* ── Toasts ── */
function ToastsDemo({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [mensaje, setMensaje] = useState("Operación completada con éxito");
  return (
    <Seccion titulo="Toasts" descripcion="Generá un toast con tu propio texto para mostrar ejemplos.">
      <Field label="Mensaje">
        <Input value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
      </Field>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => toast.success(mensaje)}>Éxito</Button>
        <Button variant="danger" onClick={() => toast.error(mensaje)}>
          Error
        </Button>
        <Button variant="secondary" onClick={() => toast.info(mensaje)}>
          Info
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            toast.success("Primero");
            toast.info("Segundo");
            toast.error("Tercero");
          }}
        >
          Apilar 3
        </Button>
      </div>
    </Seccion>
  );
}

/* ── Modal de confirmación ── */
function ConfirmDemo({
  confirm,
  toast,
}: {
  confirm: ReturnType<typeof useConfirm>;
  toast: ReturnType<typeof useToast>;
}) {
  const [pending, startTransition] = useTransition();

  function abrir(tone: "danger" | "warning" | "brand", conCampo = false) {
    startTransition(async () => {
      const { confirmado, valor } = await confirm({
        titulo:
          tone === "danger"
            ? "¿Eliminar este registro?"
            : tone === "warning"
              ? "Atención"
              : "¿Confirmar la acción?",
        detalle:
          "Este es un ejemplo del modal de confirmación del design system. Probá los distintos tonos.",
        tone,
        confirmLabel: tone === "danger" ? "Sí, eliminar" : "Confirmar",
        ...(conCampo
          ? { campo: { label: "Motivo (opcional)", placeholder: "Escribí algo…" } }
          : {}),
      });
      if (confirmado) {
        toast.success(valor ? `Confirmado · motivo: "${valor}"` : "Confirmado");
      } else {
        toast.info("Cancelado");
      }
    });
  }

  return (
    <Seccion
      titulo="Modal de confirmación"
      descripcion="El diálogo del design system (reemplaza al window.confirm/prompt del navegador)."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" disabled={pending} onClick={() => abrir("danger")}>
          Tono peligro
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => abrir("warning")}>
          Tono atención
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => abrir("brand")}>
          Tono marca
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => abrir("warning", true)}>
          Con campo de texto
        </Button>
      </div>
    </Seccion>
  );
}

/* ── Email de prueba ── */
function EmailDemo({
  emailUsuario,
  toast,
}: {
  emailUsuario: string;
  toast: ReturnType<typeof useToast>;
}) {
  const [template, setTemplate] = useState<MailTemplateKey>("welcome");
  const [destinatario, setDestinatario] = useState(emailUsuario);
  const [pending, startTransition] = useTransition();

  function enviar() {
    startTransition(async () => {
      try {
        const res = await enviarMailPruebaAction({ template, to: destinatario });
        if (res.ok) toast.success(`Email de prueba enviado a ${destinatario}.`);
        else toast.error(res.error);
      } catch {
        toast.error("No pudimos enviar la prueba.");
      }
    });
  }

  return (
    <Seccion
      titulo="Email de prueba"
      descripcion="Mandá cualquier template con datos de ejemplo (asunto con [PRUEBA]), usando los remitentes configurados."
    >
      <div className="flex flex-col gap-4">
        <Field label="Template">
          <Select value={template} onChange={(e) => setTemplate(e.target.value as MailTemplateKey)}>
            {MAIL_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label} · {t.tipo === "automatico" ? "automático" : "comunicación"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Enviar a">
          <Input type="email" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button onClick={enviar} disabled={pending}>
            {pending ? "Enviando…" : "Enviar prueba"}
          </Button>
        </div>
      </div>
    </Seccion>
  );
}

/* ── Showcase de componentes ── */
function ComponentesDemo() {
  const [fecha, setFecha] = useState("");
  const [select, setSelect] = useState("");

  return (
    <Seccion
      titulo="Componentes"
      descripcion="Muestra rápida de los primitivos del design system para enseñar ejemplos."
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
            Badges
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Completado</Badge>
            <Badge tone="info">En curso</Badge>
            <Badge tone="warning">Atención</Badge>
            <Badge tone="danger">Bloqueado</Badge>
            <Badge tone="neutral">Pendiente</Badge>
            <MoraBadge days={5} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
            Botones
          </p>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="critical">Critical</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha (DatePicker propio)">
            <DateInput value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Select con búsqueda">
            <Select searchable value={select} onChange={(e) => setSelect(e.target.value)}>
              <option value="">Elegí una opción…</option>
              <option value="a">Londres</option>
              <option value="b">Edimburgo</option>
              <option value="c">Oxford</option>
              <option value="d">Brighton</option>
              <option value="e">Cambridge</option>
            </Select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
            Skeleton de carga (silueta de listado)
          </p>
          <div className="pointer-events-none max-h-[260px] overflow-hidden rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] p-3 opacity-90">
            <ListPageSkeleton rows={3} />
          </div>
        </div>
      </div>
    </Seccion>
  );
}

/* ── GlobeLoader ── */
function LoaderDemo() {
  const [visible, setVisible] = useState(false);
  return (
    <Seccion
      titulo="GlobeLoader"
      descripcion="El loader del globo (hoy sin uso en la app; queda disponible para esperas largas)."
    >
      <Button variant="secondary" onClick={() => setVisible((v) => !v)}>
        {visible ? "Ocultar" : "Mostrar"} el loader
      </Button>
      {visible && (
        <div className="mt-4 h-64 overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-2)]">
          <GlobeLoader />
        </div>
      )}
    </Seccion>
  );
}
