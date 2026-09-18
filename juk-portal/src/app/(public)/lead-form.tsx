"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { CUANDO, DESTINO, MODALIDAD, PARA_QUIEN } from "@/lib/domain/leads";
import {
  ENLACE_POLITICA,
  TEXTO_CONSENTIMIENTO,
} from "@/lib/domain/privacidad/politica";

import { track } from "./analytics";
import { submitLead } from "./leads/actions";

/**
 * El consentimiento se parte en el nombre de la política para poder linkearla
 * sin reescribir la frase: lo que se muestra tiene que ser palabra por palabra
 * el texto versionado del dominio. Que `TEXTO_CONSENTIMIENTO` contenga
 * `ENLACE_POLITICA` lo garantiza `politica.test.ts`.
 */
const [ANTES_DEL_ENLACE = "", DESPUES_DEL_ENLACE = ""] =
  TEXTO_CONSENTIMIENTO.split(ENLACE_POLITICA);

export function LeadForm() {
  const [state, action, pending] = useActionState(submitLead, null);
  const [paraQuien, setParaQuien] = useState<string>("para_mi");
  // Mismo helper que los forms del back-office: primer mensaje por campo.
  const fe = (k: string) => (state && !state.ok ? state.fieldErrors?.[k]?.[0] : undefined);

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
          {state.data.mensaje}
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
        <Field label="Nombre" required error={fe("nombre")}>
          <Input name="nombre" autoComplete="given-name" />
        </Field>
        <Field label="Apellido" required error={fe("apellido")}>
          <Input name="apellido" autoComplete="family-name" />
        </Field>
        <Field label="Email" required error={fe("email")}>
          <Input type="email" name="email" autoComplete="email" />
        </Field>
        <Field label="Teléfono / WhatsApp" required error={fe("telefono")}>
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
          <Field label="Colegio / institución" required error={fe("institucion")}>
            <Input name="institucion" />
          </Field>
        )}

        <Field label="¿Qué te interesa?" required error={fe("modalidad")}>
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
        <Field label="¿Cuándo te gustaría viajar?" required error={fe("cuando")} className="sm:col-span-2">
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
          // El <label> del Checkbox envuelve al input, así que el link queda
          // adentro. No tilda la casilla: el HTML exime a la activación del
          // label cuando el click apunta a contenido interactivo (un <a href>).
          // aria-label deja el nombre accesible clavado en la frase completa,
          // sin depender de cómo cada lector aplane el link.
          aria-label={TEXTO_CONSENTIMIENTO}
          aria-invalid={fe("acepta") ? true : undefined}
          aria-describedby={fe("acepta") ? "error-acepta" : undefined}
          // Mismo ajuste que el consentimiento de /inscripcion: el objetivo
          // táctil lo lleva el input, y el texto legal se tiene que poder copiar.
          className="items-start min-h-0 select-text"
          label={
            <span className="text-[length:var(--t-small)] leading-[var(--lh-body)]">
              {ANTES_DEL_ENLACE}
              <Link
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--c-brand)] underline underline-offset-2 hover:text-[var(--c-brand-700)]"
              >
                {ENLACE_POLITICA}
              </Link>
              {DESPUES_DEL_ENLACE}
            </span>
          }
        />
        {fe("acepta") && (
          <p id="error-acepta" className="mt-1 text-[length:var(--t-small)] text-[var(--c-danger)]">
            {fe("acepta")}
          </p>
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
