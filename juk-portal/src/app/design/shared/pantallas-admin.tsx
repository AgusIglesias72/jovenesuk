"use client";

/*
 * Sección "Pantallas Admin" de la dirección STUDIO: las pantallas internas
 * de administración (solo super_admin) — usuarios y roles, invitación,
 * configuración y auditoría. Mismo carousel que Pantallas.
 */
import type { ReactNode } from "react";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  FieldNote,
  Input,
  Label,
  Screen,
  ScreenHeading,
  Segmented,
  Switch,
  cn,
} from "./primitives";
import { Carousel, type CarouselSlide } from "./pantallas";
import { SelectMenu } from "./interactive";

/* ════════════════════════════════════════════════════════════════
 * Shell admin (topbar mínimo para dar contexto de app)
 * ════════════════════════════════════════════════════════════════ */

function AdminShell({
  crumb,
  title,
  sub,
  actions,
  children,
}: {
  crumb: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[540px]" style={{ backgroundImage: "var(--grad-page)" }}>
      {/* topbar */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-[var(--r-sm)] text-[var(--c-ink-onaccent)]"
            style={{ backgroundImage: "var(--grad-warm)" }}
            aria-hidden
          >
            <span className="font-[family-name:var(--font-display)] text-sm font-extrabold">J</span>
          </span>
          <span className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Administración <span aria-hidden>›</span>{" "}
            <span className="font-semibold text-[var(--c-ink)]">{crumb}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">super_admin</Badge>
          <Avatar name="María García" size="sm" hue={3} />
        </div>
      </div>

      {/* header de la pantalla */}
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-[length:var(--t-h1)] font-extrabold tracking-[var(--ls-tight)] text-[var(--c-ink)]">
              {title}
            </h4>
            {sub && <p className="mt-1 text-[length:var(--t-small)] text-[var(--c-ink-muted)]">{sub}</p>}
          </div>
          {actions}
        </div>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 1 · Usuarios & roles
 * ════════════════════════════════════════════════════════════════ */

const USUARIOS = [
  { nombre: "María García", email: "maria@jovenesuk.com", rol: "super_admin", ultimo: "Hoy 09:12", activo: true, hue: 3 },
  { nombre: "Felix Ordóñez", email: "felix@jovenesuk.com", rol: "admin_juk", ultimo: "Hoy 08:55", activo: true, hue: 0 },
  { nombre: "Delfina Paz", email: "delfina@jovenesuk.com", rol: "admin_juk", ultimo: "Ayer 18:20", activo: true, hue: 1 },
  { nombre: "Tomás Iriarte", email: "tomas@jovenesuk.com", rol: "admin_juk", ultimo: "05/06 11:43", activo: false, hue: 2 },
] as const;

function AdminUsuarios() {
  return (
    <AdminShell
      crumb="Usuarios"
      title="Usuarios del portal"
      sub="Solo super_admin ve esta sección. Los desactivados no pueden entrar aunque tengan sesión."
      actions={<Button variant="accent">+ Invitar usuario</Button>}
    >
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--c-surface-2)] text-[length:var(--t-label)] uppercase tracking-[var(--ls-label)] text-[var(--c-ink-muted)]">
              <th className="px-5 py-3 font-bold">Usuario</th>
              <th className="hidden px-5 py-3 font-bold sm:table-cell">Rol</th>
              <th className="hidden px-5 py-3 font-bold lg:table-cell">Último acceso</th>
              <th className="px-5 py-3 font-bold">Estado</th>
              <th className="px-5 py-3 text-right font-bold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {USUARIOS.map((u, i) => (
              <tr key={u.email} className={i % 2 ? "bg-[var(--c-surface-3)]" : "bg-[var(--c-surface)]"}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.nombre} hue={u.hue} />
                    <div>
                      <p className={cn("font-semibold", u.activo ? "text-[var(--c-ink)]" : "text-[var(--c-ink-subtle)] line-through")}>
                        {u.nombre}
                      </p>
                      <p className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-5 py-3 sm:table-cell">
                  {u.rol === "super_admin" ? <Badge tone="accent">super_admin</Badge> : <Badge tone="brand">admin_juk</Badge>}
                </td>
                <td className="hidden px-5 py-3 font-[family-name:var(--font-mono)] text-[length:var(--t-small)] text-[var(--c-ink-muted)] lg:table-cell">
                  {u.ultimo}
                </td>
                <td className="px-5 py-3">
                  {u.activo ? (
                    <Badge tone="success" dot>
                      Activo
                    </Badge>
                  ) : (
                    <Badge tone="neutral" dot>
                      Desactivado
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" size="sm">
                    {u.activo ? "Editar" : "Reactivar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AdminShell>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 2 · Invitar usuario
 * ════════════════════════════════════════════════════════════════ */

function AdminInvitar() {
  return (
    <AdminShell
      crumb="Usuarios › Invitar"
      title="Invitar a alguien del equipo"
      sub="Le generamos una contraseña temporal y le llega por email para activar la cuenta."
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="adm-nombre" required>
                Nombre
              </Label>
              <Input id="adm-nombre" placeholder="Nombre y apellido" />
            </div>
            <div>
              <Label htmlFor="adm-email" required>
                Email
              </Label>
              <Input id="adm-email" type="email" placeholder="nombre@jovenesuk.com" />
              <FieldNote>Tiene que ser la casilla del equipo.</FieldNote>
            </div>
          </div>

          <div>
            <Label required>Rol</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col gap-1 rounded-[var(--r-lg)] border-2 border-[var(--c-brand)] bg-[var(--c-brand-50)] p-4">
                <span className="flex items-center justify-between">
                  <span className="font-bold text-[var(--c-brand)]">admin_juk</span>
                  <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-[var(--c-brand)] text-[10px] font-bold text-[var(--c-ink-onbrand)]">
                    ✓
                  </span>
                </span>
                <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                  Todo el portal: viajes, alumnos, pagos y seguimiento.
                </span>
              </label>
              <label className="flex cursor-pointer flex-col gap-1 rounded-[var(--r-lg)] border-2 border-[var(--c-border)] bg-[var(--c-surface)] p-4 transition-colors hover:border-[var(--c-brand-300)]">
                <span className="font-bold text-[var(--c-ink)]">super_admin</span>
                <span className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
                  Todo lo anterior + gestión de usuarios. Para María y nadie más.
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--c-border)] pt-4">
            <Button variant="ghost">Cancelar</Button>
            <Button variant="primary">Mandar invitación</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Alert tone="info" title="Qué recibe la persona">
            Un email con su contraseña temporal y el link al portal. Al primer ingreso, el sistema le
            pide crear la definitiva.
          </Alert>
          <Card className="p-5">
            <p className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
              Equipo actual
            </p>
            <ul className="mt-3 space-y-2.5">
              {USUARIOS.filter((u) => u.activo).map((u) => (
                <li key={u.email} className="flex items-center gap-2.5 text-[length:var(--t-small)]">
                  <Avatar name={u.nombre} size="sm" hue={u.hue} />
                  <span className="font-semibold text-[var(--c-ink)]">{u.nombre}</span>
                  <span className="ml-auto text-[var(--c-ink-subtle)]">{u.rol}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 3 · Configuración
 * ════════════════════════════════════════════════════════════════ */

const CONFIG_MENU = [
  { icon: "👤", label: "Perfil", activo: false },
  { icon: "🔔", label: "Notificaciones", activo: true },
  { icon: "🔒", label: "Seguridad", activo: false },
  { icon: "🎨", label: "Apariencia", activo: false },
] as const;

function AdminConfig() {
  return (
    <AdminShell crumb="Configuración" title="Configuración" sub="Preferencias del portal y de tu cuenta.">
      <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
        <Card className="h-fit p-2.5">
          <ul className="space-y-0.5">
            {CONFIG_MENU.map((m) => (
              <li key={m.label}>
                <a
                  href="#pantallas-admin"
                  aria-current={m.activo ? "page" : undefined}
                  className={cn(
                    "flex min-h-[40px] items-center gap-2.5 rounded-[var(--r-md)] px-3 text-[length:var(--t-small)] transition-colors",
                    m.activo
                      ? "bg-[var(--c-brand-50)] font-bold text-[var(--c-brand)]"
                      : "font-medium text-[var(--c-ink-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-ink)]",
                  )}
                >
                  <span aria-hidden>{m.icon}</span>
                  {m.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-5 p-6">
          <div>
            <h5 className="font-[family-name:var(--font-display)] text-[length:var(--t-h3)] font-bold text-[var(--c-ink)]">
              Notificaciones
            </h5>
            <p className="text-[length:var(--t-small)] text-[var(--c-ink-muted)]">
              Qué te avisamos y por dónde.
            </p>
          </div>
          <div className="grid gap-1">
            <Switch id="cfg-1" label="Pasaportes por vencer (30 días antes)" defaultChecked />
            <Switch id="cfg-2" label="Pagos vencidos del plan de cuotas" defaultChecked />
            <Switch id="cfg-3" label="Pasos M6 bloqueados más de 7 días" defaultChecked />
            <Switch id="cfg-4" label="Resumen semanal por email (lunes 9:00)" />
          </div>
          <Divider label="frecuencia" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[length:var(--t-small)] font-semibold text-[var(--c-ink)]">
              Agrupar avisos del día
            </p>
            <Segmented name="cfg-frec" options={["Al instante", "Cada hora", "Diario"]} defaultValue="Cada hora" />
          </div>
          <div>
            <Label htmlFor="cfg-email">Email para alertas</Label>
            <SelectMenu
              id="cfg-email"
              defaultValue="agustin@jovenesuk.com"
              options={["agustin@jovenesuk.com", "equipo@jovenesuk.com"]}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--c-border)] pt-4">
            <Button variant="ghost">Descartar</Button>
            <Button variant="primary">Guardar cambios</Button>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

/* ════════════════════════════════════════════════════════════════
 * 4 · Auditoría
 * ════════════════════════════════════════════════════════════════ */

const AUDIT = [
  { icon: "🔐", que: "Cambió el rol de Tomás Iriarte a admin_juk", quien: "María García", cuando: "Hoy 09:14", tipo: "Usuarios" },
  { icon: "🗑️", que: "Desactivó la cuenta de Tomás Iriarte", quien: "María García", cuando: "05/06 11:50", tipo: "Usuarios" },
  { icon: "✈️", que: "Creó el viaje UK-2026-AGO-OXFORD", quien: "Felix Ordóñez", cuando: "04/06 16:02", tipo: "Viajes" },
  { icon: "💷", que: "Editó el plan de cuotas de la familia Benítez", quien: "Delfina Paz", cuando: "04/06 10:31", tipo: "Pagos" },
  { icon: "📄", que: "Eliminó el documento pasaporte-gomez.pdf", quien: "Felix Ordóñez", cuando: "03/06 17:45", tipo: "Documentos" },
] as const;

function AdminAuditoria() {
  return (
    <AdminShell
      crumb="Auditoría"
      title="Registro de actividad"
      sub="Todo lo que pasa en el portal queda acá: quién, qué y cuándo."
      actions={<Button variant="outline">Exportar CSV</Button>}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented name="audit-filtro" options={["Todo", "Usuarios", "Viajes", "Pagos"]} defaultValue="Todo" />
        <div className="w-full sm:w-56">
          <SelectMenu defaultValue="Últimos 7 días" options={["Hoy", "Últimos 7 días", "Últimos 30 días", "Todo"]} />
        </div>
      </div>
      <Card className="overflow-hidden">
        <ul>
          {AUDIT.map((a, i) => (
            <li
              key={a.cuando + a.que}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5",
                i > 0 && "border-t border-[var(--c-border)]",
              )}
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-md)] text-base"
                style={{ backgroundColor: "var(--c-surface-2)" }}
                aria-hidden
              >
                {a.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--t-body)] text-[var(--c-ink)]">{a.que}</p>
                <p className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
                  <span className="font-semibold text-[var(--c-ink-muted)]">{a.quien}</span> ·{" "}
                  <span className="font-[family-name:var(--font-mono)]">{a.cuando}</span>
                </p>
              </div>
              <Badge tone="neutral">{a.tipo}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </AdminShell>
  );
}

/* ════════════════════════════════════════════════════════════════
 * Sección
 * ════════════════════════════════════════════════════════════════ */

const ADMIN_SLIDES: CarouselSlide[] = [
  { id: "usuarios", label: "Usuarios & roles", el: <AdminUsuarios /> },
  { id: "invitar", label: "Invitar usuario", el: <AdminInvitar /> },
  { id: "config", label: "Configuración", el: <AdminConfig /> },
  { id: "auditoria", label: "Auditoría", el: <AdminAuditoria /> },
];

export function PantallasAdminScreen({ n = "07" }: { n?: string }) {
  return (
    <Screen id="pantallas-admin">
      <ScreenHeading
        n={n}
        title="Pantallas Admin"
        sub="Las pantallas de administración del equipo (rol super_admin): usuarios, invitaciones, configuración y auditoría."
      />
      <Carousel anchor="pantallas-admin" slides={ADMIN_SLIDES} />
    </Screen>
  );
}
