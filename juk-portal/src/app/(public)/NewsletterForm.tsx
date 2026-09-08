"use client";

import { useActionState, useEffect } from "react";

import { track } from "./Analytics";
import { subscribeNewsletter } from "./leads/actions";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);

  useEffect(() => {
    if (state?.ok) track("newsletter_signup");
  }, [state]);

  if (state?.ok) {
    return (
      <p className="mt-5 inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-white/10 px-4 py-2.5 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-onbrand)]">
        <span className="text-[var(--c-honey)]">✓</span>
        {state.data.mensaje}
      </p>
    );
  }

  return (
    <form action={action} className="mt-5 max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="nl-email">
          Tu email
        </label>
        <input
          id="nl-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Tu email"
          className="min-h-[var(--tap)] flex-1 rounded-[var(--r-pill)] border border-white/20 bg-white/10 px-5 text-[length:var(--t-small)] text-[var(--c-ink-onbrand)] placeholder:text-[var(--c-ink-onbrand-muted)] focus-visible:border-white/50 focus-visible:outline-none"
        />
        {/* Honeypot anti-spam: invisible para personas. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[var(--tap)] items-center justify-center rounded-[var(--r-pill)] bg-[image:var(--grad-warm)] px-6 text-[length:var(--t-small)] font-bold text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)] transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Suscribirme"}
        </button>
      </div>
      {state && !state.ok && (
        <p className="mt-2 text-[length:var(--t-small)] text-[var(--c-honey)]">
          {state.fieldErrors?.email?.[0] ?? state.error}
        </p>
      )}
    </form>
  );
}
