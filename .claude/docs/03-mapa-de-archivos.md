# 03 · Mapa de archivos

Qué hace cada carpeta y archivo. Los ABMs (Colegios, Viajes, Alumnos, Group Leaders) repiten el mismo
"molde" (ver doc 02), así que se documentan una vez con sus particularidades.

---

## Raíz del proyecto (`juk-portal/`)

| Archivo | Qué hace |
|---|---|
| `next.config.ts` | Config de Next: React strict, headers de seguridad (`X-Frame-Options: SAMEORIGIN` para permitir el iframe del loader), `serverExternalPackages` para Neon, dominios de imágenes (R2). |
| `proxy.ts` (en `src/`) | Middleware de Next 16: protege rutas por cookie de sesión; deja pasar assets públicos. |
| `drizzle.config.ts` | Config de Drizzle Kit: dónde están los schemas, salida de migraciones, usa `DATABASE_URL_UNPOOLED`. |
| `tailwind.config.ts` | Tokens del design system JUK (colores navy/coral/gold, fuentes Fraunces/Inter/JetBrains, sombras). |
| `postcss.config.mjs` | Habilita Tailwind + autoprefixer (sin esto, los `@tailwind` no se procesan). |
| `eslint.config.mjs` | ESLint flat config (Next 16): `eslint-config-next` (`next` ya no trae `next lint`). |
| `playwright.config.ts` | Config de los tests E2E (puerto 3001, proyecto setup + chromium, reutiliza el dev server). |
| `tsconfig.json` | TypeScript estricto + alias `@/` → `src/`. |
| `trigger.config.ts` | Config de Trigger.dev (jobs en background; aún sin uso real). |
| `vercel.json` | Región de deploy (`gru1`, São Paulo). |
| `.env.example` | Plantilla de variables de entorno (copiar a `.env.local`). |
| `seed` → `src/lib/db/seed.ts` | Crea el primer `super_admin` con password temporal por consola. |

---

## `src/app/` — routing y UI (Next App Router)

| Archivo | Qué hace |
|---|---|
| `layout.tsx` | Root layout: carga `globals.css`, metadata global, `viewport` (themeColor). |
| `not-found.tsx` | 404 con marca JUK en español ("Volver al dashboard"). |
| `manifest.ts` | Genera el `manifest.webmanifest` (PWA). |
| `(auth)/layout.tsx` | Layout de las pantallas sin sesión (panel de marca + contenido). |
| `(auth)/login/page.tsx` + `login-form.tsx` | Login (el form es client y usa `authClient`). |
| `(auth)/reset-password/page.tsx` + `reset-form.tsx` | Reset de password. |
| `(admin)/layout.tsx` | Layout del portal: `requireAdminJuk()` + envuelve en `AdminShell`. |
| `(admin)/loading.tsx` | Fallback de carga de las rutas admin → `<GlobeLoader />`. |
| `(admin)/dashboard/page.tsx` | Dashboard con datos reales (`queries/dashboard`): stat cards, viajes próximos, alertas placeholder. |
| `api/auth/[...all]/route.ts` | Handler de Better-Auth (login, signup, reset, etc.). |

### Módulos ABM (cada uno bajo `src/app/(admin)/<feature>/`)

Todos tienen: `page.tsx` (listado), `<feature>-filters.tsx`, `<feature>-table.tsx`, `<feature>-form.tsx`,
`actions.ts`, `nuevo/page.tsx`, `[id]/editar/page.tsx`. Particularidades:

- **`colegios/`** — el ABM de referencia (el más simple). Colegios destino y cliente; contactos
  embebidos (académico/administrativo requeridos, alojamientos/juniors opcionales); flag
  `requiereCertificadoPsicofisico` (gated CRIT-03, editable sin lógica). Baja/reactivación por `estado`.
- **`viajes/`** — usa `select` de colegios (destino/cliente, traídos en las páginas nuevo/editar; el de
  editar incluye el actual aunque esté inactivo). Capacidad = GL×12 (computada en la action). Fechas con
  helpers UTC. `origen` y `ultimoPagoPresencial` manuales (gated CRIT-01). Cancelar = estado `cancelado`.
- **`alumnos/`** — el form más grande (datos personales, pasaporte, 2 tutores, facturación opcional,
  preferencias). Baja con motivo / reactivar. Sin trigger de asignación a viaje (gated).
- **`group-leaders/`** — datos + police check (estado + fechas). Sin baja (el schema no la tiene).

