"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { authClient } from "@/lib/auth/client";

/**
 * Cierra la sesión (Better-Auth) y manda al login. Un <Link href="/login"> no
 * alcanza: el proxy rebota al usuario logueado de vuelta al dashboard.
 *
 * Estilado para el sidebar oscuro (colores onbrand).
 */
export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function salir() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={isPending}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-pill)] text-[var(--c-ink-onbrand-muted)] transition-colors hover:bg-white/10 hover:text-[var(--c-ink-onbrand)] disabled:opacity-55"
    >
      {isPending ? (
        <span className="text-[length:var(--t-label)]">…</span>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4" aria-hidden>
          <path d="M6 2H3v12h3" strokeLinecap="round" />
          <path d="M10 11l3-3-3-3M13 8H6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
