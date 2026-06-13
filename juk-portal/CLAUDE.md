# Claude Code Instructions

When working on this codebase, follow these conventions.

## Stack quick-reference

- **Next.js 16** with App Router and Turbopack
- **TypeScript strict** (no `any`, no implicit any, `noUncheckedIndexedAccess`)
- **Drizzle ORM** for all DB access — never raw SQL except in migrations
- **Better-Auth** for authentication — do not roll our own
- **Tailwind CSS** — use the JUK tokens defined in `tailwind.config.ts`
- **Resend + React Email** for transactional email
- **Trigger.dev v4** for background jobs (files in `src/trigger/`)
- **Spanish (Rioplatense)** for all UI copy

## Architecture rules

1. **Business logic lives in `src/lib/domain/`** with NO imports from `next`, `react`, or `app/`.
2. **DB access goes through `src/lib/db/queries/`**, not raw drizzle calls in components.
3. **Server components by default**; use `"use client"` only when needed.
4. **Server actions** for mutations from the UI; **route handlers** under `api/v1/` for external API consumers.
5. **One feature, one folder.** Don't fan files of the same feature across the project.

## Code conventions

### File naming
- React components: `PascalCase.tsx`
- Hooks: `use-foo.ts` (kebab-case)
- Domain modules and queries: `kebab-case.ts`
- Tests: `<file>.test.ts` next to the file under test

### Imports
- Always use the `@/` alias (e.g. `@/lib/db`, `@/components/ui/button`)
- Sort: external libs first, then `@/` imports, then relative

### TypeScript
- Prefer `type` over `interface` unless you need declaration merging
- Avoid `enum`; use `const` objects with `as const`
- Avoid `any`. Use `unknown` and narrow.
- Drizzle types: use `$inferSelect` / `$inferInsert` for table types

### Error handling
- Server actions return `{ ok: true, data } | { ok: false, error }` discriminated unions
- Never throw raw `Error("...")` in domain code — use named error classes
- Log to Sentry via `@sentry/nextjs` for unexpected errors

### Database
- Every schema change needs a Drizzle migration (`npm run db:generate`)
- Don't push schema changes directly; commit the generated migration
- Use Neon branches for testing schema changes before merging

## When in doubt

- Ask before adding a new dependency
- Ask before introducing a new pattern (folder structure, state mgmt, etc.)
- Prefer extending existing patterns over inventing new ones
- Read `docs/architecture.md` for the "why" behind decisions

## What we do NOT do

- ❌ Raw SQL queries (use Drizzle)
- ❌ `useState` for server data (use server components or `useEffect` with proper deps)
- ❌ Inline styles (use Tailwind)
- ❌ Class components (function components only)
- ❌ Untyped server actions (use Zod for validation)
- ❌ Console.log in committed code (use `console.error` only for unexpected paths)
- ❌ Comments explaining WHAT the code does (the code is the doc); comments only for WHY when it's non-obvious
- ❌ `window.confirm` / `window.prompt` (usar `useConfirm()` de `components/ui/confirm-dialog.tsx`)
- ❌ `<input type="date">` nativo en la UI (usar `<DateInput>` de `components/ui/date-input.tsx`)
- ❌ `<select>` nativo suelto (usar `<Select>` de `components/ui/field.tsx`; con `searchable` si la lista es larga)
- ❌ Tablas sin paginar cuando pueden superar 50 filas (usar `paginar()` + `<Pagination>`)

## Project-specific quirks

- Trip codes follow pattern `UK-YYYY-MMM-CITY` (e.g. `UK-2026-JUL-LONDON`)
- Dates display as DD/MM/YYYY (Argentine convention)
- Money: GBP for trip-related amounts, ARS for local concepts
- All step state badges follow the color mapping from the design system
- Pasaporte expiration: UK requires valid through trip end (not 6 months extra)
- **Loading states:** SIEMPRE skeletons del design system (`components/ui/skeleton.tsx` —
  `ListPageSkeleton`, `FormPageSkeleton`, `FichaAlumnoSkeleton`, `ViajeDetalleSkeleton`,
  `DashboardSkeleton`) en el `loading.tsx` del segmento, respetando la silueta de la pantalla.
  `<GlobeLoader />` existe pero NO se usa en la app por ahora (decisión 12/06/2026 — se le
  buscará un lugar después). No crear spinners ad-hoc.
- **URLs con slug (no uuid):** el detalle del viaje va por **código** (`/viajes/UK-2026-JUL-LONDON`)
  y el del alumno por **DNI** (`/alumnos/45102338`). El folder de ruta sigue siendo `[id]` pero el
  param CONTIENE el slug: la página resuelve con `getViajeByCodigo`/`getAlumnoByDni` y de ahí saca
  el `id` real (uuid), que es lo ÚNICO que se pasa a componentes hijos, server actions y queries.
  Los `<Link>` emiten el slug; `revalidatePath` usa la forma literal `("/viajes/[id]", "page")`
  (agnóstica al valor). Toda ruta de detalle nueva debe nacer con slug.

See `docs/architecture.md` and `docs/phases.md` for more context.
