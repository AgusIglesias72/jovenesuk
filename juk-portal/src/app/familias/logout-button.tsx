"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { authClient } from "@/lib/auth/client";

/**
 * Cierra la sesión de la familia de verdad (Better-Auth) y manda al login.
 * Un <Link href="/login"> no alcanza: el proxy rebota al usuario logueado de
 * vuelta a su portal.
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
      className="flex min-h-[var(--tap)] items-center rounded-[var(--r-pill)] px-3 text-[length:var(--t-small)] font-semibold text-[var(--c-ink-muted)] transition-colors hover:text-[var(--c-ink)] disabled:opacity-55"
    >
      {isPending ? "Saliendo…" : "Salir"}
    </button>
  );
}
