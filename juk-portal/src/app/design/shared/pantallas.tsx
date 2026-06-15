"use client";

/*
 * Sección "Pantallas" de la dirección STUDIO: carousel con las pantallas
 * que un usuario puede ver SIN estar adentro de la app — login, recupero
 * de contraseña, invitación, links vencidos.
 */
import { useState, type ReactNode } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  Screen,
  ScreenHeading,
  cn,
} from "./primitives";

/* ════════════════════════════════════════════════════════════════
 * Panel de marca (mitad izquierda de las pantallas con formulario)
 * ════════════════════════════════════════════════════════════════ */

function BrandPanel({
  headline,
  copy,
  kicker = "Portal Interno",
}: {
  headline: string;
  copy: string;
  kicker?: string;
}) {
  return (
    <div className="relative flex min-h-[200px] flex-col justify-between overflow-hidden p-8 text-[var(--c-ink-onbrand)] lg:min-h-[540px]">
      <div className="absolute inset-0" style={{ backgroundImage: "var(--grad-brand)" }} />
      <div
        className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30 blur-2xl"
        style={{ backgroundImage: "var(--grad-warm)" }}
      />
      <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[var(--c-brand-500)] opacity-30 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <span
          className="grid h-12 w-12 place-items-center rounded-[var(--r-lg)] text-[var(--c-ink-onaccent)] shadow-[shadow:var(--shadow-accent)]"
          style={{ backgroundImage: "var(--grad-warm)" }}
        >
          <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold">J</span>
        </span>
        <div className="leading-tight">
          <p className="font-[family-name:var(--font-display)] font-bold">Jóvenes en UK</p>
          <p className="text-[length:var(--t-small)] text-[var(--c-ink-onbrand-muted)]">{kicker}</p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <p className="font-[family-name:var(--font-display)] text-[length:var(--t-display-2)] font-extrabold leading-[var(--lh-tight)] tracking-[var(--ls-tight)]">
          {headline}
        </p>
        <p className="mt-4 max-w-sm text-[var(--c-ink-onbrand-muted)]">{copy}</p>
      </div>

      <div className="relative hidden gap-2 lg:flex">
        <span className="h-2 w-8 rounded-[var(--r-pill)] bg-[var(--c-accent)]" />
        <span className="h-2 w-2 rounded-[var(--r-pill)] bg-[var(--c-ink-onbrand-muted)]" />
        <span className="h-2 w-2 rounded-[var(--r-pill)] bg-[var(--c-ink-onbrand-muted)]" />
      </div>
    </div>
  );
}

/* Layout de pantalla partida: marca izquierda + contenido derecha */
function SplitShell({
  brand,
  children,
}: {
  brand: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid lg:grid-cols-2">
      {brand}
      <div className="flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

/* Layout de pantalla centrada (estados sin formulario largo) */
function CenterShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-[540px] items-center justify-center overflow-hidden p-8"
      style={{ backgroundImage: "var(--grad-page)" }}
    >
      <div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundImage: "var(--grad-warm)" }}
        aria-hidden
      />
      <div
        className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[var(--c-brand-300)] opacity-20 blur-3xl"
        aria-hidden
      />
      <div className="relative w-full max-w-md text-center">{children}</div>
    </div>
  );
}

function FormTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h3 className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        {title}
      </h3>
      <p className="mt-1 text-[length:var(--t-small)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">{sub}</p>
    </>
  );
}

