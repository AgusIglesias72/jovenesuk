import { Alert, Badge } from "@/components/ui";

import type { EstadoServicios as Estado } from "./actions";

export function EstadoServicios({ estado }: { estado: Estado | null }) {
  return (
    <section
      className="rounded-[var(--r-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[shadow:var(--shadow-1)]"
      data-config-servicios
    >
      <h2 className="font-display text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
        Estado de servicios
      </h2>
      <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
        {estado
          ? `Entorno: ${estado.nodeEnv} · DB: ${estado.dbHost}. Qué está configurado y qué falta.`
          : "Qué está configurado y qué falta."}
      </p>

      {estado ? (
        <>
          <ul className="mt-5 flex flex-col gap-2">
            {estado.servicios.map((s) => (
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
            Remitentes · auto: {estado.mails.automaticos} · com: {estado.mails.comunicaciones}
          </p>
        </>
      ) : (
        <Alert level="warning" title="No pudimos leer el estado de los servicios." className="mt-5">
          Probá recargar la página; si sigue, revisá la conexión con la base.
        </Alert>
      )}
    </section>
  );
}
