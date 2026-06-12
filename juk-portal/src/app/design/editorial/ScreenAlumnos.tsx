import { alumnos, badgePaso } from "./data";
import {
  Button,
  Card,
  Checkbox,
  Eyebrow,
  FieldLabel,
  GoldTick,
  Help,
  Input,
  Rule,
  Select,
  StateBadge,
  Textarea,
} from "./primitives";

function Field({
  label,
  required,
  id,
  children,
  help,
  error,
}: {
  label: string;
  required?: boolean;
  id: string;
  children: React.ReactNode;
  help?: string;
  error?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {children}
      {error ? <Help error>{error}</Help> : help ? <Help>{help}</Help> : null}
    </div>
  );
}

function FormSection({
  step,
  title,
  desc,
  children,
}: {
  step: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-[var(--sp-6)] gap-y-4 border-t border-[var(--c-border)] pt-[var(--sp-6)] md:grid-cols-[14rem_1fr]">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[length:var(--t-label)] text-[var(--c-gold)]">{step}</span>
          <GoldTick className="w-5" />
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-medium tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          {title}
        </h3>
        {desc ? <p className="mt-1 text-[length:var(--t-small)] leading-[var(--lh-snug)] text-[var(--c-ink-subtle)]">{desc}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function ScreenAlumnos() {
  return (
    <div className="mx-auto max-w-[72rem] px-[var(--sp-5)] py-[var(--sp-8)]">
      {/* ── Lista ── */}
      <header className="mb-[var(--sp-6)] flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2">
            <Eyebrow gold>Registro · Cartera</Eyebrow>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-light tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Alumnos
          </h1>
          <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
            <span className="font-[family-name:var(--font-mono)] text-[var(--c-ink)]">60</span> alumnos en cartera
          </p>
        </div>
        <Button>
          <span className="text-[1.1em] leading-none">+</span> Nuevo alumno
        </Button>
      </header>

      <Card flush className="mb-[var(--sp-8)] overflow-hidden">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface-2)] p-[var(--sp-4)]">
          <div className="relative min-w-[16rem] flex-1">
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--c-ink-subtle)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="M14 14l3 3" strokeLinecap="round" />
            </svg>
            <Input placeholder="Buscar por apellido, DNI o pasaporte…" className="pl-9" />
          </div>
          <div className="w-52">
            <Select defaultValue="todos">
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En progreso</option>
              <option value="completado">Completado</option>
              <option value="bloqueado">Bloqueado</option>
            </Select>
          </div>
        </div>

        {/* Tabla */}
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              {["Alumno", "Pasaporte", "Estado", ""].map((h) => (
                <th
                  key={h}
                  className="px-[var(--sp-5)] py-3 text-[length:var(--t-label)] font-semibold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a) => {
              const b = badgePaso[a.estado];
              return (
                <tr key={a.dni} className="border-b border-[var(--c-rule)] transition-colors last:border-0 hover:bg-[var(--c-overlay)]">
                  <td className="px-[var(--sp-5)] py-3.5">
                    <div className="font-medium text-[var(--c-ink)]">
                      {a.apellido}, <span className="font-normal">{a.nombre}</span>
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-[length:var(--t-mono)] text-[var(--c-ink-subtle)]">
                      DNI {a.dni}
                    </div>
                  </td>
                  <td className="px-[var(--sp-5)] py-3.5">
                    <div className="font-[family-name:var(--font-mono)] text-[length:var(--t-mono)] text-[var(--c-ink)]">{a.pasaporte}</div>
                    <div className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                      {a.vto === "—" ? "Sin pasaporte" : `vto ${a.vto}`}
                    </div>
                  </td>
                  <td className="px-[var(--sp-5)] py-3.5">
                    <StateBadge fg={b.fg} bg={b.bg}>
                      {b.label}
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

      {/* ── Formulario (la estrella) ── */}
      <div className="mb-5 flex items-center gap-4">
        <h2 className="font-[family-name:var(--font-display)] text-[length:var(--t-h2)] font-medium tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          Nuevo alumno
        </h2>
        <Rule className="flex-1" />
        <Eyebrow>Borrador · sin guardar</Eyebrow>
      </div>

      <Card className="space-y-[var(--sp-6)]">
        <FormSection step="01" title="Datos personales" desc="Tal cual figuran en el documento y el pasaporte.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nombre" label="Nombre" required>
              <Input id="nombre" defaultValue="Camila" />
            </Field>
            <Field id="apellido" label="Apellido" required>
              {/* estado FOCUS demostrado */}
              <Input id="apellido" defaultValue="Rossi" focused />
            </Field>
            <Field id="nacimiento" label="Fecha de nacimiento" required help="Formato DD/MM/AAAA.">
              <Input id="nacimiento" defaultValue="14/03/2009" />
            </Field>
            <Field id="dni" label="DNI" required>
              <Input id="dni" placeholder="00.000.000" />
            </Field>
            <Field id="pasaporte" label="N° de pasaporte" required>
              <Input id="pasaporte" defaultValue="AAH" />
            </Field>
            {/* estado ERROR demostrado */}
            <Field
              id="vto-pas"
              label="Vencimiento del pasaporte"
              required
              error="El pasaporte debe estar vigente hasta el fin del viaje (25/07/2026)."
            >
              <Input id="vto-pas" defaultValue="10/07/2026" error />
            </Field>
          </div>
        </FormSection>

        <FormSection step="02" title="Contacto" desc="Cómo llegamos al alumno.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="email-alumno" label="Email">
              <Input id="email-alumno" type="email" placeholder="alumno@email.com" />
            </Field>
            <Field id="cel-alumno" label="Celular" help="Con código de área, sin 0 ni 15.">
              <Input id="cel-alumno" placeholder="11 0000 0000" />
            </Field>
          </div>
        </FormSection>

        <FormSection step="03" title="Tutor 1" desc="Responsable principal del menor.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="tutor-nombre" label="Nombre" required>
              <Input id="tutor-nombre" placeholder="Nombre y apellido" />
            </Field>
            <Field id="tutor-cel" label="Celular" required>
              <Input id="tutor-cel" placeholder="11 0000 0000" />
            </Field>
            <div className="sm:col-span-2">
              <Field id="tutor-email" label="Email" required>
                <Input id="tutor-email" type="email" placeholder="tutor@email.com" />
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection step="04" title="Facturación" desc="Para la emisión de comprobantes.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cond-fiscal" label="Condición fiscal" required>
              <Select id="cond-fiscal" defaultValue="cf">
                <option value="cf">Consumidor final</option>
                <option value="ri">Responsable inscripto</option>
                <option value="mono">Monotributista</option>
                <option value="exento">Exento</option>
              </Select>
            </Field>
            <Field id="cuit" label="CUIT / CUIL" help="Opcional para consumidor final.">
              <Input id="cuit" placeholder="00-00000000-0" />
            </Field>
            {/* estado DISABLED demostrado */}
            <Field id="razon" label="Razón social" help="Se habilita para Responsable inscripto.">
              <Input id="razon" placeholder="—" disabled />
            </Field>
            <div className="flex items-end pb-1">
              <Checkbox id="mismo-tutor" label="Facturar a nombre del Tutor 1" defaultChecked />
            </div>
          </div>
        </FormSection>

        <FormSection step="05" title="Preferencias" desc="Restricciones, salud, convivencia.">
          <Field
            id="prefs"
            label="Notas y preferencias"
            help="Alergias, dieta, compañeros de habitación, lo que el Group Leader deba saber."
          >
            <Textarea
              id="prefs"
              rows={4}
              defaultValue="Vegetariana. Preferiría compartir habitación con compañeras del mismo colegio."
            />
          </Field>
          <div className="grid gap-2.5 pt-1 sm:grid-cols-2">
            <Checkbox id="autoriza-img" label="El tutor autoriza el uso de imágenes en redes de JUK." defaultChecked />
            <Checkbox id="newsletter" label="Recibir novedades de la temporada por email." />
            <Checkbox id="seguro" label="Cuenta con cobertura médica internacional propia." />
            <Checkbox id="bloqueado-ej" label="(Ejemplo) Opción deshabilitada" disabled />
          </div>
        </FormSection>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--c-border)] pt-[var(--sp-5)]">
          <span className="mr-auto flex items-center gap-1.5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            <span className="text-[var(--c-coral)]">*</span> Campos obligatorios
          </span>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="secondary">Guardar borrador</Button>
          <Button>Crear alumno</Button>
        </div>
      </Card>
    </div>
  );
}
