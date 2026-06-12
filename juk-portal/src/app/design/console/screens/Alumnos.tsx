import { Badge, Button, Card, Checkbox, Eyebrow, Field, Input, Kbd, Mono, Select, Textarea } from "../ui";
import { IconPlus, IconSearch } from "../icons";

const ALUMNOS = [
  { ape: "Acosta", nom: "Martina", dni: "45.218.776", pas: "AAH829014", vto: "12/09/2031", estado: "completado", estadoLabel: "Completo" },
  { ape: "Benítez", nom: "Joaquín", dni: "44.901.332", pas: "AAG118420", vto: "03/02/2030", estado: "en_progreso", estadoLabel: "En progreso" },
  { ape: "Castro", nom: "Valentina", dni: "46.330.918", pas: "—", vto: "—", estado: "pendiente", estadoLabel: "Pendiente" },
  { ape: "Díaz Roldán", nom: "Tomás", dni: "45.776.201", pas: "AAH002915", vto: "21/11/2029", estado: "bloqueado", estadoLabel: "Bloqueado" },
  { ape: "Ferreyra", nom: "Camila", dni: "44.115.889", pas: "AAG774103", vto: "08/06/2032", estado: "completado", estadoLabel: "Completo" },
  { ape: "Gómez", nom: "Lautaro", dni: "46.012.447", pas: "AAH551208", vto: "30/04/2028", estado: "en_progreso", estadoLabel: "En progreso" },
];