### Módulo Usuarios (`src/app/(admin)/usuarios/`)

No es un ABM estándar (toca Better-Auth). Solo `super_admin`.

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Lista admins (`requireRole("super_admin")`). |
| `usuarios-table.tsx` | "use client": por fila, `select` de rol + botón activar/desactivar (no sobre uno mismo). |
| `usuario-form.tsx` | "use client": alta; al crear muestra la **password temporal** (no redirige). |
| `nuevo/page.tsx` | Alta (super_admin). |
| `actions.ts` | `createUsuarioAction` (vía `auth.api.signUpEmail`, sin secuestrar sesión), `cambiarRol`, `setActivo`. Guardas: no podés tocar tu propia cuenta. |

---

## `src/lib/domain/` — lógica de negocio pura

Una carpeta por feature (`colegios`, `viajes`, `alumnos`, `group-leaders`, `usuarios`), cada una con:

| Archivo | Qué hace |
|---|---|
| `schema.ts` | Enums Zod + `*CreateSchema` / `*UpdateSchema` / `*FiltersSchema` + tipos inferidos. Helpers de fecha y "vacío→null" donde aplica. Viajes además tiene `capacidadMaxima(gl)`. |
| `errors.ts` | Clases de error nombradas (`<Feature>NotFoundError`). |
| `labels.ts` | Labels en español para los enums + mapeo de tonos para los badges. |
| `index.ts` | Barrel. |

No hay imports de Next/React acá (lo verifica un hook).

---

## `src/lib/db/` — datos

| Archivo | Qué hace |
|---|---|
| `index.ts` | Cliente Drizzle sobre Neon (`casing: snake_case`). Tira si falta `DATABASE_URL`. |
| `seed.ts` | Script de seed del super_admin. |
| `schema/index.ts` | Re-exporta todos los schemas. |
| `schema/users.ts` | `users`, `sessions`, `accounts`, `verifications` (Better-Auth) + rol e `isActive`. |
| `schema/colegios.ts` | `colegios` (destino/cliente) + enums `pais`, `tipoAlojamiento` (reusados por viajes). Tipo `Contacto`. |
| `schema/viajes.ts` | `viajes` (FK a colegios, capacidad, estado, origen). Comentarios marcan lo gated por CRIT-01. |
| `schema/alumnos.ts` | `alumnos` (datos, pasaporte, tutores, facturación JSON, estado). |
| `schema/grupos-leaders.ts` | `groupLeaders` (datos + police check). |
| `schema/asignaciones.ts` | Alumno↔viaje (la unidad sobre la que cuelgan pasos y cuotas). La relación se gestiona desde el **detalle del viaje** (`/viajes/[id]`); los pasos/cuotas que cuelgan de ella siguen gated. |
| `schema/pasos-alumno.ts` | Los 10 pasos del M6 por asignación (metadata JSON). **Sin UI aún.** |
| `schema/pasos-viaje.ts` | Los 5 pasos del M7 por viaje + `groupLeadersViaje` (N:M). **Sin UI aún.** |
| `schema/cuotas.ts` | Plan de pagos por asignación. **Gated CRIT-01.** |
| `schema/documentos.ts` | Archivos en R2 (polimórfico). **Sin uso aún** (R2 no configurado). |
| `schema/alertas.ts` | Alertas operativas materializadas. **Sin generación aún** (fase 6). |
| `schema/auditoria.ts` | Log de auditoría (acción, entidad, usuario, diff). **En uso** por todas las actions. |
| `queries/<feature>.ts` | Acceso a DB tipado por feature (colegios, viajes, alumnos, group-leaders, usuarios, asignaciones, auditoria, dashboard). Único lugar con Drizzle. |

> **Asignaciones** (no es un ABM estándar): `domain/asignaciones/` (validación de pasaporte con flag
> `STRICT_UK_RULE`, errores, labels), `queries/asignaciones.ts` (roster, cupo, elegibles, alta/cancelar), y
> en `app/(admin)/viajes/[id]/`: `page.tsx` (detalle), `asignaciones-panel.tsx` (asignar/quitar, client) y
> `actions.ts` (asignar/desasignar con auth + cupo + pasaporte + auditoría).

---

## `src/lib/auth/`

| Archivo | Qué hace |
|---|---|
| `index.ts` | Config de Better-Auth (drizzle adapter `usePlural`, `generateId:false`, `additionalFields` role/isActive, sesión 8h, rate limit). |
| `helpers.ts` | `getSession`, `requireSession` (bloquea inactivos), `requireRole`, `requireAdminJuk`. |
| `client.ts` | `authClient` para el browser (login/reset). |

