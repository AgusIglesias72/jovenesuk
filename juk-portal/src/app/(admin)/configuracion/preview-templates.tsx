"use client";

import { useState, useTransition } from "react";

import { Button, Field, Select, useToast } from "@/components/ui";

import { previewTemplateAction } from "./actions";
import { MAIL_TEMPLATES, type MailTemplateKey } from "./mail-templates-meta";

export function PreviewTemplates() {
  const toast = useToast();
  const [template, setTemplate] = useState<MailTemplateKey>("welcome");
  const [html, setHtml] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function previsualizar() {
    startTransition(async () => {
      try {
        const res = await previewTemplateAction(template);
        if (res.ok) setHtml(res.data.html);
        else toast.error(res.error);
      } catch {
        toast.error("No pudimos renderizar el template.");
      }
    });
  }

  return (
    <section
      className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]"
      data-config-preview
    >
      <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
        Previsualizar templates
      </h2>
      <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        Renderizá cualquier template en pantalla, con datos de ejemplo y sin enviar nada.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
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
          sandbox=""
          className="mt-4 h-[420px] w-full rounded-[var(--r-md)] border border-[var(--c-border)] bg-white"
        />
      )}
    </section>
  );
}