function ListPanel() {
  return (
    <Card className="overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--s-3)] border-b border-[var(--c-border)] px-[var(--s-5)] py-[var(--s-4)]">
        <div className="flex items-baseline gap-[var(--s-3)]">
          <h3 className="font-[var(--font-display)] text-[length:var(--t-xl)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Alumnos
          </h3>
          <span className="rounded-[var(--r-full)] bg-[var(--c-surface-3)] px-[var(--s-2)] py-px font-[var(--font-mono)] text-[length:var(--t-2xs)] font-[number:var(--fw-medium)] tabular-nums text-[var(--c-ink-3)]">
            60 alumnos
          </span>
        </div>
        <Button variant="primary" size="sm">
          <IconPlus className="size-[14px]" />
          Nuevo alumno
        </Button>
      </div>

      {/* toolbar de filtros (sticky-feel) */}
      <div className="flex flex-wrap items-center gap-[var(--s-3)] border-b border-[var(--c-border)] bg-[var(--c-surface-2)] px-[var(--s-5)] py-[var(--s-3)]">
        <div className="relative min-w-[240px] flex-1">
          <IconSearch className="pointer-events-none absolute left-[var(--s-3)] top-1/2 size-[15px] -translate-y-1/2 text-[var(--c-ink-4)]" />
          <input
            placeholder="Buscar por nombre, apellido o DNI…"
            className="h-[var(--control-h)] w-full rounded-[var(--r-sm)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] pl-[34px] pr-[58px] text-[length:var(--t-base)] text-[var(--c-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--c-ink-4)] focus:border-[var(--c-brand)] focus:shadow-[var(--sh-focus)]"
          />
          <span className="pointer-events-none absolute right-[var(--s-2)] top-1/2 flex -translate-y-1/2 items-center gap-[2px]">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </div>
        <div className="w-[180px]">
          <Select defaultValue="todos" aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            <option value="completado">Completo</option>
            <option value="en_progreso">En progreso</option>
            <option value="pendiente">Pendiente</option>
            <option value="bloqueado">Bloqueado</option>
          </Select>
        </div>
      </div>

      {/* tabla densa */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--c-border)] bg-[var(--c-surface-2)]">
              {["Alumno", "Pasaporte", "Estado", ""].map((h, i) => (
                <th
                  key={h || "acc"}
                  className={`px-[var(--s-5)] py-[var(--s-2)] text-[length:var(--t-2xs)] font-[number:var(--fw-semibold)] uppercase tracking-[var(--ls-caps)] text-[var(--c-ink-3)] ${i === 3 ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALUMNOS.map((a) => (
              <tr
                key={a.dni}
                className="group border-b border-[var(--c-border)] transition-colors last:border-0 hover:bg-[var(--c-surface-3)]"
              >
                <td className="px-[var(--s-5)] py-[var(--s-2)]" style={{ height: "var(--row-h)" }}>
                  <div className="flex flex-col leading-[var(--lh-snug)]">
                    <span className="text-[length:var(--t-base)] font-[number:var(--fw-medium)] text-[var(--c-ink)]">
                      {a.ape}, <span className="font-[number:var(--fw-regular)] text-[var(--c-ink-2)]">{a.nom}</span>
                    </span>
                    <Mono className="text-[length:var(--t-2xs)] text-[var(--c-ink-3)]">DNI {a.dni}</Mono>
                  </div>
                </td>
                <td className="px-[var(--s-5)] py-[var(--s-2)]">
                  <div className="flex flex-col leading-[var(--lh-snug)]">
                    <Mono className="text-[length:var(--t-sm)] text-[var(--c-ink)]">{a.pas}</Mono>
                    <span className="text-[length:var(--t-2xs)] text-[var(--c-ink-3)]">
                      vto <Mono>{a.vto}</Mono>
                    </span>
                  </div>
                </td>
                <td className="px-[var(--s-5)] py-[var(--s-2)]">
                  <Badge token={a.estado}>{a.estadoLabel}</Badge>
                </td>
                <td className="px-[var(--s-5)] py-[var(--s-2)] text-right">
                  <button className="text-[length:var(--t-sm)] font-[number:var(--fw-medium)] text-[var(--c-brand)] opacity-70 transition-opacity hover:text-[var(--c-brand-hover)] group-hover:opacity-100">
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--c-border)] bg-[var(--c-surface-2)] px-[var(--s-5)] py-[var(--s-2)] text-[length:var(--t-xs)] text-[var(--c-ink-3)]">
        <span>
          Mostrando <Mono className="text-[var(--c-ink-2)]">1–6</Mono> de <Mono className="text-[var(--c-ink-2)]">60</Mono>
        </span>
        <div className="flex gap-[var(--s-2)]">
          <Button variant="ghost" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="secondary" size="sm">
            Siguiente
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid grid-cols-1 gap-x-[var(--s-4)] gap-y-[var(--s-4)] border-t border-[var(--c-border)] py-[var(--s-5)] sm:grid-cols-[180px_1fr]">
      <legend className="sr-only">{title}</legend>
      <div className="sm:pt-[2px]">
        <Eyebrow>{title}</Eyebrow>
      </div>
      <div className="grid grid-cols-1 gap-[var(--s-4)] sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function FormPanel() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-surface-2)] px-[var(--s-5)] py-[var(--s-3)]">
        <div className="flex items-center gap-[var(--s-3)]">
          <span className="grid size-[26px] place-items-center rounded-[var(--r-sm)] bg-[var(--c-brand-soft)] font-[var(--font-mono)] text-[length:var(--t-sm)] font-[number:var(--fw-semibold)] text-[var(--c-brand-soft-ink)]">
            +
          </span>
          <h3 className="text-[length:var(--t-md)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
            Nuevo alumno
          </h3>
        </div>
        <span className="text-[length:var(--t-xs)] text-[var(--c-ink-3)]">
          Los campos con <span className="text-[var(--c-danger)]">*</span> son obligatorios
        </span>
      </div>

      <div className="px-[var(--s-5)]">
        {/* Datos personales — muestra normal, error, help, mono */}
        <FormSection title="Datos personales">
          <Field label="Nombre" required htmlFor="f-nom">
            <Input id="f-nom" defaultValue="Martina" placeholder="Nombre" />
          </Field>
          <Field label="Apellido" required htmlFor="f-ape">
            <Input id="f-ape" defaultValue="Acosta" placeholder="Apellido" />
          </Field>
          <Field label="Fecha de nacimiento" required htmlFor="f-fnac" hint="Formato DD/MM/AAAA">
            <Input id="f-fnac" mono defaultValue="14/03/2009" placeholder="DD/MM/AAAA" />
          </Field>
          <Field label="DNI" required htmlFor="f-dni">
            <Input id="f-dni" mono defaultValue="45.218.776" placeholder="00.000.000" />
          </Field>
          <Field
            label="N° de pasaporte"
            required
            htmlFor="f-pas"
            error="Pasaporte requerido para viajes a UK."
          >
            <Input id="f-pas" mono error placeholder="AAH000000" defaultValue="" />
          </Field>
          <Field
            label="Vencimiento del pasaporte"
            required
            htmlFor="f-vto"
            hint="Debe estar vigente hasta el fin del viaje."
          >
            <Input id="f-vto" mono defaultValue="12/09/2031" placeholder="DD/MM/AAAA" />
          </Field>
        </FormSection>

        {/* Contacto — muestra focus (autofocus visual) + disabled */}
        <FormSection title="Contacto">
          <Field label="Email del alumno" htmlFor="f-email" hint="Opcional para menores de 16.">
            <Input id="f-email" type="email" placeholder="alumno@email.com" />
          </Field>
          <Field label="Celular del alumno" htmlFor="f-cel-al">
            <Input id="f-cel-al" mono placeholder="+54 9 11 0000-0000" />
          </Field>
          <Field
            label="Legajo interno"
            htmlFor="f-leg"
            hint="Se genera automáticamente al guardar."
            className="sm:col-span-2"
          >
            <Input id="f-leg" mono disabled defaultValue="JUK-——————" />
          </Field>
        </FormSection>

        {/* Tutor 1 */}
        <FormSection title="Tutor 1">
          <Field label="Nombre y apellido" required htmlFor="f-tut-nom">
            <Input
              id="f-tut-nom"
              defaultValue="Laura Acosta"
              placeholder="Nombre del tutor"
              className="border-[var(--c-brand)] shadow-[var(--sh-focus)]"
            />
          </Field>
          <Field label="Celular" required htmlFor="f-tut-cel">
            <Input id="f-tut-cel" mono defaultValue="+54 9 11 5566-7788" placeholder="+54 9 11 0000-0000" />
          </Field>
          <Field
            label="Email"
            required
            htmlFor="f-tut-email"
            error="Ingresá un email válido (ej.: nombre@dominio.com)."
            className="sm:col-span-2"
          >
            <Input id="f-tut-email" type="email" error defaultValue="laura.acosta@" />
          </Field>
        </FormSection>

        {/* Facturación — select */}
        <FormSection title="Facturación">
          <Field label="Condición fiscal" htmlFor="f-fiscal" required>
            <Select id="f-fiscal" defaultValue="cf">
              <option value="cf">Consumidor final</option>
              <option value="ri">Responsable inscripto</option>
              <option value="mono">Monotributista</option>
              <option value="exento">Exento</option>
            </Select>
          </Field>
          <Field label="CUIT / CUIL" htmlFor="f-cuit" hint="Requerido si no es consumidor final.">
            <Input id="f-cuit" mono placeholder="00-00000000-0" />
          </Field>
        </FormSection>

        {/* Preferencias — textarea + checkboxes */}
        <FormSection title="Preferencias">
          <Field
            label="Notas y requerimientos"
            htmlFor="f-notas"
            hint="Alergias, dieta, acompañamiento, etc."
            className="sm:col-span-2"
          >
            <Textarea
              id="f-notas"
              placeholder="Ej.: vegetariana, alergia a frutos secos, viaja con su prima Camila Ferreyra…"
              defaultValue="Vegetariana. Preferencia de habitación compartida con Camila Ferreyra."
            />
          </Field>
          <div className="flex flex-col gap-[var(--s-3)] sm:col-span-2">
            <Checkbox
              id="f-chk-consent"
              label="Consentimiento parental firmado"
              hint="Confirmá solo si ya recibiste el formulario físico."
              defaultChecked
            />
            <Checkbox
              id="f-chk-news"
              label="Suscribir a novedades del viaje por email"
              defaultChecked={false}
            />
            <Checkbox
              id="f-chk-medic"
              label="Cobertura médica internacional gestionada por JUK"
              hint="Bloqueado hasta confirmar el viaje."
              checked={false}
              disabled
            />
          </div>
        </FormSection>
      </div>

      {/* footer sticky de acciones */}
      <div className="sticky bottom-0 flex items-center justify-between gap-[var(--s-3)] border-t border-[var(--c-border)] bg-[var(--c-surface-2)]/95 px-[var(--s-5)] py-[var(--s-3)] backdrop-blur">
        <span className="text-[length:var(--t-xs)] text-[var(--c-ink-3)]">
          2 campos requieren atención antes de guardar.
        </span>
        <div className="flex gap-[var(--s-2)]">
          <Button variant="ghost" size="md">
            Cancelar
          </Button>
          <Button variant="primary" size="md">
            Crear alumno
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function Alumnos() {
  return (
    <section id="alumnos" className="scroll-mt-[120px]">
      <div className="mb-[var(--s-4)] flex items-center gap-[var(--s-2)]">
        <Eyebrow>ABM · Alumnos</Eyebrow>
        <span className="h-px flex-1 bg-[var(--c-border)]" />
      </div>
      <div className="grid grid-cols-1 gap-[var(--s-5)] xl:grid-cols-[minmax(0,420px)_1fr]">
        <ListPanel />
        <FormPanel />
      </div>
    </section>
  );
}
