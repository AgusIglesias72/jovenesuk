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
  StepBadge,
  TripBadge,
  useConfirm,
  useToast,
} from "@/components/ui";

import { enviarMailPruebaAction } from "../configuracion/actions";
import { MAIL_TEMPLATES, type MailTemplateKey } from "../configuracion/mail-templates-meta";
import { previewTemplateAction, type EstadoServicios } from "./actions";

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

export function TestsPlayground({
  emailUsuario,
  servicios,
}: {
  emailUsuario: string;
  servicios: EstadoServicios;
}) {
  const toast = useToast();
  const confirm = useConfirm();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ToastsDemo toast={toast} />
      <ConfirmDemo confirm={confirm} toast={toast} />
      <ServiciosDemo servicios={servicios} />
      <EmailDemo emailUsuario={emailUsuario} toast={toast} />
      <EmailPreviewDemo toast={toast} />
      <ComponentesDemo />
      <CuentasDemo toast={toast} />
      <LoaderDemo />
    </div>
  );
}

/* ── Toasts ── */
function ToastsDemo({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [mensaje, setMensaje] = useState("Operación completada con éxito");
  return (
    <Seccion
      titulo="Toasts"
      descripcion="Mensaje solo → texto centrado. Con descripción → título + detalle alineados a la izquierda. Se van deslizando hacia la derecha."
    >
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
          variant="secondary"
          onClick={() =>
            toast.success(mensaje, {
              descripcion: "Con descripción el texto va a la izquierda, en dos líneas.",
            })
          }
        >
          Con descripción
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
  // OJO: no envolver confirm() en startTransition — la transición queda pendiente
  // esperando al usuario y difiere el render del modal (deadlock: no abre).
  async function abrir(tone: "danger" | "warning" | "brand", conCampo = false) {
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
  }

  return (
    <Seccion
      titulo="Modal de confirmación"
      descripcion="El diálogo del design system (reemplaza al window.confirm/prompt del navegador)."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" onClick={() => abrir("danger")}>
          Tono peligro
        </Button>
        <Button variant="secondary" onClick={() => abrir("warning")}>
          Tono atención
        </Button>
        <Button variant="secondary" onClick={() => abrir("brand")}>
          Tono marca
        </Button>
        <Button variant="ghost" onClick={() => abrir("warning", true)}>
          Con campo de texto
        </Button>
      </div>
    </Seccion>
  );
}

/* ── Estado de servicios externos ── */
function ServiciosDemo({ servicios }: { servicios: EstadoServicios }) {
  return (
    <Seccion
      titulo="Estado de servicios"
      descripcion={`Entorno: ${servicios.nodeEnv} · DB: ${servicios.dbHost}. Qué está configurado y qué falta.`}
    >
      <ul className="flex flex-col gap-2">
        {servicios.servicios.map((s) => (
          <li
            key={s.nombre}
            className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
                {s.nombre}
              </p>
              <p className="truncate text-[length:var(--t-label)] text-[var(--c-ink-muted)]">
                {s.detalle}
              </p>
            </div>
            <Badge tone={s.ok ? "success" : "warning"}>{s.ok ? "OK" : "Pendiente"}</Badge>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[length:var(--t-label)] text-[var(--c-ink-subtle)]">
        Remitentes · auto: {servicios.mails.automaticos} · com: {servicios.mails.comunicaciones}
      </p>
    </Seccion>
  );
}

/* ── Email de prueba (envío real) ── */
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
        if (res.ok) toast.success("Email de prueba enviado", { descripcion: `A ${destinatario}.` });
        else toast.error(res.error);
      } catch {
        toast.error("No pudimos enviar la prueba", {
          descripcion: "Verificá la API key de Resend y el dominio del remitente.",
        });
      }
    });
  }

  return (
    <Seccion
      titulo="Email de prueba (envío real)"
      descripcion="Manda el template con datos de ejemplo (asunto con [PRUEBA]) usando los remitentes configurados. Requiere Resend."
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

/* ── Previsualizar templates de email (sin enviar) ── */
function EmailPreviewDemo({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [template, setTemplate] = useState<MailTemplateKey>("welcome");
  const [html, setHtml] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function previsualizar() {
    startTransition(async () => {
      const res = await previewTemplateAction(template);
      if (res.ok) setHtml(res.html);
      else toast.error(res.error);
    });
  }

  return (
    <Seccion
      titulo="Previsualizar emails"
      descripcion="Renderizá cualquier template a pantalla, sin enviar nada (no requiere Resend)."
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Field label="Template">
            <Select
              value={template}
              onChange={(e) => setTemplate(e.target.value as MailTemplateKey)}
            >
              {MAIL_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button variant="secondary" onClick={previsualizar} disabled={pending}>
          {pending ? "Renderizando…" : "Previsualizar"}
        </Button>
      </div>
      {html && (
        <iframe
          title="Previsualización del email"
          srcDoc={html}
          className="mt-4 h-[420px] w-full rounded-[var(--r-md)] border border-[var(--c-border)] bg-white"
        />
      )}
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
          <Rotulo>Estados del tablero (M6)</Rotulo>
          <div className="flex flex-wrap gap-2">
            <StepBadge state="pendiente" />
            <StepBadge state="en_progreso" />
            <StepBadge state="completado" />
            <StepBadge state="bloqueado" />
            <StepBadge state="na" />
          </div>
        </div>

        <div>
          <Rotulo>Estados del viaje</Rotulo>
          <div className="flex flex-wrap gap-2">
            <TripBadge state="inscripcion_abierta" />
            <TripBadge state="confirmado" />
            <TripBadge state="en_curso" />
            <TripBadge state="finalizado" />
            <TripBadge state="cancelado" />
          </div>
        </div>

        <div>
          <Rotulo>Badges genéricos</Rotulo>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Éxito</Badge>
            <Badge tone="info">Info</Badge>
            <Badge tone="warning">Aviso</Badge>
            <Badge tone="danger">Error</Badge>
            <Badge tone="neutral">Neutro</Badge>
            <MoraBadge days={5} />
          </div>
        </div>

        <div>
          <Rotulo>Botones</Rotulo>
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
          <Rotulo>Skeleton de carga (silueta de listado)</Rotulo>
          <div className="pointer-events-none max-h-[240px] overflow-hidden rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] p-3 opacity-90">
            <ListPageSkeleton rows={3} />
          </div>
        </div>
      </div>
    </Seccion>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
      {children}
    </p>
  );
}

/* ── Cuentas de test ── */
function CuentasDemo({ toast }: { toast: ReturnType<typeof useToast> }) {
  const cuentas = [
    { rol: "Super admin", email: "test.superadmin@jovenesenuk.com" },
    { rol: "Admin", email: "test.admin@jovenesenuk.com" },
  ];
  const pass = "JukTest2026!";

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <Seccion titulo="Cuentas de test" descripcion="Credenciales fijas de desarrollo (no usar en prod).">
      <ul className="flex flex-col gap-2">
        {cuentas.map((c) => (
          <li
            key={c.email}
            className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
                {c.rol}
              </p>
              <p className="truncate font-mono text-[length:var(--t-small)] text-[var(--c-ink)]">
                {c.email}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => copiar(c.email)}>
              Copiar
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-[var(--r-md)] bg-[var(--c-surface-2)] px-3 py-2">
        <span className="font-mono text-[length:var(--t-small)] text-[var(--c-ink)]">{pass}</span>
        <Button variant="ghost" size="sm" onClick={() => copiar(pass)}>
          Copiar contraseña
        </Button>
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
        <div className="mt-4 h-[360px] overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface-2)]">
          {/* override del min-h-[70vh] por defecto: que el globo se centre en la caja */}
          <GlobeLoader className="!min-h-0 h-full" />
        </div>
      )}
    </Seccion>
  );
}
