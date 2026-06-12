import { Button, Eyebrow, Field, Input, Mono } from "../ui";
import { IconLock } from "../icons";

function BrandPanel() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-[var(--c-header)] p-[var(--s-8)] text-[var(--c-ink-inv)]">
      {/* textura: grid sutil + glow del acento */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--c-border-dark) 1px, transparent 1px), linear-gradient(90deg, var(--c-border-dark) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(120% 100% at 0% 0%, #000 35%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[80px] -top-[80px] size-[280px] rounded-full opacity-40 blur-[80px]"
        style={{ backgroundColor: "var(--c-brand)" }}
      />

      <div className="relative flex items-center gap-[var(--s-3)]">
        <span className="grid size-[40px] place-items-center rounded-[var(--r-md)] bg-[var(--c-brand)] font-[var(--font-display)] text-[length:var(--t-xl)] font-[number:var(--fw-bold)] text-[var(--c-brand-ink)] shadow-[var(--sh-md)]">
          J
        </span>
        <div className="leading-[var(--lh-tight)]">
          <p className="text-[length:var(--t-base)] font-[number:var(--fw-semibold)]">Jóvenes en UK</p>
          <Mono className="text-[length:var(--t-2xs)] uppercase tracking-[var(--ls-wide)] text-[var(--c-ink-inv-2)]">
            Portal Interno
          </Mono>
        </div>
      </div>

      <div className="relative max-w-[360px]">
        <h2 className="font-[var(--font-display)] text-[length:var(--t-2xl)] font-[number:var(--fw-semibold)] leading-[var(--lh-tight)] tracking-[var(--ls-tight)]">
          Todo lo que hace que el viaje salga bien, en un solo lugar.
        </h2>
        <p className="mt-[var(--s-4)] text-[length:var(--t-base)] leading-[var(--lh-normal)] text-[var(--c-ink-inv-2)]">
          Alumnos, viajes, group leaders y seguimiento operativo — coordinados desde la misma consola.
        </p>
      </div>

      <div className="relative flex items-center gap-[var(--s-4)] text-[length:var(--t-2xs)] text-[var(--c-ink-inv-2)]">
        <Mono className="uppercase tracking-[var(--ls-wide)]">v2.6 · Console</Mono>
        <span className="size-[3px] rounded-full bg-[var(--c-ink-inv-2)]" />
        <span>Buenos Aires → Londres</span>
      </div>
    </div>
  );
}

function FormSide() {
  return (
    <div className="flex items-center justify-center p-[var(--s-8)]">
      <div className="w-full max-w-[340px]">
        <Eyebrow>Acceso · Equipo JUK</Eyebrow>
        <h3 className="mt-[var(--s-3)] font-[var(--font-display)] text-[length:var(--t-xl)] font-[number:var(--fw-semibold)] tracking-[var(--ls-tight)] text-[var(--c-ink)]">
          Ingresar al portal
        </h3>
        <p className="mt-[var(--s-2)] text-[length:var(--t-sm)] text-[var(--c-ink-3)]">
          Usá tu cuenta corporativa para continuar.
        </p>

        <form className="mt-[var(--s-6)] flex flex-col gap-[var(--s-4)]">
          <Field label="Email" required htmlFor="l-email">
            <Input id="l-email" type="email" placeholder="vos@jovenesuk.com" defaultValue="agustin@jovenesuk.com" />
          </Field>
          <Field label="Contraseña" required htmlFor="l-pass">
            <Input id="l-pass" type="password" placeholder="••••••••••" defaultValue="superseguro" />
          </Field>

          <Button variant="primary" size="md" className="mt-[var(--s-2)] w-full">
            <IconLock className="size-[14px]" />
            Ingresar
          </Button>

          <a
            href="#viaje"
            className="text-center text-[length:var(--t-sm)] text-[var(--c-ink-3)] transition-colors hover:text-[var(--c-ink)]"
          >
            ¿Olvidaste tu contraseña?{" "}
            <span className="font-[number:var(--fw-medium)] text-[var(--c-brand)] hover:text-[var(--c-brand-hover)]">
              Restablecerla
            </span>
          </a>
        </form>

        <p className="mt-[var(--s-8)] flex items-center justify-center gap-[var(--s-2)] text-[length:var(--t-2xs)] text-[var(--c-ink-4)]">
          <IconLock className="size-[12px]" />
          Conexión cifrada · solo personal autorizado
        </p>
      </div>
    </div>
  );
}

export function Login() {
  return (
    <section id="login" className="scroll-mt-[120px]">
      <div className="mb-[var(--s-4)] flex items-center gap-[var(--s-2)]">
        <Eyebrow>Login · Onboarding</Eyebrow>
        <span className="h-px flex-1 bg-[var(--c-border)]" />
      </div>
      <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--c-border)] shadow-[var(--sh-md)]">
        <div className="grid min-h-[480px] grid-cols-1 md:grid-cols-2">
          <BrandPanel />
          <FormSide />
        </div>
      </div>
    </section>
  );
}
