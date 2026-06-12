import { Button, Eyebrow, FieldLabel, GoldTick, Input } from "./primitives";

export function ScreenLogin() {
  return (
    <div className="px-[var(--sp-5)] py-[var(--sp-7)]">
      <div className="mx-auto grid max-w-[72rem] overflow-hidden rounded-[var(--r-lg)] border border-[var(--c-border)] shadow-[var(--shadow-3)] lg:grid-cols-2">
        {/* Panel de marca */}
        <div className="relative flex min-h-[34rem] flex-col justify-between overflow-hidden bg-[var(--c-surface-inverse)] p-[var(--sp-7)] text-[var(--c-ink-onbrand)]">
          {/* textura sutil */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 15%, var(--c-gold) 0, transparent 38%), radial-gradient(circle at 90% 85%, var(--c-coral) 0, transparent 40%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(var(--c-ink-onbrand) 1px, transparent 1px), linear-gradient(90deg, var(--c-ink-onbrand) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--c-gold)] font-[family-name:var(--font-display)] text-2xl font-medium text-[#211803]">
              J
            </span>
            <div className="leading-tight">
              <div className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-medium">Jóvenes en UK</div>
              <div className="text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onbrand-muted)]">
                Portal Interno
              </div>
            </div>
          </div>

          <div className="relative">
            <GoldTick className="mb-5 w-12" />
            <p className="max-w-sm font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-light leading-[1.15] tracking-[var(--ls-tight)]">
              Todo lo que hace que el viaje <span className="italic text-[var(--c-gold-bright)]">salga bien</span>, en un solo lugar.
            </p>
          </div>

          <div className="relative flex items-center gap-6 text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-onbrand-muted)]">
            <span>Viajes de estudio</span>
            <span className="h-1 w-1 rounded-full bg-[var(--c-gold)]" />
            <span>Argentina → UK</span>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex flex-col justify-center bg-[var(--c-surface)] p-[var(--sp-7)]">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-2">
              <Eyebrow gold>Acceso</Eyebrow>
            </div>
            <h1 className="mb-2 font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-light tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              Ingresar al portal
            </h1>
            <p className="mb-[var(--sp-6)] text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              Usá tu cuenta de equipo. Si no la tenés, pedísela a un administrador.
            </p>

            <form className="space-y-[var(--sp-5)]">
              <div>
                <FieldLabel htmlFor="login-email" required>
                  Email
                </FieldLabel>
                <Input id="login-email" type="email" placeholder="vos@jovenesenuk.com" />
              </div>
              <div>
                <FieldLabel htmlFor="login-pass" required>
                  Contraseña
                </FieldLabel>
                <Input id="login-pass" type="password" defaultValue="••••••••••" />
              </div>
              <Button type="submit" className="w-full">
                Ingresar
              </Button>
            </form>

            <p className="mt-[var(--sp-5)] text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              ¿Olvidaste tu contraseña?{" "}
              <a
                href="#"
                className="font-medium text-[var(--c-brand)] underline decoration-[var(--c-gold)] decoration-2 underline-offset-4 hover:text-[var(--c-brand-600)]"
              >
                Restablecerla
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
