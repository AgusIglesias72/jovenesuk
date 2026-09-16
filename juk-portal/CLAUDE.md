# Convenciones de código — JUK Portal

Reglas para escribir código en este repo. Describen la práctica real: si el código y este archivo
no coinciden, uno de los dos está mal y se corrige en el mismo cambio. El porqué de las decisiones
grandes está en `docs/architecture.md`. La regla de sincronía (código + test + PRD + definiciones +
estado + mapa) está en el `CLAUDE.md` de la raíz del workspace.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**. No es el Next que conocés: ver el bloque del final.
- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`).
- **Drizzle ORM** sobre Neon Postgres con el driver `neon-http`.
- **Better-Auth**: email + contraseña, roles `super_admin`, `admin_juk`, `representante` y `familia`.
- **Tailwind CSS v3.4** con los tokens STUDIO de `src/styles/tokens.css`.
- **Resend + React Email** · **Trigger.dev v4** (`src/trigger/`) · **Cloudflare R2** · **Sentry**.
- **Vitest** (unit e integración) · **Playwright** (E2E).
- Todo el copy de la UI, en **español rioplatense**.

## Capas

1. **Dominio puro en `src/lib/domain/<modulo>/`**: reglas, schemas Zod, transiciones y derivaciones.
   Sin imports de `next`, `react`, `server-only`/`client-only`, `@/app`, `@/lib/db`, `drizzle-orm`
   ni drivers de base (`@neondatabase/*`, `pg`). Lo vigila el hook `.claude/hooks/domain-purity-check.mjs`.
2. **Acceso a datos solo por `src/lib/db/queries/`**. Ni componentes, ni actions, ni route
   handlers, ni jobs importan `db`. Excepciones: los scripts `src/lib/db/seed*.ts` y
   `src/lib/auth/index.ts` (el `drizzleAdapter` de Better-Auth necesita la instancia).
   - `neon-http` no tiene `db.transaction()`. Las escrituras que van juntas se mandan con
     `db.batch([...])` (ej. `queries/asignar-alumno.ts`).
   - Cada query es un round-trip HTTP: lo independiente va en `Promise.all` y lo que se pide varias
     veces por request se memoiza con `cache()` de React **en el consumidor**, no en la query (ej.
     `getSession` en `@/lib/auth/helpers`, `familias/[dni]/_data.ts`, `viajes/[id]/sections.tsx`).
     Detalle en `../.claude/docs/07-performance.md`.
   - El helper `` sql`…` `` de Drizzle se usa dentro de las queries. SQL a mano, solo en migraciones.
3. **Server components por defecto**; `"use client"` solo donde hay interacción.
4. **Mutaciones desde la UI = server actions**: `actions.ts` al lado de la pantalla; las que
   comparten varias pantallas, en `src/lib/actions/` (ej. `asignaciones.ts`).
5. **Route handlers en `src/app/api/`**, solo para lo que no es la UI: `auth/[...all]`
   (Better-Auth), `uploads/[...key]` (documentos con sesión y dueño verificado) y
   `webhooks/{google-form,resend}`. Única excepción fuera de `api/`: la imagen OG de las notas,
   `(public)/notas/[slug]/og/route.tsx`. `api/v1` no existe: se crea recién cuando haya un
   consumidor externo real.
6. **Jobs**: la lógica vive en `src/lib/jobs/` o en las queries (testeable con integración); el
   task de `src/trigger/` solo orquesta.
7. **Rutas**: los prefijos públicos y privados salen de `src/lib/routes.ts`, que usan el proxy,
   `robots.ts`, el saneo de `returnTo` (`lib/auth/return-to.ts`) y la home por rol (`HOME_BY_ROLE`
   en `lib/auth/helpers.ts` y en el login). Una sección nueva se registra ahí, no en `src/proxy.ts`.
8. **Una feature, una carpeta**. Ejemplo, `src/app/(admin)/colegios/`: `page.tsx`, `loading.tsx`,
   `actions.ts`, `colegios-table.tsx`, `colegios-filters.tsx`, `colegio-form.tsx`, `nuevo/`, `[id]/editar/`.

Superficies de `src/app/`: `(admin)/` back-office · `(auth)/` login y reset · `(public)/` sitio
público · `familias/` Portal de Familias (sin route group: la URL empieza en `/familias`) ·
`baja/` desuscripción · `offline/` fallback de la PWA · `api/`.

## Archivos y nombres

- **Todos los archivos en kebab-case**, también los componentes: `alumnos-table.tsx` exporta
  `AlumnosTable`. No hay archivos PascalCase en `src/`.
- Un rename que solo cambia mayúsculas se hace con `git mv` explícito: el repo tiene
  `core.ignorecase`, git no ve el cambio y el build de Linux rompe.
- Dentro de `src/app/`, un archivo o carpeta que **no es ruta** y se comparte en el segmento puede
  llevar prefijo `_` (carpeta privada de Next): `(public)/_components/`, `(public)/_sections/`,
  `familias/_shell.tsx`, `familias/_actions.ts`, `familias/[dni]/_data.ts`. Los archivos pegados a
  su página (`alumnos-table.tsx`) no lo necesitan.
- Hooks: `use-foo.ts` (`src/lib/hooks/`, o junto al componente que lo usa, como `components/ui/use-scroll-lock.ts`).
- Tests al lado del archivo: `<archivo>.test.ts`. Integración: `<archivo>.integration.test.ts`. E2E: `tests/e2e/<flujo>.spec.ts`.

## TypeScript e imports

- `type` antes que `interface` (salvo declaration merging). Hay `interface` heredadas en
  `components/ui`, los shells, `(auth)` y las plantillas de mail: no las copies; pasalas a `type`
  cuando toques el archivo.
- Sin `enum`: objetos `as const` (o `z.enum` en el dominio).
- Sin `any`: `unknown` y narrowing.
- Tipos de tabla con `$inferSelect` / `$inferInsert`.
- Siempre el alias `@/`. Orden: externos, después `@/…`, después relativos, con una línea en blanco entre grupos.

## Server actions: contrato único

```ts
import type { ActionResult } from "@/lib/actions/result";
// { ok: true, data } | { ok: false, error, fieldErrors?, requiereConfirmacion? }
```

1. **Autorización primero**: `requireSession`, `requireRole`, `requireAdminJuk` o `requireFamilia`
   de `@/lib/auth/helpers`.
2. **Validación con Zod** (los schemas del dominio). Los errores por campo van en `fieldErrors`.
3. **Ownership del lado del server**: los ids que importan (alumno, cuota, paso) se derivan de la
   entidad en la base, nunca se confían del cliente. Una familia solo toca lo de sus alumnos.
4. **Advertencias confirmables** (sobre-cupo, pasaporte, pago fuera de orden): `requiereConfirmacion: true`.
5. **Auditoría** con `safeAudit` de `@/lib/actions/safe-audit`. Es best-effort: si falla, reporta a
   Sentry y no rompe la operación.
6. **`revalidatePath` en forma literal** para rutas con slug: `revalidatePath("/viajes/[id]", "page")`.
7. **Errores inesperados**: `Sentry.captureException(err)` y un mensaje genérico en español. Los
   esperados se traducen desde errores nombrados.

## Errores

- En el dominio, nunca `throw new Error("…")`: clases nombradas en el `errors.ts` del módulo (ej.
  `src/lib/domain/viajes/errors.ts`).
- Errores de base: `src/lib/db/queries/errors.ts` (`esViolacionUnique`, `unicaFila`).
- La infraestructura también usa errores con nombre (`StorageNoConfiguradoError`, `EmailConfigError`).

## Base de datos

- Todo cambio de schema lleva su migración generada (`npm run db:generate`), commiteada junto al
  cambio: `/juk-migracion`. No se empujan cambios de schema con `db:push`.
- Los cambios de schema se prueban en una branch de Neon antes de mergear: `npm run ci:local` crea
  una branch efímera hija de `ci-base` (sin datos), migra, siembra y corre integración y E2E, y la
  borra. En GitHub el mismo job existe pero solo se dispara a mano (cuesta ~30 min de runner).
- Soft-delete por estado (ENUM), no por un `activo` booleano (TEC-03).

## UI y sistema de diseño

- **Solo tokens STUDIO** (`src/styles/tokens.css`): `text-[var(--c-ink)]`, `bg-[var(--c-surface-2)]`,
  `border-[var(--c-border)]`. La guarda de lint de `eslint.config.mjs` marca la paleta default de
  Tailwind, los hex sueltos y el puente `juk-navy/coral/gold-*`. Hoy está en *warn* con 0 avisos:
  no sumes ninguno. Paso pendiente (lo pide el comentario de `eslint.config.mjs`): subirla a
  *error* y borrar el puente de colores de `tailwind.config.ts`.
- **Tailwind v3 y las variables**: `text-[var(--x)]` se compila como **color**. Para tamaños va
  el hint: `text-[length:var(--t-body)]`.
- **El JIT de Tailwind lee el texto de los archivos, comentarios incluidos.** Nunca armes una clase
  interpolando (`` `bg-${tono}` ``), ni siquiera en el comentario que explica por qué no se hace:
  usá mapas con la clase completa como string.
- En los valores arbitrarios, `_` se compila como espacio: escapalo (`\_`) si es parte de un nombre de token.
- **Piso de 16px en los controles de formulario en el teléfono** (`src/styles/globals.css`, con
  `!important` deliberado): iOS hace zoom al enfocar un campo más chico y no lo deshace. No lo
  pises. Ningún token tipográfico baja de 12px; los objetivos táctiles miden 44px.
- **Componentes del sistema en vez de los nativos**:
  - confirmaciones → `useConfirm()` (`components/ui/confirm-dialog.tsx`);
  - fechas → `<DateInput>` (`components/ui/date-input.tsx`);
  - selects → `<Select>` de `components/ui/field.tsx` (con `searchable` si la lista es larga);
  - tablas → `TableWrap`/`Table`/`TH`/`TD` de `components/ui/data-table.tsx` (modo tarjeta en el teléfono);
  - estados vacíos → `<EmptyState>`; feedback → `useToast()`; forms con cambios sin guardar → `useUnsavedChanges`.
- **Loading states**: un `loading.tsx` por segmento con los skeletons de
  `components/ui/skeleton.tsx` (`ListPageSkeleton`, `FormPageSkeleton`, `FichaAlumnoSkeleton`,
  `ViajeDetalleSkeleton`, `ConfigSkeleton`, `PagosPageSkeleton`, los `Familia*Skeleton`…),
  respetando la silueta de la pantalla. Nada de spinners ad-hoc. `<GlobeLoader />` existe, pero no se usa.
  - ⚠️ **Nunca un `loading.tsx` directamente en `src/app/familias/`** (el segmento padre). Envuelve
    a `familias/[dni]/layout.tsx`, que valida la pertenencia: la respuesta pasa a ser streameada y el
    `notFound()` de "este DNI no es tuyo" responde **200** en vez de 404. El de `familias/[dni]/` y
    los de sus subcarpetas (`pagos/`, `viaje/`, etc.) quedan dentro de ese layout y son seguros.
- **Paginación**: toda tabla que puede pasar de 50 filas pagina en SQL (`paginarEnSql` de
  `@/lib/utils/paginate` + `<Pagination>`). El `ORDER BY` tiene que ser total, con una columna única
  de desempate: si no, LIMIT/OFFSET repite o saltea filas entre páginas.
- Estilos inline solo para valores dinámicos que Tailwind no puede expresar (el ancho de una barra
  de progreso), en las imágenes OG (`ImageResponse` solo acepta `style`) y en las plantillas de mail
  de `src/lib/email/templates/` (los clientes de correo necesitan estilos inline).
- Excepción de desarrollo: `(public)/design-tweaker.tsx` (herramienta interna, activa solo fuera de
  producción o con `NEXT_PUBLIC_ENABLE_TWEAK=1`) usa estilos inline y `<select>` nativos. No es
  modelo para la app.
- Los badges de estado usan el mapeo de colores del sistema (`components/ui/badge.tsx`, `docs/design-system.md`).

## Moneda, fechas y datos

- **Cuotas y pagos de las familias: multi-moneda.** `moneda_cuota` = `USD | GBP | ARS`, **default
  USD** (CRIT-05 ⭐, `src/lib/db/schema/cuotas.ts`). Nunca hardcodear la moneda de una cuota: se
  muestra con su `moneda` y `formatMonto` / `MONEDA_SIMBOLOS` de `src/lib/domain/cuotas/schema.ts`.
- **Costos operativos del viaje (M7: excursiones, transfers…): en GBP**, en `costoGbp` y
  `costoPorAlumnoGbp` de `src/lib/domain/pasos-viaje/metadata.ts`.
- Fechas en pantalla **DD/MM/AAAA** con `formatFecha`. Las fechas de calendario (vencimientos, mora)
  se comparan por día UTC con `diaCalendarioUTC` (`src/lib/utils/date.ts`).
- Códigos de viaje `UK-AAAA-MMM-CIUDAD` (ej. `UK-2026-JUL-LONDON`; el regex está en `domain/viajes/schema.ts`).
- DNI: se guarda en dígitos y se muestra con puntos (`formatearDni`; `soloDigitos` para limpiar,
  en `src/lib/utils/dni.ts`). ⚠️ Hoy solo lo normaliza el form del back-office: el schema de dominio
  y el webhook del Google Form aceptan puntos (TEC-12, abierta en `OPEN_DECISIONS.md`). Todo punto
  de entrada nuevo de DNI pasa por `soloDigitos`.
- Pasaporte: para UK tiene que vencer en o después del **fin del viaje** (sin 6 meses extra); para otros países, 6 meses después del fin.

## URLs con slug

- El detalle del viaje va por **código** (`/viajes/UK-2026-JUL-LONDON`) y el del alumno por **DNI**
  (`/alumnos/45102338`). La carpeta de ruta sigue siendo `[id]`, pero el param CONTIENE el slug: la
  página resuelve con `getViajeByCodigo` / `getAlumnoByDni` y de ahí saca el `id` real (uuid), que
  es lo ÚNICO que se pasa a componentes hijos, server actions y queries. Los `<Link>` emiten el
  slug; `revalidatePath` usa la forma literal (`"/viajes/[id]", "page"`).
- El Portal de Familias va por DNI: `/familias/<dni>`.
- **Excepción: Prospectos usa uuid** (`/prospectos/<uuid>`, `getProspectoById`). Pasarlo a slug se
  evaluó y se descartó; no lo tomes como modelo. Toda ruta de detalle nueva nace con slug.

## Emails y documentos

- Los mails salen por `sendEmail` de `@/lib/email` con un `tipo` (`automatico`, `comunicacion` o
  `marketing`) que elige el remitente configurado en `/configuracion`.
- `EMAIL_DRY_RUN=1` renderiza sin enviar (lo fijan el server de Playwright y el job e2e del CI). Fuera de producción, sin
  `RESEND_API_KEY`, el dry-run es implícito.
- Documentos: se guardan con `putDocumento` de `@/lib/storage` y se sirven **siempre** por
  `/api/uploads/<key>`, con sesión y dueño verificado. Nunca una URL pública de bucket. En
  producción sin R2, la subida falla a propósito. Detalle en `../.claude/docs/06-seguridad.md`.

## Tests por capa

| Capa | Test | Comando |
|---|---|---|
| `src/lib/domain`, `src/lib/utils`, `src/lib/actions` | Unit `<archivo>.test.ts` al lado. **Obligatorio**: lo exige `npm run check:tests` | `npm test` |
| Server actions de pantallas | Unit `<archivo>.test.ts` al lado, con `src/lib/actions/__tests__/mocks.ts` (esperado, no lo exige `check:tests`; siete archivos todavía no lo tienen, lista en el `CLAUDE.md` raíz) | `npm test` |
| Queries con lógica SQL y jobs | `<archivo>.integration.test.ts` | `npm run test:integration` (solo con `INTEGRATION_DATABASE_URL`) |
| Pantallas y flujos | `tests/e2e/*.spec.ts`; tag `@mobile` si afecta al teléfono | `npm run test:e2e` |

- `check:tests` solo verifica que el test compañero **exista**. Modificar lógica implica sumar o
  ajustar el caso que cubre el cambio, aunque el archivo de test ya estuviera.
- La cobertura tiene piso en `vitest.config.ts` (`npm run test:coverage`). Bajarlo necesita una razón escrita.
- Reglas de E2E que ya costaron caro (el porqué, en `../.claude/docs/05-testing.md`):
  - un contexto que tiene que arrancar **sin sesión** se crea con `storageState: { cookies: [], origins: [] }`,
    porque `browser.newContext()` hereda la sesión del proyecto;
  - antes de interactuar con un control de una página recién cargada se espera la hidratación con
    `esperarHidratacion` (`tests/e2e/helpers.ts`), no con un timeout. `toHaveValue` no alcanza;
  - selectores por rol y nombre accesible.

## Qué NO hacemos

- ❌ SQL a mano fuera de migraciones, o `db` importado fuera de `src/lib/db/queries` (salvo los seeds y el adapter de `src/lib/auth/index.ts`).
- ❌ `useState` para datos del server (server components, o `useEffect` con dependencias correctas).
- ❌ Estilos inline para lo que Tailwind puede expresar; paleta default, hex o `juk-navy/coral/gold-*` en clases.
- ❌ Clases de Tailwind interpoladas (tampoco en comentarios).
- ❌ Class components.
- ❌ Server actions sin Zod, sin autorización o que confían en ids del cliente.
- ❌ `console.log` commiteado (salvo en los scripts de seed); `console.error` solo en caminos inesperados.
- ❌ Comentarios que explican QUÉ hace el código; solo el POR QUÉ cuando no es obvio.
- ❌ `window.confirm` / `window.prompt`, `<input type="date">` nativo, `<select>` nativo suelto.
- ❌ Tablas que pueden superar 50 filas sin paginar en SQL.
- ❌ `loading.tsx` directamente en `src/app/familias/` (el de `familias/[dni]/` y los de sus subcarpetas sí están bien).
- ❌ URLs públicas de documentos.
- ❌ Flags o variables de entorno que aflojen una protección de producción (rate limit, storage) "para los tests".
- ❌ `npm update` / `npm audit fix`: crashean en este repo. Se actualiza con `npm install <paquete>@<versión>`.
- ❌ Tocar el bloque `overrides` de `package.json` (`ws`, `socket.io-parser`, `fast-uri` y
  `brace-expansion` acotado a `@sentry/bundler-plugin-core`) sin leer `../.claude/docs/06-seguridad.md`.
  Fijan transitivas parcheadas por CVEs: cada entrada se saca cuando el paquete padre publique una
  versión que ya la traiga.

## Ante la duda

- Preguntá antes de sumar una dependencia o un patrón nuevo (estructura de carpetas, manejo de estado, librerías de UI).
- Extendé lo que ya existe antes de inventar.
- Por qué → `docs/architecture.md` · qué → `docs/prd/` · decisiones → `OPEN_DECISIONS.md` ·
  diseño → `docs/design-system.md` · estado → `docs/estado-actual.md` · handoff → `../.claude/docs/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
