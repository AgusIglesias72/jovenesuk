# 02 · Arquitectura y convenciones

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript estricto · Drizzle ORM · PostgreSQL en Neon ·
Better-Auth · Tailwind CSS · Resend + React Email · Trigger.dev v4 · Cloudflare R2 · Sentry ·
deploy en Vercel (São Paulo). Detalle y rationale en `juk-portal/docs/architecture.md`.

## Regla de capas (ADR-005)

El código fluye de adentro hacia afuera. **Cada capa solo puede importar de la capa de adentro.**

```
domain/  ─►  db/queries/  ─►  app/ (server actions + route handlers)  ─►  app/ (UI)
(puro)       (Drizzle)        (auth + validación + revalidate)            (React)
```

- **`src/lib/domain/<feature>/`** — lógica de negocio PURA: schemas Zod, tipos, errores nombrados,
  labels. **No importa `next`, `react` ni `app/`** (lo enforza el hook `domain-purity-check`). Es lo que
  va a reusar la futura API REST y la app nativa.
- **`src/lib/db/queries/<feature>.ts`** — el ÚNICO lugar con Drizzle. Funciones tipadas que devuelven
  filas (`$inferSelect`). No validan ni manejan auth.
- **`src/app/(admin)/<feature>/actions.ts`** — Server Actions: `requireAdminJuk()` → validar con Zod →
  llamar query → `revalidatePath` → auditar. Devuelven una unión discriminada (ver abajo).
- **`src/app/(admin)/<feature>/*.tsx`** — UI. Server Components por defecto; `"use client"` solo donde
  hay interactividad (forms, filtros).

## Flujo de datos

**Lectura:** `page.tsx` (Server Component) lee `searchParams`, los valida con el schema de filtros del
dominio, llama a una query y pasa los datos a la tabla. Los filtros viven en la URL, no en estado React.

**Mutación:** el form (client) arma el payload y llama a una Server Action → la action valida con Zod,
llama a la query, `revalidatePath`, registra en `auditoria`, y devuelve `{ ok, data | error }`. El form
redirige (`router.push` + `router.refresh`) o muestra los errores por campo.

## El "molde" de un ABM

Todos los ABMs (Colegios, Viajes, Alumnos, Group Leaders) siguen la misma estructura. Para sumar uno
nuevo, replicá estos archivos (y mirá Colegios como referencia más simple):

```
src/lib/domain/<feature>/
  schema.ts     ← enums Zod, *CreateSchema, *UpdateSchema (=create+id), *FiltersSchema, tipos
  errors.ts     ← <Feature>NotFoundError
  labels.ts     ← labels rioplatenses + mapeo de tonos para badges
  index.ts      ← barrel (export * de los 3)
src/lib/db/queries/<feature>.ts
                ← list (filtros + búsqueda ilike), getById, create, update, set<Estado>
src/app/(admin)/<feature>/
  actions.ts          ← create/update/<estado>Action: auth + Zod + query + revalidate + auditoría
  page.tsx            ← listado (server): parsea searchParams, llama list, render
  <feature>-filters.tsx ← "use client": búsqueda + selects, escriben en la URL
  <feature>-table.tsx   ← tabla con empty state
  <feature>-form.tsx    ← "use client": form compartido alta/edición
  nuevo/page.tsx        ← alta
  [id]/editar/page.tsx  ← edición (getById → notFound si falta)
```

Después: activar el link en `src/components/admin/admin-shell.tsx` y, si tocaste schema, correr la
migración (`/juk-migracion`). El skill `/juk-modulo` automatiza este andamiaje.

## Convenciones que se respetan en todo el código

- **Validación con Zod** en server actions; el helper `fieldErrorsFromZod` (en `lib/utils/zod.ts`)
  arma errores por path anidado (ej. `contactoAcademico.email`) para mostrarlos por campo.
- **Unión discriminada** en server actions: `{ ok: true, data } | { ok: false, error, fieldErrors? }`.
- **Errores nombrados** en dominio (nunca `throw new Error("...")`).
- **Auditoría**: toda mutación registra en la tabla `auditoria` vía `safeAudit` (best-effort: si falla,
  va a Sentry pero no rompe la operación).
- **Soft-delete**: nunca borramos filas; usamos un campo `estado` (Colegios, Alumnos) o flags. Group
  Leaders no tiene baja todavía (el schema no la soporta).
- **Fechas de calendario**: las columnas `date` se manejan SIEMPRE con los helpers de `lib/utils/date.ts`
  (componentes UTC) para evitar el corrimiento de un día por la zona horaria argentina.
- **Copy en español rioplatense**; fechas DD/MM/YYYY; montos GBP (viaje) / ARS (local).
- **Design system**: usar SIEMPRE los componentes de `@/components/ui` (botones, campos, tabla, badges).
  Para navegar con look de botón → `LinkButton`. Para estados de carga → `GlobeLoader`.
- TypeScript estricto: nada de `any`; `type` sobre `interface`; enums Zod (`z.enum(...).options`).

## Auth (Better-Auth)

- Login/reset corren por el **cliente** (`authClient` en `lib/auth/client.ts`) contra `/api/auth`.
- En el servidor, los guards están en `lib/auth/helpers.ts`: `getSession`, `requireSession`
  (bloquea si `isActive=false`), `requireRole`, `requireAdminJuk`.
- El config (`lib/auth/index.ts`) declara `role` e `isActive` como `additionalFields` (para que estén en
  `session.user`), usa `usePlural` (las tablas son plurales) y `generateId: false` (las PK son uuid de la DB).
- Crear usuarios desde el portal usa `auth.api.signUpEmail` server-side, que **no** setea cookie (no está
  el plugin `nextCookies`), así que no secuestra la sesión del admin.

## Proxy / middleware

`src/proxy.ts` (reemplaza a `middleware.ts` en Next 16) protege rutas: sin cookie de sesión redirige a
`/login`; con sesión, en `/login` redirige al dashboard. Deja pasar assets públicos (`/_next`, favicon,
`manifest.webmanifest`, `globe-loader.html`).
