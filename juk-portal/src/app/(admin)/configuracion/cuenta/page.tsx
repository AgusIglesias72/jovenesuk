import { PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/helpers";
import { USUARIO_ROLE_LABELS } from "@/lib/domain/usuarios";

import { CambiarPasswordForm } from "./cambiar-password-form";

export const metadata = { title: "Mi cuenta" };

/**
 * Vive bajo /configuracion (ya cubierto por PORTAL_PREFIXES y por el layout
 * (admin)) pero, a diferencia de /configuracion, la abre cualquier usuario del
 * back-office: requireSession, no requireRole("super_admin").
 */
const ROLE_LABELS: Record<string, string> = {
  ...USUARIO_ROLE_LABELS,
  representante: "Representante",
  familia: "Familia",
};

export default async function CuentaPage() {
  const session = await requireSession();

  return (
    <>
      <PageHeader
        title="Mi cuenta"
        subtitle="Tus datos de acceso al portal y el cambio de contraseña."
      />

      <div className="max-w-xl">
        <dl className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 text-[length:var(--t-small)]">
          <div className="flex gap-3">
            <dt className="w-28 font-semibold text-[var(--c-ink-muted)]">Nombre</dt>
            <dd className="text-[var(--c-ink)]">{session.user.name}</dd>
          </div>
          <div className="mt-2 flex gap-3">
            <dt className="w-28 font-semibold text-[var(--c-ink-muted)]">Email</dt>
            <dd className="font-mono text-[length:var(--t-mono)] text-[var(--c-ink)]">
              {session.user.email}
            </dd>
          </div>
          <div className="mt-2 flex gap-3">
            <dt className="w-28 font-semibold text-[var(--c-ink-muted)]">Rol</dt>
            <dd className="text-[var(--c-ink)]">
              {ROLE_LABELS[session.user.role] ?? session.user.role}
            </dd>
          </div>
        </dl>

        <h2 className="mt-8 font-display text-xl font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          Cambiar contraseña
        </h2>
        <CambiarPasswordForm />
      </div>
    </>
  );
}