## `src/lib/email/`

Cliente Resend (`index.ts`), funciones `send-*` y templates React Email (`templates/`): welcome, reset,
password-changed. Funcionan; el envío real depende de tener Resend configurado.

## `src/lib/utils/`

| Archivo | Qué hace |
|---|---|
| `cn.ts` | `cn()` (clsx + tailwind-merge). |
| `date.ts` | Fechas de calendario en UTC: `toDateInput`, `formatFecha`, `formatFechaCorta`. |
| `zod.ts` | `fieldErrorsFromZod` (errores por path para la UI). |

## `src/trigger/`

`reminders.ts` — definición de un job de Trigger.dev (placeholder; los recordatorios reales son fase 7).

---

## `src/components/`

| Archivo | Qué hace |
|---|---|
| `ui/index.ts` | Barrel del design system (importá siempre desde `@/components/ui`). |
| `ui/button.tsx` | `Button` (variantes) + `buttonClasses` (compartido con LinkButton). |
| `ui/link-button.tsx` | `LinkButton` — un `<Link>` con look de botón (para navegar). |
| `ui/field.tsx` | `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `Label` + textos de ayuda/error. `Field` asocia el label al control (inyecta `id`). |
| `ui/badge.tsx` | `Badge` (tonos) + `StepBadge` / `TripBadge` / `MoraBadge` con el color-mapping global. |
| `ui/data-table.tsx` | `TableWrap/Table/THead/TBody/TR/TH/TD` + celdas compuestas (StudentCell, CodeCell, DateCell, MoneyCell). |
| `ui/stat-card.tsx` | `StatCard` (métrica del dashboard) + `Alert` (4 niveles). |
| `ui/trip-card.tsx` | `TripCard` (card de viaje del dashboard). "use client" (tiene handlers). |
| `ui/step-strip.tsx` | Tira de los pasos del M6/M7 (se usará en el detalle alumno/viaje). "use client". |
| `ui/page-header.tsx` | `PageHeader` (título Fraunces + subtítulo + acciones). |
| `ui/app-shell.tsx` | `AppShell` (sidebar navy + topbar) + partes (SidebarLogo/NavSection/NavItem/UserChip, Breadcrumb, TopbarSearch). `SidebarNavItem` soporta estado `soon` ("Pronto"). |
| `ui/globe-loader.tsx` | `GlobeLoader` — el loader oficial (iframe a `public/globe-loader.html`). |
| `admin/admin-shell.tsx` | Compone el AppShell con el árbol de navegación real del portal. "use client". |
| `auth/juk-brand-panel.tsx` | Panel de marca de las pantallas de auth. |

## `public/`

`globe-loader.html` — el loader animado (canvas), montado por `GlobeLoader`.

## `tests/e2e/`

`auth.setup.ts` (login + storageState), `auth.spec.ts` (redirect sin sesión), `smoke.spec.ts`
(dashboard, navegación, 404, validación), `viajes.spec.ts` (alta de viaje end-to-end). El `.auth/` con
la sesión guardada está gitignored.

---

## `.claude/` — harness (NO es código de la app)

| Ruta | Qué hace |
|---|---|
| `settings.json` | Hooks + permisos. |
| `hooks/domain-purity-check.mjs` | Bloquea imports de Next/React en `lib/domain/` (ADR-005). |
| `hooks/schema-change-reminder.mjs` | Recuerda generar migración al tocar un schema. |
| `hooks/gated-module-warning.mjs` | Avisa al editar módulos gated (pagos/pasaporte/psicofísico). |
| `skills/juk-modulo` | Andamia un módulo nuevo por capas. |
| `skills/juk-paso` | Implementa un paso del M6/M7. |
| `skills/juk-migracion` | Genera/revisa/commitea una migración Drizzle. |
| `skills/juk-gate` | Chequea si un módulo está bloqueado por OPEN_DECISIONS. |
| `skills/juk-setup` | Checklist guiado de Fase 0 (servicios). |
| `agents/juk-arquitecto` | Diseña el blueprint de una feature. |
| `agents/juk-prd-analyst` | Cruza PRD + modelo + OPEN_DECISIONS para detectar blockers. |
| `agents/juk-revisor` | Code review contra las convenciones. |
| `agents/juk-infra` | Infra/devops (Neon, Vercel, R2, migraciones a prod). |
| `docs/` | Esta documentación de handoff. |
