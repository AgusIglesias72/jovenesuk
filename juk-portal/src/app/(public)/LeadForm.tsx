"use client";

import { useActionState, useEffect, useState } from "react";

import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { CUANDO, DESTINO, MODALIDAD, PARA_QUIEN } from "@/lib/domain/leads";

import { track } from "./Analytics";
import { submitLead } from "./leads/actions";

export function LeadForm() {
  const [state, action, pending] = useActionState(submitLead, null);
  const [paraQuien, setParaQuien] = useState<string>("para_mi");
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) track("generate_lead");
  }, [state]);

  if (state?.ok) {
    return (
      <div className="rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-8 text-center shadow-[shadow:var(--shadow-1)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c-success-bg)] text-[var(--c-success)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <h3 className="mt-4 font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-bold text-[var(--c-ink)]">
          ¡Gracias por tu consulta!
        </h3>
        <p className="mx-auto mt-2 max-w-md text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-[var(--r-xl)] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[shadow:var(--shadow-1)] sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre" required error={fe?.nombre}>
          <Input name="nombre" autoComplete="given-name" />
        </Field>
        <Field label="Apellido" required error={fe?.apellido}>
          <Input name="apellido" autoComplete="family-name" />
        </Field>
        <Field label="Email" required error={fe?.email}>
          <Input type="email" name="email" autoComplete="email" />
        </Field>
        <Field label="Teléfono / WhatsApp" required error={fe?.telefono}>
          <Input name="telefono" inputMode="tel" autoComplete="tel" />
        </Field>

        <Field label="¿Para quién es la consulta?">
          <Select name="paraQuien" value={paraQuien} onChange={(e) => setParaQuien(e.target.value)}>
            {PARA_QUIEN.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {paraQuien === "colegio" && (
          <Field label="Colegio / institución" required error={fe?.institucion}>
            <Input name="institucion" />
          </Field>
        )}

        <Field label="¿Qué te interesa?" required error={fe?.modalidad}>
          <Select name="modalidad" defaultValue="">
            <option value="" disabled>
              Elegí una opción
            </option>
            {MODALIDAD.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Destino de interés" help="Opcional">
          <Select name="destino" defaultValue="">
            <option value="">Elegí un destino</option>
            {DESTINO.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="¿Cuándo te gustaría viajar?" required error={fe?.cuando} className="sm:col-span-2">
          <Select name="cuando" defaultValue="">
            <option value="" disabled>
              Elegí una opción
            </option>
            {CUANDO.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Contanos un poco más" help="Opcional" className="sm:col-span-2">
          <Textarea name="mensaje" />
        </Field>
      </div>

      {/* Honeypot anti-spam: invisible para personas. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <div className="mt-5">
        <Checkbox
          name="acepta"
          required
          label="Acepto que Jóvenes en UK use mis datos para contactarme por esta consulta."
        />
        {fe?.acepta && (
          <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-danger)]">{fe.acepta}</p>
        )}
      </div>

      {state && !state.ok && (
        <p className="mt-3 text-[length:var(--t-small)] font-semibold text-[var(--c-danger)]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-[var(--tap)] w-full items-center justify-center gap-2 rounded-[var(--r-pill)] bg-[var(--c-brand)] px-6 text-[length:var(--t-body)] font-semibold text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] transition-transform active:scale-[0.97] hover:bg-[var(--c-brand-700)] disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Enviando…" : "Quiero que me contacten"}
      </button>
    </form>
  );
}
