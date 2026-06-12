import { badgePaso, badgePolice, badgeViaje, groupLeaders, pasosM7, viajeDetalle } from "./data";
import {
  Button,
  Card,
  CardHeader,
  Eyebrow,
  FieldLabel,
  GoldTick,
  Input,
  Select,
  StateBadge,
  Textarea,
} from "./primitives";

function DataPoint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--c-rule)] pt-3">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 text-[length:var(--t-body)] text-[var(--c-ink)]">{children}</div>
    </div>
  );
}

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {children}
    </div>
  );
}

export function ScreenViaje() {
  const bv = badgeViaje[viajeDetalle.estado];
  const pasoActivoN = "01"; // "Pasajes" es el paso con el editor abierto

  return (
    <div className="mx-auto max-w-[72rem] px-[var(--sp-5)] py-[var(--sp-8)]">
      {/* Header */}
      <header className="mb-[var(--sp-7)] flex flex-wrap items-start justify-between gap-4 border-b border-[var(--c-border)] pb-[var(--sp-5)]">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <GoldTick />
            <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-mono)] tracking-tight text-[var(--c-ink-muted)]">
              {viajeDetalle.codigo}
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-light leading-[var(--lh-tight)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            {viajeDetalle.titulo}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StateBadge fg={bv.fg} bg={bv.bg}>
            {bv.label}
          </StateBadge>
          <Button variant="secondary">Editar viaje</Button>
        </div>
      </header>

      {/* Grilla de datos */}
      <div className="mb-[var(--sp-8)] grid gap-x-[var(--sp-6)] gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <DataPoint label="Estado">
          <StateBadge fg={bv.fg} bg={bv.bg}>
            {bv.label}
          </StateBadge>
        </DataPoint>
        <DataPoint label="Fechas">
          <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-mono)]">{viajeDetalle.fechas}</span>
        </DataPoint>
        <DataPoint label="Destino">{viajeDetalle.destino}</DataPoint>
        <DataPoint label="Curso">{viajeDetalle.curso}</DataPoint>
        <DataPoint label="Origen">{viajeDetalle.origen}</DataPoint>
        <DataPoint label="Group Leaders">{viajeDetalle.groupLeaders}</DataPoint>
        <DataPoint label="Cupo">
          <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-mono)]">
            {viajeDetalle.cupo}/{viajeDetalle.cupoMax}
          </span>
        </DataPoint>
        <DataPoint label="Cupo mínimo">
          <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-mono)]">{viajeDetalle.cupoMin}</span>
        </DataPoint>
      </div>

      <div className="grid gap-[var(--sp-5)] lg:grid-cols-2">
        {/* Alumnos asignados — estado vacío */}
        <Card className="space-y-[var(--sp-5)]">
          <CardHeader eyebrow="Inscripción" title="Alumnos asignados" />
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <FieldLabel htmlFor="asignar">Asignar alumno</FieldLabel>
              <Select id="asignar" defaultValue="">
                <option value="" disabled>
                  Elegí un alumno…
                </option>
                <option>Álvarez, Martina</option>
                <option>Benedetti, Joaquín</option>
                <option>Esquivel, Valentina</option>
              </Select>
            </div>
            <Button variant="gold">Asignar</Button>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-surface-2)]/50 px-6 py-10 text-center">
            <span className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] text-[var(--c-ink-subtle)]">
              Todavía no hay alumnos asignados
            </span>
            <p className="max-w-xs text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
              El cupo es 0 de {viajeDetalle.cupoMax}. Asigná al menos {viajeDetalle.cupoMin} para confirmar el viaje.
            </p>
          </div>
        </Card>

        {/* Group Leaders */}
        <Card flush>
          <div className="p-[var(--sp-5)]">
            <CardHeader eyebrow="Acompañamiento" title="Group Leaders del viaje" />
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-[var(--c-border)] bg-[var(--c-surface-2)]">
                {["Líder", "Police check", ""].map((h) => (
                  <th
                    key={h}
                    className="px-[var(--sp-5)] py-2.5 text-[length:var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupLeaders.map((gl) => {
                const bp = badgePolice[gl.police];
                return (
                  <tr key={gl.nombre} className="border-b border-[var(--c-rule)] last:border-0">
                    <td className="px-[var(--sp-5)] py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--c-ink)]">{gl.nombre}</span>
                        {gl.principal ? (
                          <span className="rounded-[var(--r-xs)] bg-[var(--c-gold-soft)] px-1.5 py-0.5 text-[length:var(--t-label)] font-semibold uppercase tracking-[0.1em] text-[var(--c-gold)]">
                            Principal
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">{gl.rol}</div>
                    </td>
                    <td className="px-[var(--sp-5)] py-3.5">
                      <StateBadge fg={bp.fg} bg={bp.bg}>
                        {bp.label}
                      </StateBadge>
                    </td>
                    <td className="px-[var(--sp-5)] py-3.5 text-right">
                      <Button variant="ghost" size="sm">
                        Ver →
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Seguimiento M7 */}
      <section className="mt-[var(--sp-8)]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1">
              <Eyebrow gold>Operación · Pre-viaje</Eyebrow>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-medium tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Seguimiento del viaje · M7
            </h2>
          </div>
          <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">1 de 5 pasos completados</span>
        </div>

        {/* Tira de pasos */}
        <div className="mb-[var(--sp-5)] grid gap-[var(--sp-3)] sm:grid-cols-2 lg:grid-cols-5">
          {pasosM7.map((p) => {
            const b = badgePaso[p.estado];
            const isActive = p.n === pasoActivoN;
            return (
              <div
                key={p.n}
                className={`relative flex flex-col gap-3 rounded-[var(--r-lg)] border bg-[var(--c-surface)] p-[var(--sp-4)] shadow-[var(--shadow-1)] transition-shadow ${
                  isActive ? "border-[var(--c-gold)] ring-1 ring-[var(--c-gold)]" : "border-[var(--c-border)] hover:shadow-[var(--shadow-2)]"
                }`}
              >
                <span className="font-[family-name:var(--font-display)] text-[1.75rem] font-light leading-none text-[var(--c-border-strong)]">
                  {p.n}
                </span>
                <span className="text-[length:var(--t-small)] font-medium leading-[var(--lh-snug)] text-[var(--c-ink)]">{p.nombre}</span>
                <StateBadge fg={b.fg} bg={b.bg}>
                  {b.label}
                </StateBadge>
                {"aviso" in p && p.aviso ? (
                  <span className="flex items-center gap-1 text-[length:var(--t-label)] font-medium uppercase tracking-[0.08em] text-[var(--c-danger)]">
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M8 1.5L15 14H1z" strokeLinejoin="round" />
                      <path d="M8 6.5v3M8 11.4v.1" strokeLinecap="round" />
                    </svg>
                    {p.aviso}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Editor del paso activo: Pasajes */}
        <Card className="space-y-[var(--sp-5)]">
          <CardHeader eyebrow="Paso 01" title="Pasajes" action={<StateBadge fg={badgePaso.en_progreso.fg} bg={badgePaso.en_progreso.bg}>{badgePaso.en_progreso.label}</StateBadge>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="subestado" label="Sub-estado">
              <Select id="subestado" defaultValue="reservado">
                <option value="cotizando">Cotizando</option>
                <option value="reservado">Reservado · sin emitir</option>
                <option value="emitido">Emitido</option>
              </Select>
            </Field>
            <Field id="aerolinea" label="Aerolínea">
              <Input id="aerolinea" defaultValue="British Airways" />
            </Field>
            <Field id="vuelo" label="N° de vuelo">
              <Input id="vuelo" defaultValue="BA246" />
            </Field>
            <div className="sm:col-span-2 lg:col-span-1">
              <Field id="eticket" label="E-ticket URL">
                <Input id="eticket" type="url" placeholder="https://…" />
              </Field>
            </div>
            <Field id="salida" label="Fecha de salida">
              <Input id="salida" defaultValue="04/07/2026" />
            </Field>
            <Field id="regreso" label="Fecha de regreso">
              <Input id="regreso" defaultValue="25/07/2026" />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field id="notas-pasaje" label="Notas">
                <Textarea id="notas-pasaje" rows={3} placeholder="Escalas, equipaje, observaciones de la reserva…" />
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[var(--c-border)] pt-[var(--sp-4)]">
            <Button variant="ghost">Cancelar</Button>
            <Button>Guardar datos</Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