function BackToLogin() {
  return (
    <p className="mt-6 text-center text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
      <a className="font-semibold text-[var(--c-brand)] hover:underline" href="#pantallas">
        ← Volver al login
      </a>
    </p>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Las pantallas
 * ════════════════════════════════════════════════════════════════ */

function PantallaLogin() {
  return (
    <SplitShell
      brand={
        <BrandPanel
          headline="Todo lo que hace que el viaje salga bien, en un solo lugar."
          copy="Alumnos, viajes, group leaders y el seguimiento de cada paso — del primer formulario al regreso a casa."
        />
      }
    >
      <FormTitle title="Ingresar al portal" sub="Usá tu cuenta del equipo de Jóvenes en UK." />
      <form className="mt-8 space-y-4">
        <div>
          <Label htmlFor="p-login-email" required>
            Email
          </Label>
          <Input id="p-login-email" type="email" placeholder="vos@jovenesuk.com" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="p-login-pass" required>
              Contraseña
            </Label>
            <a href="#pantallas" className="text-[length:var(--t-small)] font-semibold text-[var(--c-brand)] hover:underline">
              ¿La olvidaste?
            </a>
          </div>
          <Input id="p-login-pass" type="password" placeholder="••••••••" />
        </div>
        <Checkbox id="p-login-remember" label="Mantener la sesión iniciada" defaultChecked />
        <Button type="submit" variant="primary" className="w-full">
          Ingresar
        </Button>
      </form>
    </SplitShell>
  );
}

function PantallaRecupero() {
  return (
    <SplitShell
      brand={
        <BrandPanel
          headline="Pasa en las mejores familias."
          copy="Te mandamos un link seguro a tu correo y en un minuto estás de vuelta adentro."
        />
      }
    >
      <FormTitle
        title="Recuperar contraseña"
        sub="Decinos tu email del equipo y te mandamos un link para crear una nueva."
      />
      <form className="mt-8 space-y-4">
        <div>
          <Label htmlFor="p-rec-email" required>
            Email
          </Label>
          <Input id="p-rec-email" type="email" placeholder="vos@jovenesuk.com" autoFocus />
        </div>
        <Button type="submit" variant="primary" className="w-full">
          Mandarme el link
        </Button>
      </form>
      <BackToLogin />
    </SplitShell>
  );
}

function PantallaEmailEnviado() {
  return (
    <CenterShell>
      <span
        className="mx-auto grid h-20 w-20 place-items-center rounded-[var(--r-xl)] bg-[var(--c-surface)] text-4xl shadow-[shadow:var(--shadow-2)]"
        aria-hidden
      >
        ✉️
      </span>
      <h3 className="mt-6 font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        Revisá tu correo
      </h3>
      <p className="mt-2 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Le mandamos un link para restablecer la contraseña a{" "}
        <span className="font-semibold text-[var(--c-ink)]">a•••@jovenesuk.com</span>. Vence en 30
        minutos.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Button variant="primary">Abrir mi correo</Button>
        <p className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
          ¿No llegó? Mirá spam o{" "}
          <a href="#pantallas" className="font-semibold text-[var(--c-brand)] hover:underline">
            reenvialo en 0:42
          </a>
        </p>
      </div>
    </CenterShell>
  );
}

const REQUISITOS = [
  { label: "Al menos 8 caracteres", ok: true },
  { label: "Una mayúscula y una minúscula", ok: true },
  { label: "Al menos un número", ok: false },
] as const;

function PantallaNuevaContrasena() {
  return (
    <SplitShell
      brand={
        <BrandPanel
          headline="Una nueva, fácil de recordar, difícil de adivinar."
          copy="Elegí una contraseña que uses solo en el portal. Nada de la fecha de cumpleaños."
        />
      }
    >
      <FormTitle title="Crear nueva contraseña" sub="Estás cambiando la contraseña de agustin@jovenesuk.com." />
      <form className="mt-8 space-y-4">
        <div>
          <Label htmlFor="p-new-pass" required>
            Nueva contraseña
          </Label>
          <Input id="p-new-pass" type="password" defaultValue="JukLondres" />
          <ul className="mt-2.5 space-y-1.5">
            {REQUISITOS.map((r) => (
              <li
                key={r.label}
                className="flex items-center gap-2 text-[length:var(--t-small)]"
                style={{ color: r.ok ? "var(--c-success)" : "var(--c-ink-subtle)" }}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold",
                    r.ok ? "text-[var(--c-surface)]" : "text-[var(--c-ink-subtle)]",
                  )}
                  style={{
                    backgroundColor: r.ok ? "var(--c-success)" : "var(--c-surface-2)",
                  }}
                  aria-hidden
                >
                  {r.ok ? "✓" : "·"}
                </span>
                {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Label htmlFor="p-new-pass2" required>
            Repetila
          </Label>
          <Input id="p-new-pass2" type="password" placeholder="••••••••" />
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled>
          Guardar contraseña
        </Button>
      </form>
      <BackToLogin />
    </SplitShell>
  );
}

function PantallaInvitacion() {
  return (
    <SplitShell
      brand={
        <BrandPanel
          kicker="Te estamos esperando"
          headline="Bienvenida al equipo que hace despegar los viajes."
          copy="Activá tu cuenta y arrancá: los viajes de julio ya están en marcha."
        />
      }
    >
      <div className="flex items-center gap-2.5">
        <Badge tone="accent" dot>
          Invitación
        </Badge>
        <Badge tone="brand">Rol: Coordinación</Badge>
      </div>
      <div className="mt-4">
        <FormTitle
          title="Activá tu cuenta"
          sub="Agustín te invitó al portal como paula@jovenesuk.com. Solo falta tu contraseña."
        />
      </div>
      <form className="mt-7 space-y-4">
        <div>
          <Label htmlFor="p-inv-nombre" required>
            Tu nombre
          </Label>
          <Input id="p-inv-nombre" defaultValue="Paula Vidal" />
        </div>
        <div>
          <Label htmlFor="p-inv-pass" required>
            Contraseña
          </Label>
          <Input id="p-inv-pass" type="password" placeholder="Mínimo 8 caracteres" />
        </div>
        <Button type="submit" variant="accent" className="w-full">
          Activar cuenta y entrar
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-[var(--c-ink-subtle)]">
          Al activar aceptás las políticas internas de datos del equipo.
        </p>
      </form>
    </SplitShell>
  );
}

function PantallaLinkVencido() {
  return (
    <CenterShell>
      <span
        className="mx-auto grid h-20 w-20 place-items-center rounded-[var(--r-xl)] bg-[var(--c-surface)] text-4xl shadow-[shadow:var(--shadow-2)]"
        aria-hidden
      >
        ⏳
      </span>
      <h3 className="mt-6 font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        Este link ya no sirve
      </h3>
      <p className="mt-2 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Los links de recuperación vencen a los 30 minutos por seguridad. Pedí uno nuevo y listo.
      </p>
      <div className="mx-auto mt-6 max-w-sm text-left">
        <Alert tone="warning" title="Nada se rompió">
          Tu cuenta sigue igual que siempre — solo venció el link.
        </Alert>
      </div>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Button variant="primary">Pedir un link nuevo</Button>
        <BackToLogin />
      </div>
    </CenterShell>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Pantallas nuevas: verificación, sesión, 404, mantenimiento
 * ════════════════════════════════════════════════════════════════ */

function PantallaVerificacion() {
  return (
    <SplitShell
      brand={
        <BrandPanel
          kicker="Un paso más"
          headline="Seis números y entrás."
          copy="Te mandamos un código a tu correo. Es válido por 10 minutos."
        />
      }
    >
      <FormTitle
        title="Verificá tu identidad"
        sub="Ingresá el código de 6 dígitos que mandamos a a•••@jovenesuk.com."
      />
      <form className="mt-8 space-y-5">
        <div className="flex justify-between gap-2" role="group" aria-label="código de verificación">
          {["4", "0", "7", "", "", ""].map((d, i) => (
            <input
              key={i}
              maxLength={1}
              defaultValue={d}
              inputMode="numeric"
              aria-label={`dígito ${i + 1}`}
              className={cn(
                "h-14 w-12 rounded-[var(--r-md)] border text-center font-[family-name:var(--font-mono)] text-xl font-bold text-[var(--c-ink)] transition-[border-color,box-shadow] focus:outline-none",
                i === 3
                  ? "border-[var(--c-brand-300)] shadow-[shadow:var(--ring-focus)]"
                  : "border-[var(--c-border-strong)] bg-[var(--c-surface)] focus:border-[var(--c-brand-300)] focus:shadow-[shadow:var(--ring-focus)]",
              )}
            />
          ))}
        </div>
        <Button type="submit" variant="primary" className="w-full">
          Verificar y entrar
        </Button>
        <p className="text-center text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
          ¿No llegó?{" "}
          <a href="#pantallas" className="font-semibold text-[var(--c-brand)] hover:underline">
            Reenviar código en 0:28
          </a>
        </p>
      </form>
    </SplitShell>
  );
}

function PantallaSesionExpirada() {
  return (
    <CenterShell>
      <span
        className="mx-auto grid h-20 w-20 place-items-center rounded-[var(--r-xl)] bg-[var(--c-surface)] text-4xl shadow-[shadow:var(--shadow-2)]"
        aria-hidden
      >
        🔑
      </span>
      <h3 className="mt-6 font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        Tu sesión expiró
      </h3>
      <p className="mt-2 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Pasó un buen rato sin actividad, así que cerramos la sesión por seguridad. Tus cambios
        guardados están a salvo.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Button variant="primary">Volver a ingresar</Button>
        <p className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
          Entrás como <span className="font-semibold text-[var(--c-ink-muted)]">agustin@jovenesuk.com</span>
        </p>
      </div>
    </CenterShell>
  );
}

function Pantalla404() {
  return (
    <CenterShell>
      <p
        className="font-[family-name:var(--font-display)] text-[80px] font-extrabold leading-none tracking-[var(--ls-tight)] text-[var(--c-brand-300)]"
        aria-hidden
      >
        404
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        Esta página se fue de excursión
      </h3>
      <p className="mt-2 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        La dirección no existe o se movió. Si llegaste por un link interno, avisanos y lo arreglamos.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary">Ir al dashboard</Button>
        <Button variant="outline">Buscar un alumno</Button>
      </div>
    </CenterShell>
  );
}

function PantallaMantenimiento() {
  return (
    <CenterShell>
      <span
        className="mx-auto grid h-20 w-20 place-items-center rounded-[var(--r-xl)] bg-[var(--c-surface)] text-4xl shadow-[shadow:var(--shadow-2)]"
        aria-hidden
      >
        🛠️
      </span>
      <h3 className="mt-6 font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
        Volvemos en un ratito
      </h3>
      <p className="mt-2 text-[length:var(--t-body)] leading-[var(--lh-body)] text-[var(--c-ink-muted)]">
        Estamos actualizando el portal. No hace falta que hagas nada: en unos minutos se recarga
        solo.
      </p>
      <div className="mx-auto mt-6 max-w-sm text-left">
        <Alert tone="info" title="Mantenimiento programado">
          Hoy de 03:00 a 03:30 (hora AR). Los datos no se tocan.
        </Alert>
      </div>
    </CenterShell>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Carousel (reutilizable — lo usa también Pantallas Admin)
 * ════════════════════════════════════════════════════════════════ */

export type CarouselSlide = { id: string; label: string; el: ReactNode };

export function Carousel({ anchor, slides }: { anchor: string; slides: CarouselSlide[] }) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const go = (next: number) => setIndex(((next % total) + total) % total);

  return (
    <div>
      {/* nav del carousel */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-[var(--r-pill)] border px-4 text-[length:var(--t-small)] font-semibold transition-all",
                i === index
                  ? "border-transparent bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)]"
                  : "border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink-muted)] hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)]",
              )}
            >
              <span
                className={cn(
                  "font-[family-name:var(--font-mono)] text-[11px] font-bold",
                  i === index ? "text-[var(--c-accent-300)]" : "text-[var(--c-ink-subtle)]",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] font-bold text-[var(--c-ink-subtle)]">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="pantalla anterior"
            className="grid h-11 w-11 place-items-center rounded-[var(--r-pill)] border border-[var(--c-border-strong)] bg-[var(--c-surface)] text-[var(--c-ink-muted)] shadow-[shadow:var(--shadow-soft)] transition-all hover:border-[var(--c-brand-300)] hover:text-[var(--c-brand)] active:scale-95"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="pantalla siguiente"
            className="grid h-11 w-11 place-items-center rounded-[var(--r-pill)] bg-[var(--c-brand)] text-[var(--c-ink-onbrand)] shadow-[shadow:var(--shadow-brand)] transition-all hover:bg-[var(--c-brand-700)] active:scale-95"
          >
            →
          </button>
        </div>
      </div>

      {/* viewport */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 [transition-timing-function:cubic-bezier(.3,.86,.36,1)]"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((s, i) => (
              <div
                key={s.id}
                className="w-full shrink-0"
                aria-hidden={i !== index}
                {...(i !== index ? { inert: true } : {})}
              >
                {s.el}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* dots */}
      <div className="mt-4 flex justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`ir a ${s.label}`}
            className={cn(
              "h-2 rounded-[var(--r-pill)] transition-all duration-300",
              i === index ? "w-8 bg-[var(--c-accent)]" : "w-2 bg-[var(--c-border-strong)] hover:bg-[var(--c-brand-300)]",
            )}
          />
        ))}
      </div>
      <span className="sr-only">{anchor}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Sección
 * ════════════════════════════════════════════════════════════════ */

const SLIDES: CarouselSlide[] = [
  { id: "login", label: "Login", el: <PantallaLogin /> },
  { id: "recupero", label: "Recuperar contraseña", el: <PantallaRecupero /> },
  { id: "email", label: "Revisá tu correo", el: <PantallaEmailEnviado /> },
  { id: "nueva", label: "Nueva contraseña", el: <PantallaNuevaContrasena /> },
  { id: "verificacion", label: "Código de verificación", el: <PantallaVerificacion /> },
  { id: "invitacion", label: "Invitación", el: <PantallaInvitacion /> },
  { id: "vencido", label: "Link vencido", el: <PantallaLinkVencido /> },
  { id: "sesion", label: "Sesión expirada", el: <PantallaSesionExpirada /> },
  { id: "404", label: "404", el: <Pantalla404 /> },
  { id: "mantenimiento", label: "Mantenimiento", el: <PantallaMantenimiento /> },
];

export function PantallasScreen({ n = "06" }: { n?: string }) {
  return (
    <Screen id="pantallas">
      <ScreenHeading
        n={n}
        title="Pantallas"
        sub="Lo que ve el usuario antes de entrar a la app: login, recupero, verificación, invitación y estados del sistema."
      />
      <Carousel anchor="pantallas" slides={SLIDES} />
    </Screen>
  );
}
